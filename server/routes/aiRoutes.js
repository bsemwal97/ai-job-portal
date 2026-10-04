const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authMiddleware");
const validateObjectId = require("../middleware/validateObjectId");
const Resume = require("../models/Resume");
const Job = require("../models/Job");
const Application = require("../models/Application");
const {
  askAI,
  askAIForJSON,
  aiErrorResponse,
  resumeToText,
  clip,
  wrap,
} = require("../utils/ai");

const path = require("path");
const User = require("../models/User");
const { extractResumeText } = require("../utils/resumeFile");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

// Reads the text of the resume file the logged-in candidate uploaded
async function getUploadedResumeText(userId) {
  const user = await User.findById(userId);

  if (!user?.resumeFile?.filename) {
    const err = new Error("Upload your resume first (Upload Resume page)");
    err.status = 400;
    throw err;
  }

  return extractResumeText(path.join(UPLOAD_DIR, path.basename(user.resumeFile.filename)));
}


// Every AI route needs a logged-in user
router.use(authMiddleware);

// Small wrapper: catches errors from handlers and maps them with aiErrorResponse
const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    aiErrorResponse(res, error);
  }
};

const asList = (value) => (Array.isArray(value) ? value.map(String) : []);


// ANALYZE RESUME (free text)
router.post("/analyze-resume", handle(async (req, res) => {
  const { resumeText } = req.body;

  if (!resumeText) {
    return res.status(400).json({ message: "resumeText is required" });
  }

  const feedback = await askAI(
    "You are an expert resume reviewer and career coach. Give specific, prioritised, actionable feedback.",
    wrap("Resume", resumeText),
    { maxTokens: 1500 }
  );

  res.json({ feedback });
}));


// GENERATE PROFESSIONAL SUMMARY
router.post("/generate-summary", handle(async (req, res) => {
  const { targetRole, yearsOfExperience, skills, highlights } = req.body;

  if (!targetRole) {
    return res.status(400).json({ message: "targetRole is required" });
  }

  const summary = await askAI(
    "You are an expert resume writer. Write concise, ATS-friendly resume summaries. " +
      "Return 2-3 sentences only, no bullet points, no headings, no quotes. Do not invent facts.",
    `Target role: ${clip(targetRole, 100)}\n` +
      `Years of experience: ${clip(yearsOfExperience, 20) || "not specified"}\n` +
      `Key skills: ${asList(skills).join(", ").slice(0, 500) || "not specified"}\n` +
      wrap("Notable highlights", highlights || "none provided", 1000),
    { maxTokens: 250 }
  );

  res.json({ summary: summary.trim() });
}));


// IMPROVE / REWRITE TEXT
router.post("/improve-text", handle(async (req, res) => {
  const { text, context } = req.body;

  if (!text) {
    return res.status(400).json({ message: "text is required" });
  }

  const improved = await askAI(
    "You are an expert resume editor. Rewrite the given text to be more impactful, concise, " +
      "and ATS-friendly with strong action verbs. Only quantify impact if numbers are given in the " +
      "original — never invent metrics. Return only the rewritten text.",
    `Context: ${clip(context, 200) || "resume content"}\n\n${wrap("Original text", text, 3000)}`,
    { maxTokens: 500 }
  );

  res.json({ improved: improved.trim() });
}));


// GENERATE ACHIEVEMENT BULLETS
router.post("/generate-bullets", handle(async (req, res) => {
  const { role, company, responsibilities } = req.body;

  if (!role) {
    return res.status(400).json({ message: "role is required" });
  }

  const n = Math.min(Math.max(parseInt(req.body.count, 10) || 4, 1), 8);

  const result = await askAIForJSON(
    "You are an expert resume writer. Generate resume achievement bullet points. Each bullet starts " +
      "with a strong action verb. Use only facts the candidate gave; do not invent numbers. " +
      `Return {"bullets": [...]} with exactly ${n} strings.`,
    `Role: ${clip(role, 100)}\nCompany: ${clip(company, 100) || "not specified"}\n` +
      wrap("Responsibilities / notes from the candidate", responsibilities || "not provided", 2000)
  );

  res.json({ bullets: asList(result.bullets) });
}));


