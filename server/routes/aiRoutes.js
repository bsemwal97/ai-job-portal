const express = require("express");
const OpenAI = require("openai");

const authMiddleware = require("../middleware/authMiddleware");
const Resume = require("../models/Resume");
const Job = require("../models/Job");

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";


// Small helper so every route doesn't repeat the same call shape
async function askAI(system, user) {

  const completion = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  return completion.choices[0].message.content;
}


// Helper: ask the model for strict JSON and parse it safely
async function askAIForJSON(system, user) {

  const raw = await askAI(
    `${system} Respond with ONLY valid JSON. No markdown fences, no commentary.`,
    user
  );

  const cleaned = raw
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();

  return JSON.parse(cleaned);
}


// ANALYZE RESUME (existing feature, kept as-is)
router.post(
  "/analyze-resume",
  authMiddleware,
  async (req, res) => {

    try {

      const { resumeText } = req.body;

      if (!resumeText) {
        return res.status(400).json({
          message: "resumeText is required",
        });
      }

      const feedback = await askAI(
        "You are an expert resume reviewer and career coach.",
        `Analyze this resume and give detailed improvement suggestions:\n\n${resumeText}`
      );

      res.json({ feedback });

    } catch (error) {

      res.status(500).json({
        message: error.message,
      });

    }
  }
);


// GENERATE PROFESSIONAL SUMMARY
// body: { targetRole, yearsOfExperience, skills: [], highlights }
router.post(
  "/generate-summary",
  authMiddleware,
  async (req, res) => {

    try {

      const {
        targetRole,
        yearsOfExperience,
        skills,
        highlights,
      } = req.body;

      if (!targetRole) {
        return res.status(400).json({
          message: "targetRole is required",
        });
      }

      const summary = await askAI(
        "You are an expert resume writer. Write concise, ATS-friendly resume summaries. " +
          "Return 2-3 sentences only, no bullet points, no headings, no quotes.",
        `Write a professional resume summary for a candidate targeting the role "${targetRole}". ` +
          `Years of experience: ${yearsOfExperience || "not specified"}. ` +
          `Key skills: ${(skills || []).join(", ") || "not specified"}. ` +
          `Notable highlights: ${highlights || "none provided"}.`
      );

      res.json({ summary: summary.trim() });

    } catch (error) {

      res.status(500).json({
        message: error.message,
      });

    }
  }
);


// IMPROVE / REWRITE A PIECE OF TEXT (summary, bullet, project description, etc.)
// body: { text, context }
router.post(
  "/improve-text",
  authMiddleware,
  async (req, res) => {

    try {

      const { text, context } = req.body;

      if (!text) {
        return res.status(400).json({
          message: "text is required",
        });
      }

      const improved = await askAI(
        "You are an expert resume editor. Rewrite the given text to be more impactful, " +
          "concise, and ATS-friendly. Use strong action verbs and quantify impact where " +
          "plausible. Return only the rewritten text, nothing else.",
        `Context: ${context || "resume content"}\n\nOriginal text:\n${text}`
      );

      res.json({ improved: improved.trim() });

    } catch (error) {

      res.status(500).json({
        message: error.message,
      });

    }
  }
);


// GENERATE ACHIEVEMENT BULLET POINTS FOR A ROLE
// body: { role, company, responsibilities, count }
router.post(
  "/generate-bullets",
  authMiddleware,
  async (req, res) => {

    try {

      const {
        role,
        company,
        responsibilities,
        count,
      } = req.body;

      if (!role) {
        return res.status(400).json({
          message: "role is required",
        });
      }

      const n = count || 4;

      const bullets = await askAIForJSON(
        "You are an expert resume writer. Generate resume achievement bullet points. " +
          "Each bullet should start with a strong action verb and include a plausible " +
          `quantified result where possible. Return a JSON array of exactly ${n} strings.`,
        `Role: ${role}\nCompany: ${company || "not specified"}\n` +
          `Responsibilities / notes from the candidate: ${responsibilities || "not provided"}`
      );

      res.json({
        bullets: Array.isArray(bullets) ? bullets : [],
      });

    } catch (error) {

      res.status(500).json({
        message: error.message,
      });

    }
  }
);


