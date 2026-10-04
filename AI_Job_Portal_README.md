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

## New in this update

**Fixes**
- Register now saves the chosen role and login returns it (before, everyone became a Candidate, so role-based navbar/pages never worked)
- Role checks on the server: only Recruiters can create/edit/delete jobs, only Candidates can apply
- "Cancel Delete" on the Jobs page now really cancels (the timer kept running before)
- Password hash is never returned in API responses; job update ignores fields like `createdBy`
- Invalid ids return 400 instead of 500; duplicate applications blocked by a DB unique index
- Resume upload: PDF/DOC/DOCX only, 5 MB max, safe filenames, downloads are access-controlled
- Server no longer crashes at start-up when `OPENAI_API_KEY` is missing (AI routes return a clear 503)

**New features**
- Job search + filters (title/company/skill, location, job type)
- My Applications page with status tracking; recruiters update status (Applied / Shortlisted / Interview / Rejected / Hired)
- Recruiter Applicants page with resume download
- AI: **Check My Match** on every job (`POST /api/ai/job-match/:jobId`)
- AI: **Rank Applicants** for recruiters (`POST /api/ai/screen-applicants/:jobId`)

**Added in update 2**
- AI resume review for the uploaded PDF/DOCX (`POST /api/ai/analyze-uploaded-resume`) and one-click import into the Resume Builder (`POST /api/ai/import-resume`, only fills empty sections)
- Mock interview: write an answer under any AI question and get a score + feedback + stronger answer (`POST /api/ai/evaluate-answer`)
- Skill-gap learning roadmap per job (`POST /api/ai/skill-roadmap/:jobId`)
- Saved jobs (heart button + Saved page), withdraw application, applicant count per job, pagination on the Jobs page
- Automated tests (`cd server && npm test`), GitHub Actions CI, Dockerfiles + `docker-compose.yml`

**Hardening**: helmet, rate limiting (auth + AI), CORS allow-list, prompt-injection guards, input length caps, token limits, central error handler, `/api/health`

---

## Run with Docker

```bash
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
echo "OPENAI_API_KEY=sk-..." >> .env
docker compose up --build      # app on http://localhost:3000, API on :5000
```

## Setup (without Docker)

```bash
# server
cd server && cp .env.example .env   # fill MONGO_URI, JWT_SECRET, OPENAI_API_KEY
npm install && npm run dev

# client
cd client && cp .env.example .env   # VITE_API_URL=http://localhost:5000
npm install && npm run dev
```

Existing accounts: earlier versions saved every user as `Candidate`. To promote a recruiter:
`db.users.updateOne({ email: "you@example.com" }, { $set: { role: "Recruiter" } })`

## Status

15 AI-powered features across the recruiter and candidate flows.
