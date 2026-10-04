# AI Job Portal

A full-stack job portal where **recruiters** post jobs and manage applicants, and **candidates** build resumes, apply, and track their applications, with AI assistance on both sides.

Built with the MERN stack (MongoDB, Express, React, Node) and the OpenAI API.

<!-- TODO: add a live demo link and 2-3 screenshots or a short GIF here. Recruiters look at this first. -->
<!-- **Live demo:** https://your-app.vercel.app -->
<!-- ![Jobs page](docs/screenshots/jobs.png) -->

---

## Features

### For candidates
- Browse jobs with search and filters (title, company, skill, location, job type) and pagination
- Apply to jobs and track status: Applied → Shortlisted → Interview → Hired / Rejected
- Save jobs, withdraw applications
- Resume Builder with PDF export
- Upload a resume (PDF / DOCX) and import it into the builder
- Email notification when a recruiter updates an application

### For recruiters
- Post, edit, close / reopen and delete jobs
- Dashboard of your own jobs with applicant counts
- Applicants page: change status, download resumes (only for people who applied to *your* jobs)

### AI features
| Who | Feature |
|---|---|
| Candidate | Resume analysis (free text or the uploaded file) with score and suggestions |
| Candidate | Generate summary, improve text, generate achievement bullets |
| Candidate | **Check My Match**: ATS-style match score for a job (matched / missing keywords) |
| Candidate | **Learning roadmap** for the skills a job needs and you lack |
| Candidate | Tailored cover letter for a job |
| Candidate | Interview questions + **mock interview** (write an answer, get a score and a stronger answer) |
| Candidate | Recommended jobs based on your saved resume |
| Candidate | Import an uploaded resume into the Resume Builder |
| Recruiter | Generate a job description |
| Recruiter | **Job-post quality checker** (clarity, missing info, biased wording) |
| Recruiter | **Rank applicants** with an AI fit score, strengths and gaps |

AI scores are a screening aid, not a hiring decision. The recruiter always decides.

---

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 19, Vite, React Router, Tailwind CSS, Axios, jsPDF |
| Backend | Node.js, Express 5, Mongoose |
| Database | MongoDB |
| AI | OpenAI API (model configurable, default `gpt-4.1-mini`) |
| Auth | JWT + bcrypt, role-based access (Recruiter / Candidate) |
| Files and email | Multer, pdf-parse, mammoth, Nodemailer |
| Tooling | node:test, ESLint, GitHub Actions, Docker |

---

## Project structure

```
ai-job-portal/
├── client/                  React app (Vite)
│   └── src/
│       ├── pages/           Jobs, JobDetails, Dashboard, Applicants, ResumeBuilder, ...
│       ├── components/      Navbar, ProtectedRoute, SaveButton, JobPostChecker
│       └── config.js        API URL, axios auth interceptor
├── server/
│   ├── index.js             App setup, security middleware, error handling
│   ├── models/              User, Job, Application, Resume
│   ├── routes/              auth, jobs, applications, upload, saved, resume, ai
│   ├── middleware/          authMiddleware (JWT + requireRole), validateObjectId
│   ├── utils/               ai.js (OpenAI helper), mailer.js, resumeFile.js
│   └── test/                Automated tests
├── docker-compose.yml
└── render.yaml              Deploy blueprint for the API
```

---

## Getting started

**Requirements:** Node.js 20+, a MongoDB database (local or Atlas), and optionally an OpenAI API key.

### 1. Server

```bash
cd server
cp .env.example .env     # then fill in the values below
npm install
npm run dev              # http://localhost:5000
```

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Long random string used to sign tokens |
| `CLIENT_URL` | no | Allowed frontend origin(s), comma-separated. Default `http://localhost:5173` |
| `OPENAI_API_KEY` | no | Enables AI features. Without it the AI routes return 503 and everything else works |
| `OPENAI_MODEL` | no | Default `gpt-4.1-mini` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | no | Email settings. If `SMTP_HOST` is empty, emails are printed in the server console |

### 2. Client

```bash
cd client
cp .env.example .env     # VITE_API_URL=http://localhost:5000
npm install
npm run dev              # http://localhost:5173
```