// MATCH RESUME TEXT AGAINST A JOB DESCRIPTION (ATS style)
const MATCH_SYSTEM =
  "You are an ATS (Applicant Tracking System) resume matching engine. Compare the resume against " +
  "the job description. Return a JSON object with exactly these keys: " +
  '"score" (integer 0-100), "matchedKeywords" (array of strings: important job keywords the resume covers), ' +
  '"missingKeywords" (array of strings: important job keywords missing), ' +
  '"suggestions" (array of 3-5 short actionable strings).';

const cleanMatch = (r) => ({
  score: Math.min(Math.max(Math.round(Number(r.score)) || 0, 0), 100),
  matchedKeywords: asList(r.matchedKeywords),
  missingKeywords: asList(r.missingKeywords),
  suggestions: asList(r.suggestions),
});

router.post("/match-job", handle(async (req, res) => {
  const { resumeText, jobDescription } = req.body;

  if (!resumeText || !jobDescription) {
    return res.status(400).json({ message: "resumeText and jobDescription are required" });
  }

  const result = await askAIForJSON(
    MATCH_SYSTEM,
    `${wrap("Job description", jobDescription, 5000)}\n\n${wrap("Resume", resumeText, 6000)}`
  );

  res.json(cleanMatch(result));
}));


// NEW: MATCH MY SAVED RESUME AGAINST A SPECIFIC JOB (one click from the job page)
router.post(
  "/job-match/:jobId",
  requireRole("Candidate"),
  validateObjectId("jobId"),
  handle(async (req, res) => {
    const [job, resume] = await Promise.all([
      Job.findById(req.params.jobId),
      Resume.findOne({ user: req.user.id }),
    ]);

    if (!job) return res.status(404).json({ message: "Job not found" });

    if (!resume || !resume.skills?.length) {
      return res.status(400).json({ message: "Save your resume in the Resume Builder first" });
    }

    const jobText =
      `${job.title} at ${job.company}\nSkills: ${(job.skills || []).join(", ")}\n${job.description}`;

    const result = await askAIForJSON(
      MATCH_SYSTEM,
      `${wrap("Job description", jobText, 5000)}\n\n${wrap("Resume", resumeToText(resume), 6000)}`
    );

    res.json(cleanMatch(result));
  })
);


// GENERATE A JOB DESCRIPTION (recruiter)
router.post("/generate-job-description", requireRole("Recruiter"), handle(async (req, res) => {
  const { title, company, jobType, location, skills, notes } = req.body;

  if (!title) {
    return res.status(400).json({ message: "title is required" });
  }

  const description = await askAI(
    "You are an expert technical recruiter. Write clear, well-structured job descriptions with a short " +
      "intro, a 'Responsibilities' section, and a 'Requirements' section, using plain text with simple " +
      "line breaks (no markdown headers, no asterisks).",
    `Job title: ${clip(title, 100)}\nCompany: ${clip(company, 100) || "not specified"}\n` +
      `Job type: ${clip(jobType, 30) || "Full-Time"}\nLocation: ${clip(location, 100) || "not specified"}\n` +
      `Key skills: ${asList(skills).join(", ").slice(0, 500) || "not specified"}\n` +
      wrap("Extra notes from recruiter", notes || "none", 1500),
    { maxTokens: 900 }
  );

  res.json({ description: description.trim() });
}));