// MATCH RESUME AGAINST A JOB DESCRIPTION (ATS-style scoring)
// body: { resumeText, jobDescription }
router.post(
  "/match-job",
  authMiddleware,
  async (req, res) => {

    try {

      const { resumeText, jobDescription } = req.body;

      if (!resumeText || !jobDescription) {
        return res.status(400).json({
          message: "resumeText and jobDescription are required",
        });
      }

      const result = await askAIForJSON(
        "You are an ATS (Applicant Tracking System) resume matching engine. Compare the " +
          "resume against the job description. Return a JSON object with exactly these keys: " +
          '"score" (integer 0-100, how well the resume matches the job), ' +
          '"matchedKeywords" (array of strings, important keywords/skills from the job that ' +
          "the resume already covers), " +
          '"missingKeywords" (array of strings, important keywords/skills from the job that ' +
          "are missing from the resume), " +
          '"suggestions" (array of 3-5 short, actionable strings to improve the match).',
        `Job description:\n${jobDescription}\n\nResume:\n${resumeText}`
      );

      res.json(result);

    } catch (error) {

      res.status(500).json({
        message: error.message,
      });

    }
  }
);

// GENERATE A JOB DESCRIPTION (recruiter tool)
// body: { title, company, jobType, location, skills: [], notes }
router.post(
  "/generate-job-description",
  authMiddleware,
  async (req, res) => {

    try {

      const {
        title,
        company,
        jobType,
        location,
        skills,
        notes,
      } = req.body;

      if (!title) {
        return res.status(400).json({
          message: "title is required",
        });
      }

      const description = await askAI(
        "You are an expert technical recruiter. Write clear, well-structured job " +
          "descriptions with a short intro, a 'Responsibilities' section, and a " +
          "'Requirements' section, using plain text with simple line breaks (no markdown " +
          "headers, no asterisks).",
        `Job title: ${title}\nCompany: ${company || "not specified"}\n` +
          `Job type: ${jobType || "Full-Time"}\nLocation: ${location || "not specified"}\n` +
          `Key skills: ${(skills || []).join(", ") || "not specified"}\n` +
          `Extra notes from recruiter: ${notes || "none"}`
      );

      res.json({ description: description.trim() });

    } catch (error) {

      res.status(500).json({
        message: error.message,
      });

    }
  }
);


// GENERATE A TAILORED COVER LETTER
// body: { jobId } OR { jobTitle, company, jobDescription }
router.post(
  "/generate-cover-letter",
  authMiddleware,
  async (req, res) => {

    try {

      const { jobId, jobTitle, company, jobDescription } = req.body;

      let title = jobTitle;
      let companyName = company;
      let description = jobDescription;

      if (jobId) {

        const job = await Job.findById(jobId);

        if (!job) {
          return res.status(404).json({
            message: "Job not found",
          });
        }

        title = job.title;
        companyName = job.company;
        description = job.description;
      }

      if (!title || !description) {
        return res.status(400).json({
          message: "jobId, or jobTitle + jobDescription, is required",
        });
      }

      const resume = await Resume.findOne({ user: req.user.id });

      if (!resume) {
        return res.status(400).json({
          message: "Save your resume in the Resume Builder first",
        });
      }

      const resumeSummary =
        `Name: ${resume.fullName}\nTitle: ${resume.title}\n` +
        `Summary: ${resume.summary}\nSkills: ${(resume.skills || []).join(", ")}\n` +
        `Experience: ${(resume.experience || [])
          .map((e) => `${e.role} at ${e.company} (${(e.bullets || []).join("; ")})`)
          .join(" | ")}`;

      const coverLetter = await askAI(
        "You are an expert career coach writing personalized cover letters. Write a " +
          "concise (under 350 words), specific, enthusiastic cover letter in plain text " +
          "paragraphs (no markdown, no placeholders like [Company Name] — use the real " +
          "names given). Do not invent facts not present in the candidate's background.",
        `Job title: ${title}\nCompany: ${companyName || "the company"}\n` +
          `Job description: ${description}\n\nCandidate background:\n${resumeSummary}`
      );

      res.json({ coverLetter: coverLetter.trim() });

    } catch (error) {

      res.status(500).json({
        message: error.message,
      });

    }
  }
);


