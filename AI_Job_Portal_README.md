# AI-Powered Job Portal — Recruiter & Candidate System

A full-stack MERN job portal with AI woven into both sides of the hiring flow — recruiters get help writing job posts and screening structure, candidates get help polishing their resume, matching to roles, and prepping for interviews.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React (React Router, component pages under `client/src/pages`) |
| Backend | Node.js + Express |
| Database | MongoDB |
| AI | LLM-powered endpoints under `server/routes/aiRoutes.js` |

---

## User Roles

- **Recruiter** — posts jobs (with AI-generated job descriptions), reviews applicants.
- **Candidate** — builds a resume profile, gets AI resume feedback, generates tailored cover letters, preps for interviews with AI-generated questions, and sees AI-ranked job recommendations.

---

## AI Features

### Resume & Profile AI
| Feature | What it does |
|---|---|
| Resume Analysis | AI feedback on the candidate's saved resume |
| Summary Generation | Auto-writes a professional summary |
| Text Improvement | Rewrites/polishes resume text |
| Bullet Point Generation | Turns raw input into impact-driven resume bullets |
| Job Match Scoring | Scores a candidate's resume fit against a specific job |

### Recruiter & Candidate Matching AI
All four endpoints live in `server/routes/aiRoutes.js`.

| Endpoint | Method | What it does |
|---|---|---|
| `/api/ai/generate-job-description` | POST | Recruiter provides title, company, and skills — AI writes the full job description |
| `/api/ai/generate-cover-letter` | POST | Builds a tailored ~350-word cover letter from the candidate's saved resume + a specific job, with no placeholder text |
| `/api/ai/interview-questions` | POST | Returns structured JSON with technical + behavioral questions and prep tips for a job |
| `/api/ai/recommended-jobs` | GET | Matches the candidate's saved resume against jobs in the database, returns the top 5 ranked results with a match score and reason |

**8 AI features total**, spanning resume building, job authoring, candidate-job matching, cover letters, and interview prep.

---

## Frontend Pages (latest additions)

- `CreateJob.jsx` — "✨ Generate with AI" button that auto-writes the job description
- `CoverLetter.jsx` (`/jobs/:id/cover-letter`) — one-click cover letter generation with copy-to-clipboard
- `InterviewPrep.jsx` (`/jobs/:id/interview-prep`) — likely interview questions + prep tips for a job
- `RecommendedJobs.jsx` (`/recommended-jobs`) — "AI Matches" page showing best-fit jobs for the candidate
- `JobDetails.jsx` — added "Generate Cover Letter" and "Interview Prep" buttons
- Navbar — new "AI Matches" link for candidates

---

## Status

Build tested — all checks passing. 4 new AI endpoints and their matching frontend pages shipped in the latest update, bringing the project to 8 AI-powered features across the recruiter and candidate flows.