// GENERATE A TAILORED COVER LETTER
router.post("/generate-cover-letter", handle(async (req, res) => {
  const { jobId, jobTitle, company, jobDescription } = req.body;

  let title = jobTitle;
  let companyName = company;
  let description = jobDescription;

  if (jobId) {
    if (!require("mongoose").isValidObjectId(jobId)) {
      return res.status(400).json({ message: "Invalid jobId" });
    }

    const job = await Job.findById(jobId);

    if (!job) return res.status(404).json({ message: "Job not found" });

    title = job.title;
    companyName = job.company;
    description = job.description;
  }

  if (!title || !description) {
    return res.status(400).json({ message: "jobId, or jobTitle + jobDescription, is required" });
  }

  const resume = await Resume.findOne({ user: req.user.id });

  if (!resume) {
    return res.status(400).json({ message: "Save your resume in the Resume Builder first" });
  }

  const coverLetter = await askAI(
    "You are an expert career coach writing personalized cover letters. Write a concise (under 350 words), " +
      "specific, enthusiastic cover letter in plain text paragraphs (no markdown, no placeholders like " +
      "[Company Name] — use the real names given). Do not invent facts not present in the candidate's background.",
    `Job title: ${clip(title, 150)}\nCompany: ${clip(companyName, 150) || "the company"}\n` +
      `${wrap("Job description", description, 4000)}\n\n` +
      wrap("Candidate background", resumeToText(resume), 5000),
    { maxTokens: 700 }
  );

  res.json({ coverLetter: coverLetter.trim() });
}));


// GENERATE INTERVIEW QUESTIONS + PREP TIPS
router.post("/interview-questions", handle(async (req, res) => {
  const { jobId, jobTitle, jobDescription } = req.body;

  let title = jobTitle;
  let description = jobDescription;

  if (jobId) {
    if (!require("mongoose").isValidObjectId(jobId)) {
      return res.status(400).json({ message: "Invalid jobId" });
    }

    const job = await Job.findById(jobId);

    if (!job) return res.status(404).json({ message: "Job not found" });

    title = job.title;
    description = job.description;
  }

  if (!title || !description) {
    return res.status(400).json({ message: "jobId, or jobTitle + jobDescription, is required" });
  }

  const result = await askAIForJSON(
    "You are an expert interview coach. Given a job title and description, produce likely interview " +
      'questions. Return a JSON object with exactly these keys: "technical" (array of 5 role-specific ' +
      'questions), "behavioral" (array of 4 behavioral questions), "tips" (array of 3-5 short, actionable ' +
      "preparation tips for this specific role).",
    `Job title: ${clip(title, 150)}\n${wrap("Job description", description, 4000)}`
  );

  res.json({
    technical: asList(result.technical),
    behavioral: asList(result.behavioral),
    tips: asList(result.tips),
  });
}));


// RECOMMEND JOBS FOR THE LOGGED-IN CANDIDATE
router.get("/recommended-jobs", requireRole("Candidate"), handle(async (req, res) => {
  const resume = await Resume.findOne({ user: req.user.id });

  if (!resume) {
    return res.status(400).json({ message: "Save your resume in the Resume Builder first" });
  }

  const jobs = await Job.find({ status: { $ne: "Closed" } }).sort({ createdAt: -1 }).limit(30);

  if (jobs.length === 0) {
    return res.json({ recommendations: [] });
  }

  const jobList = jobs
    .map(
      (j, i) =>
        `${i}. [${j._id}] ${j.title} at ${j.company} — skills: ${(j.skills || []).join(", ") || "none listed"} — ${j.description.slice(0, 300)}`
    )
    .join("\n");

  const result = await askAIForJSON(
    "You are a job matching engine. Given a candidate profile and a numbered list of jobs (each with its " +
      "database id in square brackets), pick and rank up to 5 jobs that best fit the candidate. Return " +
      '{"recommendations": [...]}, each item with "jobId" (the id from the brackets), "score" (integer 0-100) ' +
      'and "reason" (one short sentence). Best first. Only include reasonable fits; fewer than 5 is fine.',
    `${wrap("Candidate profile", resumeToText(resume), 5000)}\n\nJobs:\n${jobList}`,
    { maxTokens: 800 }
  );

  const byId = new Map(jobs.map((j) => [j._id.toString(), j]));

  const recommendations = (result.recommendations || [])
    .filter((r) => byId.has(r.jobId))
    .map((r) => ({
      score: Math.min(Math.max(Math.round(Number(r.score)) || 0, 0), 100),
      reason: String(r.reason || ""),
      job: byId.get(r.jobId),
    }));

  res.json({ recommendations });
}));


