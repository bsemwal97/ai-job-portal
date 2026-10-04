// Run with: npm test
// These tests need no database or OpenAI key: they cover validation, auth, role checks,
// AI response sanitising (with the AI layer mocked) and resume file parsing.
process.env.JWT_SECRET = "test-secret";
delete process.env.OPENAI_API_KEY;

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const express = require("express");
const jwt = require("jsonwebtoken");

// Mock the AI layer BEFORE the routes load it
const aiPath = require.resolve("../utils/ai");
const realAi = require(aiPath);
let nextAiJson = {};
require.cache[aiPath].exports = {
  ...realAi,
  askAIForJSON: async () => nextAiJson,
  askAI: async () => "mock text",
};

const app = express();
app.use(express.json());
app.use("/api/auth", require("../routes/authRoutes"));
app.use("/api/jobs", require("../routes/jobRoutes"));
app.use("/api/applications", require("../routes/applicationRoutes"));
app.use("/api/saved", require("../routes/savedRoutes"));
app.use("/api/ai", require("../routes/aiRoutes"));
app.use((err, req, res, next) => res.status(err.status || 500).json({ message: err.message }));

let base;
let server;

const candidate = jwt.sign({ id: "64b000000000000000000001", role: "Candidate" }, "test-secret");
const recruiter = jwt.sign({ id: "64b000000000000000000002", role: "Recruiter" }, "test-secret");
const OID = "64b000000000000000000009";