### 3. Try it

Register two accounts, one as **Recruiter** and one as **Candidate**. As the recruiter, post a job; as the candidate, save a resume in the Resume Builder, then open the job and click **Check My Match**.

### Or with Docker

```bash
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
echo "OPENAI_API_KEY=sk-..." >> .env
docker compose up --build     # app: http://localhost:3000, API: http://localhost:5000
```

---

## API overview

All routes are under `/api`. Protected routes need `Authorization: Bearer <token>`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password/:token`, `GET /auth/me` |
| Jobs | `GET /jobs` (search, filters, pagination), `GET /jobs/:id`, `GET /jobs/mine`, `POST /jobs`, `PUT /jobs/:id`, `DELETE /jobs/:id` (recruiter, owner only) |
| Applications | `POST /applications/:jobId`, `GET /applications/my-applications`, `DELETE /applications/:id` (candidate); `GET /applications/job/:jobId`, `PATCH /applications/:id/status` (recruiter) |
| Saved jobs | `GET /saved`, `GET /saved/ids`, `POST /saved/:jobId`, `DELETE /saved/:jobId` |
| Resume | `GET/PUT/DELETE /resume` (builder data); `POST/DELETE /upload/resume`, `GET /upload/resume/me`, `GET /upload/resume/:userId` (file) |
| AI | `/ai/analyze-resume`, `/generate-summary`, `/improve-text`, `/generate-bullets`, `/match-job`, `/job-match/:jobId`, `/skill-roadmap/:jobId`, `/generate-cover-letter`, `/interview-questions`, `/evaluate-answer`, `/recommended-jobs`, `/analyze-uploaded-resume`, `/import-resume`, `/generate-job-description`, `/check-job-post`, `/screen-applicants/:jobId` |
| Health | `GET /health` |

---

## How the AI layer is built

- One helper module (`server/utils/ai.js`) handles every OpenAI call: timeout, one retry, token limits, and friendly error messages.
- Structured answers use JSON mode, then the server **validates and cleans** every field (clamps scores, coerces types, drops unknown ids). Model output is never trusted.
- User text is wrapped in delimiters and the model is told to treat it as data, to reduce prompt injection. Inputs are length-capped.
- AI routes are rate limited, and applicant screening is capped at 25 applicants per run.
- Screening prompts tell the model to ignore name, gender, age and ethnicity.

---

## Security

- Passwords hashed with bcrypt; JWT with expiry; generic login errors
- Role checks and ownership checks are enforced on the server, not just in the UI
- Field whitelisting on updates (no mass assignment), ObjectId validation
- Helmet, CORS allow-list, rate limiting on auth and AI routes
- File uploads: extension whitelist, 5 MB limit, generated filenames, access-controlled downloads
- Password reset: one-time token stored only as a hash, 30 minute expiry
- Unique database index prevents duplicate applications

---

## Tests and CI

```bash
cd server && npm test        # validation, auth, role checks, AI output cleaning, file parsing, email
cd client && npm run lint && npm run build
```

GitHub Actions runs both on every push and pull request.

---

## Deployment

1. **Database:** MongoDB Atlas free cluster.
2. **API:** Render, using `render.yaml` (set the environment variables listed above).
3. **Frontend:** Vercel with root directory `client` and `VITE_API_URL` set to the API URL.
4. Set `CLIENT_URL` on the API to the Vercel URL.

Uploaded resume files are stored on local disk, so on free hosting they are lost on redeploy. Use S3 or Cloudinary for production.

---

## Known limitations and roadmap

- JWT is kept in `localStorage`; moving to httpOnly cookies with refresh tokens is planned
- Resume files on local disk (move to object storage)
- Rate limiting is in-memory (use Redis when running multiple instances)
- Job search uses regex; MongoDB text or Atlas Search would scale better
- Job matching sends recent jobs in one prompt; embeddings + vector search would scale better
- Integration tests with a real database are not written yet

---

## Author

**Bhaskar** · [GitHub](https://github.com/bsemwal97)

<!-- TODO: add a LICENSE file (MIT is a common choice) and link it here. -->