// NEW: AI SCREENING — rank all applicants of one of my jobs (recruiter)
router.post(
  "/screen-applicants/:jobId",
  requireRole("Recruiter"),
  validateObjectId("jobId"),
  handle(async (req, res) => {
    const job = await Job.findById(req.params.jobId);

    if (!job) return res.status(404).json({ message: "Job not found" });

    if (job.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not your job" });
    }

    // Cap at 25 applicants per run to keep the prompt (and cost) bounded
    const applications = await Application.find({ job: job._id })
      .sort({ createdAt: -1 })
      .limit(25)
      .populate("user", "name");

    if (applications.length === 0) {
      return res.json({ results: [] });
    }

    const resumes = await Resume.find({
      user: { $in: applications.map((a) => a.user?._id) },
    });

    const resumeByUser = new Map(resumes.map((r) => [r.user.toString(), r]));

    const withResume = applications.filter(
      (a) => a.user && resumeByUser.has(a.user._id.toString())
    );

    const candidateBlock = withResume
      .map(
        (a) =>
          `ID: ${a._id}\n${resumeToText(resumeByUser.get(a.user._id.toString())).slice(0, 1500)}`
      )
      .join("\n---\n");

    let ranked = [];

    if (withResume.length > 0) {
      const jobText = `${job.title} at ${job.company}\nSkills: ${(job.skills || []).join(", ")}\n${job.description}`;

      const result = await askAIForJSON(
        "You are an expert technical recruiter screening applicants for a job. Score each candidate " +
          "only on evidence in their resume. Return " +
          '{"results": [...]} where each item has "applicationId" (the ID given), "score" (integer 0-100), ' +
          '"summary" (one sentence), "strengths" (array of up to 3 short strings), "gaps" (array of up to 3 ' +
          "short strings). Do not use gender, age, name, or ethnicity in scoring.",
        `${wrap("Job", jobText, 3000)}\n\n${wrap("Candidates", candidateBlock, 30000)}`,
        { maxTokens: 2500 }
      );

      const validIds = new Set(withResume.map((a) => a._id.toString()));

      ranked = (result.results || [])
        .filter((r) => validIds.has(String(r.applicationId)))
        .map((r) => ({
          applicationId: String(r.applicationId),
          score: Math.min(Math.max(Math.round(Number(r.score)) || 0, 0), 100),
          summary: String(r.summary || ""),
          strengths: asList(r.strengths).slice(0, 3),
          gaps: asList(r.gaps).slice(0, 3),
        }))
        .sort((a, b) => b.score - a.score);
    }

    res.json({
      results: ranked,
      skipped: applications.length - withResume.length, // applicants with no saved resume profile
    });
  })
);

// NEW: AI REVIEW OF THE UPLOADED RESUME FILE (PDF / DOCX)
router.post("/analyze-uploaded-resume", requireRole("Candidate"), handle(async (req, res) => {
  const text = await getUploadedResumeText(req.user.id);

  const result = await askAIForJSON(
    "You are an expert resume reviewer. Review the resume text. Return a JSON object with exactly these keys: " +
      '"score" (integer 0-100 overall quality), "strengths" (array of up to 4 short strings), ' +
      '"weaknesses" (array of up to 4 short strings), "suggestions" (array of 4-6 specific, actionable strings), ' +
      '"atsTips" (array of up to 3 strings about formatting/keywords for ATS systems).',
    wrap("Resume", text, 9000),
    { maxTokens: 1000 }
  );

  res.json({
    score: Math.min(Math.max(Math.round(Number(result.score)) || 0, 0), 100),
    strengths: asList(result.strengths),
    weaknesses: asList(result.weaknesses),
    suggestions: asList(result.suggestions),
    atsTips: asList(result.atsTips),
  });
}));


