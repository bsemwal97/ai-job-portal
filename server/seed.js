// Fills the database with demo data so the app looks alive right after setup:
//   npm run seed
//
// Demo logins (password for both: Demo@12345):
//   recruiter@demo.local   (Recruiter)
//   candidate@demo.local   (Candidate)
//
// Safe to run repeatedly: it only removes data belonging to the @demo.local users.
// Refuses to run when NODE_ENV=production.
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

dotenv.config();

const User = require("./models/User");
const Job = require("./models/Job");
const Application = require("./models/Application");
const Resume = require("./models/Resume");

const PASSWORD = "Demo@12345";

const JOBS = [
  { title: "Frontend Developer (React)", company: "Pixel Labs", location: "Jaipur", salary: "6-9 LPA", jobType: "Full-Time", skills: ["React", "JavaScript", "Tailwind CSS", "REST APIs"], description: "Build fast, accessible interfaces for our SaaS dashboard.\n\nResponsibilities\n- Build reusable React components\n- Work with designers and backend engineers\n- Write clean, tested code\n\nRequirements\n- 1+ years of React experience\n- Good understanding of JavaScript and CSS" },
  { title: "Node.js Backend Engineer", company: "CloudNest", location: "Bengaluru", salary: "10-15 LPA", jobType: "Full-Time", skills: ["Node.js", "Express", "MongoDB", "Docker"], description: "Design and ship REST APIs that power our mobile and web apps.\n\nResponsibilities\n- Build and maintain Express services\n- Model data in MongoDB\n- Improve performance and reliability\n\nRequirements\n- 2+ years with Node.js\n- Experience with MongoDB and Docker" },
  { title: "Full Stack Intern (MERN)", company: "Startup Studio", location: "Remote", salary: "15k/month", jobType: "Internship", skills: ["React", "Node.js", "MongoDB"], description: "Six-month internship working on a real product with a small team.\n\nYou will\n- Pick up tickets across frontend and backend\n- Get code reviews from senior engineers\n\nRequirements\n- Comfortable with JavaScript\n- A project or two on GitHub" },
  { title: "Data Analyst", company: "InsightWorks", location: "Pune", salary: "5-8 LPA", jobType: "Full-Time", skills: ["SQL", "Excel", "Power BI", "Python"], description: "Turn raw business data into dashboards and decisions.\n\nResponsibilities\n- Write SQL queries and build Power BI reports\n- Present findings to stakeholders\n\nRequirements\n- Strong SQL\n- Clear communication" },
  { title: "UI/UX Designer", company: "Pixel Labs", location: "Remote", salary: "5-8 LPA", jobType: "Remote", skills: ["Figma", "User Research", "Prototyping"], description: "Design clean, user-friendly product experiences.\n\nResponsibilities\n- Create wireframes and prototypes in Figma\n- Run quick user tests\n\nRequirements\n- A portfolio with 2+ shipped projects" },
  { title: "QA Engineer (Automation)", company: "CloudNest", location: "Noida", salary: "6-10 LPA", jobType: "Full-Time", skills: ["Selenium", "Java", "API Testing", "CI/CD"], description: "Own test automation for our web platform.\n\nResponsibilities\n- Write and maintain automated tests\n- Report and track defects\n\nRequirements\n- Experience with Selenium or Cypress" },
  { title: "Python Developer", company: "InsightWorks", location: "Hyderabad", salary: "8-12 LPA", jobType: "Part-Time", skills: ["Python", "Django", "PostgreSQL"], description: "Part-time role building internal tools and data pipelines.\n\nRequirements\n- 2+ years Python\n- Comfortable with Django and SQL" },
  { title: "DevOps Intern", company: "Startup Studio", location: "Remote", salary: "12k/month", jobType: "Internship", skills: ["Linux", "Docker", "GitHub Actions"], description: "Learn CI/CD and cloud basics while supporting our engineering team.\n\nRequirements\n- Basic Linux and Git knowledge" },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to seed demo data when NODE_ENV=production");
    process.exit(1);
  }

  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set (see .env.example)");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  // Remove earlier demo data only
  const old = await User.find({ email: /@demo\.local$/ }).select("_id");
  const oldIds = old.map((u) => u._id);
  const oldJobIds = await Job.find({ createdBy: { $in: oldIds } }).distinct("_id");

  await Application.deleteMany({ $or: [{ user: { $in: oldIds } }, { job: { $in: oldJobIds } }] });
  await Job.deleteMany({ _id: { $in: oldJobIds } });
  await Resume.deleteMany({ user: { $in: oldIds } });
  await User.deleteMany({ _id: { $in: oldIds } });

  const hash = await bcrypt.hash(PASSWORD, 10);

  const recruiter = await User.create({ name: "Riya Recruiter", email: "recruiter@demo.local", password: hash, role: "Recruiter" });
  const candidate = await User.create({ name: "Arjun Candidate", email: "candidate@demo.local", password: hash, role: "Candidate" });

  const jobs = await Job.insertMany(JOBS.map((j) => ({ ...j, createdBy: recruiter._id })));

  await Resume.create({
    user: candidate._id,
    fullName: "Arjun Candidate",
    title: "Full Stack Developer",
    targetRole: "MERN Stack Developer",
    email: "candidate@demo.local",
    location: "Jaipur",
    summary: "MCA student who builds full-stack web apps with the MERN stack and enjoys turning ideas into working products.",
    skills: ["JavaScript", "React", "Node.js", "Express", "MongoDB", "Tailwind CSS", "Git"],
    projects: [
      { name: "AI Job Portal", description: "MERN job portal with JWT auth, role-based access and AI resume tools." },
      { name: "Marketplace App", description: "Two-sided marketplace with search, bookings and an admin view." },
    ],
    education: [{ degree: "MCA", school: "Manipal University Jaipur", startDate: "2025", endDate: "2027" }],
  });

  // A couple of applications so the recruiter and candidate pages are not empty
  await Application.create([
    { user: candidate._id, job: jobs[0]._id, status: "Shortlisted" },
    { user: candidate._id, job: jobs[2]._id, status: "Applied" },
  ]);

  console.log(`Seeded ${jobs.length} jobs, 2 users, 1 resume, 2 applications.`);
  console.log("Login with recruiter@demo.local or candidate@demo.local, password: " + PASSWORD);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});
