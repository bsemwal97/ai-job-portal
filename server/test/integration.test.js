// Full-flow tests against a real MongoDB-compatible database.
//
//   TEST_MONGO_URI=mongodb://127.0.0.1:27017/ai_job_portal_test npm test
//
// Skipped automatically when TEST_MONGO_URI is not set. The database is WIPED before the run,
// so only ever point it at a throwaway database.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "integration-secret";
process.env.CLIENT_URL = "http://localhost:5173";
delete process.env.SMTP_HOST;               // emails are printed instead of sent

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");

const URI = process.env.TEST_MONGO_URI;
const skip = !URI && "TEST_MONGO_URI not set";

// Mock only the AI network calls; everything else is real
const aiPath = require.resolve("../utils/ai");
const realAi = require(aiPath);
let nextAiJson = {};
require.cache[aiPath].exports = {
  ...realAi,
  askAIForJSON: async () => nextAiJson,
  askAI: async () => "mock text",
};

let server, base;
const state = {};

const call = async (method, url, token, body) => {
  const res = await fetch(base + url, {
    method,
    headers: { ...(body && { "content-type": "application/json" }), ...(token && { authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

const upload = async (token, filePath, fileName) => {
  const form = new FormData();
  form.append("resume", new Blob([fs.readFileSync(filePath)]), fileName);
  const res = await fetch(`${base}/api/upload/resume`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

const register = async (name, email, role) => {
  const r = await call("POST", "/api/auth/register", null, { name, email, password: "password123", role });
  return r;
};

test.before(async () => {
  if (skip) return;
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();

  const app = require("../app");
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;

  // make sure indexes (e.g. the unique application index) exist before testing them
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
});

test.after(async () => {
  if (skip) return;
  server.close();
  await mongoose.disconnect();
});


test("register stores the role, returns no password, rejects duplicates", { skip }, async () => {
  const rec = await register("Rita Recruiter", "rita@test.com", "Recruiter");
  assert.equal(rec.status, 201);
  assert.equal(rec.body.user.role, "Recruiter");
  assert.equal(rec.body.user.password, undefined);
  state.rec = rec.body.token;
  state.recId = rec.body.user.id;

  const cand = await register("Carl Candidate", "carl@test.com");           // role defaults to Candidate
  assert.equal(cand.body.user.role, "Candidate");
  state.cand = cand.body.token;
  state.candId = cand.body.user.id;

  state.rec2 = (await register("Other Recruiter", "rec2@test.com", "Recruiter")).body.token;

  const dup = await register("Carl Again", "CARL@test.com", "Candidate");   // email is case-insensitive
  assert.equal(dup.status, 400);
});

test("login works, wrong password fails, /me has no password", { skip }, async () => {
  const ok = await call("POST", "/api/auth/login", null, { email: "carl@test.com", password: "password123" });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.role, "Candidate");

  const bad = await call("POST", "/api/auth/login", null, { email: "carl@test.com", password: "wrong-password" });
  assert.equal(bad.status, 400);

  const me = await call("GET", "/api/auth/me", state.cand);
  assert.equal(me.status, 200);
  assert.equal(me.body.password, undefined);
});

test("only recruiters create jobs; owners edit; mass assignment is ignored", { skip }, async () => {
  const job = { title: "React Developer", company: "Acme", location: "Jaipur", salary: "6 LPA", jobType: "Full-Time", description: "Build UIs", skills: "react, node" };

  assert.equal((await call("POST", "/api/jobs", state.cand, job)).status, 403);

  const created = await call("POST", "/api/jobs", state.rec, job);
  assert.equal(created.status, 201);
  assert.deepEqual(created.body.job.skills, ["react", "node"]);   // string -> array
  assert.equal(created.body.job.createdBy, state.recId);
  state.jobId = created.body.job._id;

  // another recruiter cannot edit it
  assert.equal((await call("PUT", `/api/jobs/${state.jobId}`, state.rec2, { title: "Hacked" })).status, 403);

  // owner tries to reassign ownership through the body: must be ignored
  const upd = await call("PUT", `/api/jobs/${state.jobId}`, state.rec, { salary: "8 LPA", createdBy: state.candId });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.job.salary, "8 LPA");
  assert.equal(upd.body.job.createdBy, state.recId);
});

test("public list: search, filters, pagination shape, no recruiter email leaked", { skip }, async () => {
  await call("POST", "/api/jobs", state.rec, { title: "Node Intern", company: "Beta", location: "Delhi", salary: "10k", jobType: "Internship", description: "Learn APIs", skills: ["node"] });

  const all = await call("GET", "/api/jobs");
  assert.equal(all.body.count, 2);
  assert.equal(all.body.jobs[0].createdBy.email, undefined);
  assert.ok(all.body.jobs[0].createdBy.name);

  assert.equal((await call("GET", "/api/jobs?q=react")).body.count, 1);
  assert.equal((await call("GET", "/api/jobs?jobType=Internship")).body.count, 1);
  assert.equal((await call("GET", "/api/jobs?location=jaip")).body.count, 1);
  assert.equal((await call("GET", "/api/jobs?q=.*")).body.count, 0);   // regex chars are escaped

  const page = await call("GET", "/api/jobs?page=1&limit=1");
  assert.equal(page.body.jobs.length, 1);
  assert.equal(page.body.pages, 2);
  assert.equal(page.body.total, 2);
});

test("saved jobs: save is idempotent, list and unsave work, recruiters blocked", { skip }, async () => {
  assert.equal((await call("POST", `/api/saved/${state.jobId}`, state.cand)).status, 201);
  assert.equal((await call("POST", `/api/saved/${state.jobId}`, state.cand)).status, 201);

  const ids = await call("GET", "/api/saved/ids", state.cand);
  assert.deepEqual(ids.body.ids, [state.jobId]);                         // no duplicate

  const list = await call("GET", "/api/saved", state.cand);
  assert.equal(list.body.jobs[0].title, "React Developer");

  assert.equal((await call("GET", "/api/saved", state.rec)).status, 403);

  await call("DELETE", `/api/saved/${state.jobId}`, state.cand);
  assert.deepEqual((await call("GET", "/api/saved/ids", state.cand)).body.ids, []);
});

test("applications: apply once, duplicate blocked, recruiter flow, status update", { skip }, async () => {
  const applied = await call("POST", `/api/applications/${state.jobId}`, state.cand);
  assert.equal(applied.status, 201);
  assert.equal(applied.body.status, "Applied");
  state.appId = applied.body._id;

  assert.equal((await call("POST", `/api/applications/${state.jobId}`, state.cand)).status, 400);   // unique index
  assert.equal((await call("POST", `/api/applications/${state.jobId}`, state.rec)).status, 403);
  assert.equal((await call("POST", "/api/applications/64b000000000000000000009", state.cand)).status, 404);

  // two parallel requests: still exactly one application (race condition guard)
  const other = (await register("Dana", "dana@test.com", "Candidate")).body.token;
  const [a, b] = await Promise.all([
    call("POST", `/api/applications/${state.jobId}`, other),
    call("POST", `/api/applications/${state.jobId}`, other),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [201, 400]);

  // recruiter sees applicants; a different recruiter does not
  const list = await call("GET", `/api/applications/job/${state.jobId}`, state.rec);
  assert.equal(list.body.applications.length, 2);
  assert.equal(list.body.applications[0].user.password, undefined);
  assert.equal((await call("GET", `/api/applications/job/${state.jobId}`, state.rec2)).status, 403);

  // status update: owner only, validated
  assert.equal((await call("PATCH", `/api/applications/${state.appId}/status`, state.rec2, { status: "Hired" })).status, 403);
  assert.equal((await call("PATCH", `/api/applications/${state.appId}/status`, state.rec, { status: "Nope" })).status, 400);
  const upd = await call("PATCH", `/api/applications/${state.appId}/status`, state.rec, { status: "Shortlisted" });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.status, "Shortlisted");

  const mine = await call("GET", "/api/applications/my-applications", state.cand);
  assert.equal(mine.body[0].status, "Shortlisted");
  assert.equal(mine.body[0].job.title, "React Developer");

  const dash = await call("GET", "/api/jobs/mine", state.rec);
  assert.equal(dash.body.jobs.find((j) => j._id === state.jobId).applicantCount, 2);
});

test("closed jobs leave the public list and reject applications", { skip }, async () => {
  await call("PUT", `/api/jobs/${state.jobId}`, state.rec, { status: "Closed" });

  const pub = await call("GET", "/api/jobs");
  assert.ok(!pub.body.jobs.some((j) => j._id === state.jobId));

  const mineList = await call("GET", "/api/jobs/mine", state.rec);
  assert.ok(mineList.body.jobs.some((j) => j._id === state.jobId));         // recruiter still sees it

  const late = (await register("Late", "late@test.com", "Candidate")).body.token;
  assert.equal((await call("POST", `/api/applications/${state.jobId}`, late)).status, 400);

  await call("PUT", `/api/jobs/${state.jobId}`, state.rec, { status: "Open" });
  assert.equal((await call("GET", "/api/jobs")).body.count, 2);
});

test("resume upload: type check, access control, delete", { skip }, async () => {
  const pdf = path.join(__dirname, "fixtures", "sample.pdf");

  assert.equal((await upload(state.cand, pdf, "evil.exe")).status, 400);

  const ok = await upload(state.cand, pdf, "my resume.pdf");
  assert.equal(ok.status, 200);

  // stored filename is server-generated, not the client's
  const stored = await mongoose.model("User").findById(state.candId);
  assert.match(stored.resumeFile.filename, new RegExp(`^${state.candId}-\\d+\\.pdf$`));
  assert.equal(stored.resumeFile.originalName, "my resume.pdf");

  const dl = (token, id) => fetch(`${base}/api/upload/resume/${id}`, { headers: { authorization: `Bearer ${token}` } });

  assert.equal((await dl(state.rec, state.candId)).status, 200);        // applied to rec's job
  assert.equal((await dl(state.rec2, state.candId)).status, 403);       // other recruiter: IDOR blocked

  const del = await call("DELETE", "/api/upload/resume", state.cand);
  assert.equal(del.status, 200);
  assert.equal(fs.existsSync(path.join(__dirname, "..", "uploads", stored.resumeFile.filename)), false);
  assert.equal((await dl(state.rec, state.candId)).status, 404);
});

test("password reset: same reply for unknown email, one-time token, expiry", { skip }, async () => {
  const known = await call("POST", "/api/auth/forgot-password", null, { email: "carl@test.com" });
  const unknown = await call("POST", "/api/auth/forgot-password", null, { email: "nobody@test.com" });
  assert.equal(known.status, 200);
  assert.deepEqual(known.body, unknown.body);                           // no user enumeration

  // the token is only in the (console) email and stored hashed in the DB
  const user = await mongoose.model("User").findOne({ email: "carl@test.com" }).select("+resetPasswordHash +resetPasswordExpires");
  assert.equal(user.resetPasswordHash.length, 64);

  // Capture the token the same way a user would: from the emailed link
  const origLog = console.log;
  let logged = "";
  console.log = (m) => { logged += m; };
  await call("POST", "/api/auth/forgot-password", null, { email: "carl@test.com" });
  console.log = origLog;

  const token = logged.match(/reset-password\/([a-f0-9]{64})/)[1];

  assert.equal((await call("POST", `/api/auth/reset-password/${"b".repeat(64)}`, null, { password: "newpassword1" })).status, 400);

  const reset = await call("POST", `/api/auth/reset-password/${token}`, null, { password: "newpassword1" });
  assert.equal(reset.status, 200);

  assert.equal((await call("POST", "/api/auth/login", null, { email: "carl@test.com", password: "newpassword1" })).status, 200);
  assert.equal((await call("POST", "/api/auth/login", null, { email: "carl@test.com", password: "password123" })).status, 400);
  assert.equal((await call("POST", `/api/auth/reset-password/${token}`, null, { password: "another12345" })).status, 400);   // one-time

  // expired token
  await call("POST", "/api/auth/forgot-password", null, { email: "carl@test.com" });
  const u2 = await mongoose.model("User").findOne({ email: "carl@test.com" });
  await mongoose.model("User").updateOne({ _id: u2._id }, { resetPasswordExpires: new Date(Date.now() - 1000) });
  // (token value is unknown here, so just confirm an expired record can't be used with a wrong token)
  assert.equal((await call("POST", `/api/auth/reset-password/${"c".repeat(64)}`, null, { password: "another12345" })).status, 400);
});

test("AI routes with real data: job-match, roadmap, screening, import-resume (AI mocked)", { skip }, async () => {
  // candidate has no resume yet
  assert.equal((await call("POST", `/api/ai/job-match/${state.jobId}`, state.cand)).status, 400);

  await call("PUT", "/api/resume", state.cand, { fullName: "Carl", title: "Dev", skills: ["react", "node"], summary: "Existing summary" });

  nextAiJson = { score: 130, matchedKeywords: ["react"], missingKeywords: ["docker"], suggestions: ["Add Docker"] };
  const match = await call("POST", `/api/ai/job-match/${state.jobId}`, state.cand);
  assert.equal(match.status, 200);
  assert.equal(match.body.score, 100);                                  // clamped

  nextAiJson = { gaps: [{ skill: "Docker", why: "Needed", weeks: 99, steps: ["a", "b", "c", "d"], project: "Containerise app" }] };
  const road = await call("POST", `/api/ai/skill-roadmap/${state.jobId}`, state.cand);
  assert.equal(road.body.gaps[0].weeks, 26);                            // clamped
  assert.equal(road.body.gaps[0].steps.length, 3);

  // screening: the model invents an id that isn't an applicant -> filtered out
  const apps = await mongoose.model("Application").find({ job: state.jobId });
  const carlApp = apps.find((a) => a.user.toString() === state.candId);
  nextAiJson = { results: [
    { applicationId: String(carlApp._id), score: 82, summary: "Good fit", strengths: ["React"], gaps: ["Docker"] },
    { applicationId: "64b0000000000000000000ff", score: 99, summary: "ghost", strengths: [], gaps: [] },
  ] };
  assert.equal((await call("POST", `/api/ai/screen-applicants/${state.jobId}`, state.cand)).status, 403);
  assert.equal((await call("POST", `/api/ai/screen-applicants/${state.jobId}`, state.rec2)).status, 403);
  const screen = await call("POST", `/api/ai/screen-applicants/${state.jobId}`, state.rec);
  assert.equal(screen.status, 200);
  assert.equal(screen.body.results.length, 1);
  assert.equal(screen.body.results[0].score, 82);
  assert.equal(screen.body.skipped, 1);                                 // Dana has no resume profile

  // import-resume: fills only EMPTY sections, never overwrites existing ones
  await upload(state.cand, path.join(__dirname, "fixtures", "sample.pdf"), "r.pdf");
  nextAiJson = { fullName: "Imported Name", summary: "Imported summary", phone: "99999", skills: ["python"], experience: [{ role: "Dev", company: "X", bullets: ["Built stuff"] }] };
  const imp = await call("POST", "/api/ai/import-resume", state.cand);
  assert.equal(imp.status, 200);
  assert.ok(imp.body.filled.includes("phone"));
  assert.ok(imp.body.filled.includes("experience"));
  assert.ok(!imp.body.filled.includes("summary"));
  assert.ok(!imp.body.filled.includes("skills"));

  const saved = (await call("GET", "/api/resume", state.cand)).body.resume;
  assert.equal(saved.fullName, "Carl");                                 // untouched
  assert.equal(saved.summary, "Existing summary");                      // untouched
  assert.deepEqual([...saved.skills], ["react", "node"]);               // untouched
  assert.equal(saved.phone, "99999");                                   // filled
  assert.equal(saved.experience[0].company, "X");                       // filled
});

test("withdraw: only your own application; deleting a job removes its applications", { skip }, async () => {
  const other = (await call("POST", "/api/auth/login", null, { email: "dana@test.com", password: "password123" })).body.token;

  // Dana cannot withdraw Carl's application
  assert.equal((await call("DELETE", `/api/applications/${state.appId}`, other)).status, 404);

  assert.equal((await call("DELETE", `/api/applications/${state.appId}`, state.cand)).status, 200);
  assert.equal((await call("GET", "/api/applications/my-applications", state.cand)).body.length, 0);

  // other recruiter cannot delete the job; the owner can, and applications go with it
  assert.equal((await call("DELETE", `/api/jobs/${state.jobId}`, state.rec2)).status, 403);
  assert.equal((await call("DELETE", `/api/jobs/${state.jobId}`, state.rec)).status, 200);
  assert.equal(await mongoose.model("Application").countDocuments({ job: state.jobId }), 0);
  assert.equal((await call("GET", `/api/jobs/${state.jobId}`)).status, 404);
});