// NEW: IMPORT THE UPLOADED RESUME INTO THE RESUME BUILDER
// Only fills sections that are currently empty, so it never overwrites work the user already did.
router.post("/import-resume", requireRole("Candidate"), handle(async (req, res) => {
  const text = await getUploadedResumeText(req.user.id);

  const data = await askAIForJSON(
    "You extract structured data from a resume. Use ONLY information present in the text; use empty " +
      "strings / empty arrays when something is missing. Return a JSON object with keys: fullName, title, " +
      "email, phone, location, linkedin, github, portfolio, summary (strings); skills (array of strings); " +
      "experience (array of {role, company, location, startDate, endDate, current (boolean), bullets (array of strings)}); " +
      "education (array of {degree, school, location, startDate, endDate, details}); " +
      "projects (array of {name, link, description}); certifications (array of strings).",
    wrap("Resume", text, 9000),
    { maxTokens: 2500 }
  );

  const str = (v) => String(v ?? "").slice(0, 2000);
  const strList = (v) => asList(v).map((x) => x.slice(0, 300)).slice(0, 40);

  const clean = {
    fullName: str(data.fullName),
    title: str(data.title),
    email: str(data.email),
    phone: str(data.phone),
    location: str(data.location),
    linkedin: str(data.linkedin),
    github: str(data.github),
    portfolio: str(data.portfolio),
    summary: str(data.summary),
    skills: strList(data.skills),
    certifications: strList(data.certifications),
    experience: (Array.isArray(data.experience) ? data.experience : []).slice(0, 10).map((e) => ({
      role: str(e.role), company: str(e.company), location: str(e.location),
      startDate: str(e.startDate), endDate: str(e.endDate),
      current: Boolean(e.current), bullets: strList(e.bullets).slice(0, 8),
    })),
    education: (Array.isArray(data.education) ? data.education : []).slice(0, 6).map((e) => ({
      degree: str(e.degree), school: str(e.school), location: str(e.location),
      startDate: str(e.startDate), endDate: str(e.endDate), details: str(e.details),
    })),
    projects: (Array.isArray(data.projects) ? data.projects : []).slice(0, 10).map((p) => ({
      name: str(p.name), link: str(p.link), description: str(p.description),
    })),
  };

  const existing = (await Resume.findOne({ user: req.user.id })) || new Resume({ user: req.user.id });

  const filled = [];

  for (const [key, value] of Object.entries(clean)) {
    const isEmpty = Array.isArray(existing[key]) ? existing[key].length === 0 : !existing[key];
    const hasValue = Array.isArray(value) ? value.length > 0 : Boolean(value);

    if (isEmpty && hasValue) {
      existing[key] = value;
      filled.push(key);
    }
  }

  await existing.save();

  res.json({ filled, resume: existing });
}));


// NEW: MOCK INTERVIEW — AI scores a candidate's written answer
// body: { question, answer, jobId? }
router.post("/evaluate-answer", handle(async (req, res) => {
  const { question, answer, jobId } = req.body;

  if (!question || !answer || answer.trim().length < 10) {
    return res.status(400).json({ message: "Write a proper answer (at least a sentence) first" });
  }

  let jobLine = "";

  if (jobId && require("mongoose").isValidObjectId(jobId)) {
    const job = await Job.findById(jobId).select("title company");
    if (job) jobLine = `The interview is for: ${job.title} at ${job.company}.\n`;
  }

  const result = await askAIForJSON(
    "You are a strict but fair interviewer giving feedback on a candidate's answer. Return a JSON object " +
      'with keys: "score" (integer 0-10), "feedback" (2-3 sentences), "strengths" (array of up to 3 short ' +
      'strings), "improvements" (array of up to 3 short strings), "betterAnswer" (a concise model answer, ' +
      "max 120 words, that reuses the candidate's own facts and does not invent experience).",
    `${jobLine}${wrap("Question", question, 500)}\n\n${wrap("Candidate answer", answer, 3000)}`,
    { maxTokens: 700 }
  );

  res.json({
    score: Math.min(Math.max(Math.round(Number(result.score)) || 0, 0), 10),
    feedback: String(result.feedback || ""),
    strengths: asList(result.strengths),
    improvements: asList(result.improvements),
    betterAnswer: String(result.betterAnswer || ""),
  });
}));