// GENERATE LIKELY INTERVIEW QUESTIONS + PREP TIPS FOR A JOB
// body: { jobId } OR { jobTitle, jobDescription }
router.post(
  "/interview-questions",
  authMiddleware,
  async (req, res) => {

    try {

      const { jobId, jobTitle, jobDescription } = req.body;

      let title = jobTitle;
      let description = jobDescription;

      if (jobId) {

        const job = await Job.findById(jobId);

        if (!job) {
          return res.status(404).json({
            message: "Job not found",
          });
        }

        title = job.title;
        description = job.description;
      }

      if (!title || !description) {
        return res.status(400).json({
          message: "jobId, or jobTitle + jobDescription, is required",
        });
      }

      const result = await askAIForJSON(
        "You are an expert interview coach. Given a job title and description, produce " +
          "likely interview questions. Return a JSON object with exactly these keys: " +
          '"technical" (array of 5 likely technical/role-specific questions), ' +
          '"behavioral" (array of 4 likely behavioral questions), ' +
          '"tips" (array of 3-5 short, actionable preparation tips for this specific role).',
        `Job title: ${title}\nJob description: ${description}`
      );

      res.json(result);

    } catch (error) {

      res.status(500).json({
        message: error.message,
      });

    }
  }
);


// RECOMMEND JOBS FOR THE LOGGED-IN CANDIDATE BASED ON THEIR SAVED RESUME
router.get(
  "/recommended-jobs",
  authMiddleware,
  async (req, res) => {

    try {

      const resume = await Resume.findOne({ user: req.user.id });

      if (!resume) {
        return res.status(400).json({
          message: "Save your resume in the Resume Builder first",
        });
      }

      const jobs = await Job.find().sort({ createdAt: -1 }).limit(30);

      if (jobs.length === 0) {
        return res.json({ recommendations: [] });
      }

      const jobList = jobs
        .map(
          (j, i) =>
            `${i}. [${j._id}] ${j.title} at ${j.company} — skills: ${
              (j.skills || []).join(", ") || "none listed"
            } — ${j.description.slice(0, 300)}`
        )
        .join("\n");

      const resumeSummary =
        `Title: ${resume.title}\nTarget role: ${resume.targetRole}\n` +
        `Summary: ${resume.summary}\nSkills: ${(resume.skills || []).join(", ")}\n` +
        `Experience: ${(resume.experience || [])
          .map((e) => e.role)
          .join(", ")}`;

      const result = await askAIForJSON(
        "You are a job matching engine. Given a candidate profile and a numbered list of " +
          "jobs (each with its database id in square brackets), pick and rank up to 5 jobs " +
          "that best fit the candidate. Return a JSON object with key \"recommendations\": " +
          "an array of objects, each with \"jobId\" (the id from the square brackets), " +
          '"score" (integer 0-100), and "reason" (one short sentence). Order best first. ' +
          "Only include jobs that are a reasonable fit; it is fine to return fewer than 5.",
        `Candidate profile:\n${resumeSummary}\n\nJobs:\n${jobList}`
      );

      const byId = new Map(jobs.map((j) => [j._id.toString(), j]));

      const recommendations = (result.recommendations || [])
        .filter((r) => byId.has(r.jobId))
        .map((r) => ({
          score: r.score,
          reason: r.reason,
          job: byId.get(r.jobId),
        }));

      res.json({ recommendations });

    } catch (error) {

      res.status(500).json({
        message: error.message,
      });

    }
  }
);

module.exports = router;