const call = async (method, url, token, body) => {
  const res = await fetch(base + url, {
    method,
    headers: { "content-type": "application/json", ...(token && { authorization: token }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

test.before(() => new Promise((resolve) => {
  server = app.listen(0, () => {
    base = `http://127.0.0.1:${server.address().port}`;
    resolve();
  });
}));

test.after(() => server.close());


test("register validation", async () => {
  assert.equal((await call("POST", "/api/auth/register", null, {})).status, 400);
  assert.equal((await call("POST", "/api/auth/register", null, { name: "a", email: "bad", password: "12345678" })).status, 400);
  assert.equal((await call("POST", "/api/auth/register", null, { name: "a", email: "a@b.co", password: "123" })).status, 400);
  assert.equal((await call("POST", "/api/auth/register", null, { name: "a", email: "a@b.co", password: "12345678", role: "Admin" })).status, 400);
});

test("auth: missing / invalid token is 401, Bearer and raw tokens both accepted", async () => {
  assert.equal((await call("POST", "/api/jobs", null, {})).status, 401);
  assert.equal((await call("POST", "/api/jobs", "garbage", {})).status, 401);
  // Valid token, wrong role -> 403 (proves the token was accepted in both formats)
  assert.equal((await call("POST", "/api/jobs", candidate, {})).status, 403);
  assert.equal((await call("POST", "/api/jobs", `Bearer ${candidate}`, {})).status, 403);
});

test("role checks: candidates and recruiters are kept in their lanes", async () => {
  assert.equal((await call("POST", `/api/applications/${OID}`, recruiter)).status, 403);
  assert.equal((await call("GET", `/api/applications/job/${OID}`, candidate)).status, 403);
  assert.equal((await call("PATCH", `/api/applications/${OID}/status`, candidate, { status: "Hired" })).status, 403);
  assert.equal((await call("GET", "/api/saved", recruiter)).status, 403);
  assert.equal((await call("POST", `/api/ai/screen-applicants/${OID}`, candidate)).status, 403);
  assert.equal((await call("POST", `/api/ai/job-match/${OID}`, recruiter)).status, 403);
});

test("malformed ids return 400, not 500", async () => {
  assert.equal((await call("GET", "/api/jobs/not-an-id")).status, 400);
  assert.equal((await call("POST", "/api/applications/xyz", candidate)).status, 400);
  assert.equal((await call("DELETE", "/api/saved/xyz", candidate)).status, 400);
});

test("application status must be one of the allowed values", async () => {
  const r = await call("PATCH", `/api/applications/${OID}/status`, recruiter, { status: "Nope" });
  assert.equal(r.status, 400);
});

test("AI routes require login and validate input", async () => {
  assert.equal((await call("POST", "/api/ai/improve-text", null, { text: "x" })).status, 401);
  assert.equal((await call("POST", "/api/ai/improve-text", candidate, {})).status, 400);
});

test("evaluate-answer: rejects empty answers and clamps / cleans the AI output", async () => {
  const short = await call("POST", "/api/ai/evaluate-answer", candidate, { question: "Q?", answer: "hi" });
  assert.equal(short.status, 400);

  // Model misbehaves: score out of range, wrong types
  nextAiJson = { score: 42, feedback: 123, strengths: "not-a-list", improvements: ["a", 5], betterAnswer: null };

  const r = await call("POST", "/api/ai/evaluate-answer", candidate, {
    question: "What is JWT?",
    answer: "A signed token that carries claims between client and server.",
  });

  assert.equal(r.status, 200);
  assert.equal(r.body.score, 10);                       // clamped to 0-10
  assert.equal(r.body.feedback, "123");                 // coerced to string
  assert.deepEqual(r.body.strengths, []);               // non-array -> []
  assert.deepEqual(r.body.improvements, ["a", "5"]);
  assert.equal(r.body.betterAnswer, "");
});

test("resume text extraction works for PDF and DOCX, rejects .doc", async () => {
  const { extractResumeText } = require("../utils/resumeFile");

  const pdf = await extractResumeText(path.join(__dirname, "fixtures", "sample.pdf"));
  assert.match(pdf, /Full Stack Developer/);

  const docx = await extractResumeText(path.join(__dirname, "fixtures", "sample.docx"));
  assert.match(docx, /MERN job portal/);

  // Legacy .doc exists on disk but must be rejected by extension, not by a read error
  const fs = require("node:fs");
  const os = require("node:os");
  const legacy = path.join(os.tmpdir(), "legacy-resume.doc");
  fs.writeFileSync(legacy, "fake");

  await assert.rejects(() => extractResumeText(legacy), /PDF and DOCX/);
});


test("forgot / reset password validation", async () => {
  assert.equal((await call("POST", "/api/auth/forgot-password", null, {})).status, 400);
  assert.equal((await call("POST", "/api/auth/forgot-password", null, { email: "nope" })).status, 400);

  // token must be 64 hex chars — rejected before touching the database
  assert.equal((await call("POST", "/api/auth/reset-password/abc", null, { password: "12345678" })).status, 400);

  const goodToken = "a".repeat(64);
  assert.equal((await call("POST", `/api/auth/reset-password/${goodToken}`, null, { password: "123" })).status, 400);
});

test("check-job-post: recruiter only, validates input, cleans AI output", async () => {
  assert.equal((await call("POST", "/api/ai/check-job-post", candidate, { title: "t", description: "d" })).status, 403);
  assert.equal((await call("POST", "/api/ai/check-job-post", recruiter, { title: "t" })).status, 400);

  nextAiJson = { score: -5, issues: ["No salary", 7], biasedPhrases: "rockstar", suggestions: ["Add salary range"] };

  const r = await call("POST", "/api/ai/check-job-post", recruiter, { title: "Dev", description: "We need a rockstar ninja." });

  assert.equal(r.status, 200);
  assert.equal(r.body.score, 0);                       // clamped
  assert.deepEqual(r.body.issues, ["No salary", "7"]);
  assert.deepEqual(r.body.biasedPhrases, []);          // wrong type -> []
});

test("resume file delete is candidate-only", async () => {
  const uploadRoutes = require("../routes/uploadRoutes");
  const mini = express();
  mini.use("/api/upload", uploadRoutes);
  const srv = mini.listen(0);
  const url = `http://127.0.0.1:${srv.address().port}/api/upload/resume`;

  const r = await fetch(url, { method: "DELETE", headers: { authorization: recruiter } });
  srv.close();

  assert.equal(r.status, 403);
});

test("emails: dev fallback logs instead of sending, and HTML is escaped", async () => {
  const { sendMail, statusChangeEmail } = require("../utils/mailer");

  delete process.env.SMTP_HOST;

  const originalLog = console.log;
  let logged = "";
  console.log = (msg) => { logged += msg; };

  const result = await sendMail({ to: "a@b.co", subject: "Hi", text: "body" });

  console.log = originalLog;

  assert.equal(result.logged, true);
  assert.match(logged, /DEV EMAIL/);

  const mail = statusChangeEmail("Ravi", "<script>alert(1)</script>", "Acme", "Hired");
  assert.ok(!mail.html.includes("<script>"));
  assert.match(mail.html, /&lt;script&gt;/);
});


test("parseJSONLoose handles plain JSON and ```json fenced answers", () => {
  const { parseJSONLoose } = realAi;

  assert.deepEqual(parseJSONLoose('{"a":1}'), { a: 1 });
  assert.deepEqual(parseJSONLoose('```json\n{"a":1}\n```'), { a: 1 });
  assert.throws(() => parseJSONLoose("not json"));
});