// NEW: SKILL-GAP LEARNING ROADMAP for a specific job
router.post(
  "/skill-roadmap/:jobId",
  requireRole("Candidate"),
  validateObjectId("jobId"),
  handle(async (req, res) => {
    const [job, resume] = await Promise.all([
      Job.findById(req.params.jobId),
      Resume.findOne({ user: req.user.id }),
    ]);

    if (!job) return res.status(404).json({ message: "Job not found" });

    if (!resume || !resume.skills?.length) {
      return res.status(400).json({ message: "Save your resume in the Resume Builder first" });
    }

    const result = await askAIForJSON(
      "You are a career mentor. Compare the candidate's skills with the job and build a realistic " +
        'learning plan for the gaps. Return {"gaps": [{"skill": string, "why": string (one sentence), ' +
        '"weeks": integer, "steps": [2-3 short concrete strings], "project": string (a small portfolio ' +
        'project idea to prove it)}]} with at most 5 gaps, most important first. If there are no real ' +
        "gaps return an empty array.",
      `${wrap("Job", `${job.title}\nSkills: ${(job.skills || []).join(", ")}\n${job.description}`, 4000)}\n\n` +
        wrap("Candidate", resumeToText(resume), 4000),
      { maxTokens: 1200 }
    );

    const gaps = (Array.isArray(result.gaps) ? result.gaps : []).slice(0, 5).map((g) => ({
      skill: String(g.skill || ""),
      why: String(g.why || ""),
      weeks: Math.min(Math.max(parseInt(g.weeks, 10) || 2, 1), 26),
      steps: asList(g.steps).slice(0, 3),
      project: String(g.project || ""),
    }));

    res.json({ gaps });
  })
);

// NEW: AI QUALITY CHECK of a job post before publishing (recruiter)
router.post("/check-job-post", requireRole("Recruiter"), handle(async (req, res) => {
  const { title, description, salary, skills } = req.body;

  if (!title || !description) {
    return res.status(400).json({ message: "Add a title and description first" });
  }

  const result = await askAIForJSON(
    "You review job postings for clarity and fairness. Return a JSON object with keys: " +
      '"score" (integer 0-100 overall quality), "issues" (array of up to 5 short strings: unclear, missing or ' +
      'unrealistic things), "biasedPhrases" (array of exact short phrases from the posting that may discourage ' +
      'some groups, e.g. gendered or age-related wording; empty array if none), "suggestions" (array of 3-5 ' +
      "short actionable strings). Also consider whether salary and key requirements are stated.",
    `Title: ${clip(title, 150)}\nSalary: ${clip(salary, 100) || "not stated"}\n` +
      `Skills: ${asList(skills).join(", ").slice(0, 400) || "not listed"}\n` +
      wrap("Description", description, 5000),
    { maxTokens: 700 }
  );

  res.json({
    score: Math.min(Math.max(Math.round(Number(result.score)) || 0, 0), 100),
    issues: asList(result.issues).slice(0, 5),
    biasedPhrases: asList(result.biasedPhrases).slice(0, 8),
    suggestions: asList(result.suggestions).slice(0, 5),
  });
}));

module.exports = router;
