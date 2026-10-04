const express = require("express");

const Job = require("../models/Job");
const Application = require("../models/Application");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authMiddleware");
const validateObjectId = require("../middleware/validateObjectId");
const escapeRegex = require("../utils/escapeRegex");

const router = express.Router();

// Fields a recruiter is allowed to set. Anything else in req.body (createdBy, _id ...) is ignored.
const EDITABLE_FIELDS = [
  "title",
  "company",
  "location",
  "salary",
  "jobType",
  "description",
  "skills",
  "companyLogo",
  "applicationLink",
  "status",
];

const pickJobFields = (body) => {
  const data = {};

  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) data[field] = body[field];
  }

  // Accept "react, node" as well as ["react", "node"]
  if (typeof data.skills === "string") {
    data.skills = data.skills.split(",").map((s) => s.trim()).filter(Boolean);
  }

  return data;
};


// CREATE JOB (recruiters only)
router.post("/", authMiddleware, requireRole("Recruiter"), async (req, res) => {
  const job = await Job.create({
    ...pickJobFields(req.body),
    createdBy: req.user.id,
  });

  res.status(201).json({ success: true, message: "Job created successfully", job });
});


// GET ALL JOBS
// Optional query params: q, location, jobType, mine=true (needs token), page, limit
// Without page/limit the full list is returned, same as before.
router.get("/", async (req, res) => {
  const { q, location, jobType, page, limit } = req.query;

  // Closed jobs are hidden from the public list (old jobs without a status count as open)
  const filter = { status: { $ne: "Closed" } };

  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ title: rx }, { company: rx }, { skills: rx }];
  }

  if (location) filter.location = new RegExp(escapeRegex(location), "i");
  if (jobType) filter.jobType = jobType;

  let query = Job.find(filter)
    .populate("createdBy", "name")
    .sort({ createdAt: -1 });

  let pagination = {};

  if (page || limit) {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);

    const total = await Job.countDocuments(filter);

    query = query.skip((pageNum - 1) * limitNum).limit(limitNum);

    pagination = {
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      total,
    };
  }

  const jobs = await query;

  res.status(200).json({ success: true, count: jobs.length, ...pagination, jobs });
});


// GET MY JOBS (recruiter dashboard)
router.get("/mine", authMiddleware, requireRole("Recruiter"), async (req, res) => {
  const jobs = await Job.find({ createdBy: req.user.id }).sort({ createdAt: -1 }).lean();

  // One aggregation for all counts instead of one query per job
  const counts = await Application.aggregate([
    { $match: { job: { $in: jobs.map((j) => j._id) } } },
    { $group: { _id: "$job", count: { $sum: 1 } } },
  ]);

  const countByJob = new Map(counts.map((c) => [c._id.toString(), c.count]));

  jobs.forEach((j) => {
    j.applicantCount = countByJob.get(j._id.toString()) || 0;
  });

  res.json({ success: true, count: jobs.length, jobs });
});


// GET SINGLE JOB
router.get("/:id", validateObjectId("id"), async (req, res) => {
  const job = await Job.findById(req.params.id).populate("createdBy", "name");

  if (!job) {
    return res.status(404).json({ success: false, message: "Job not found" });
  }

  res.status(200).json({ success: true, job });
});


// UPDATE JOB (owner only)
router.put("/:id", authMiddleware, requireRole("Recruiter"), validateObjectId("id"), async (req, res) => {
  const job = await Job.findById(req.params.id);

  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }

  if (job.createdBy.toString() !== req.user.id) {
    return res.status(403).json({ message: "You can only edit your own jobs" });
  }

  job.set(pickJobFields(req.body));
  await job.save();

  res.json({ job });
});


// DELETE JOB (owner only) — also removes its applications
router.delete("/:id", authMiddleware, requireRole("Recruiter"), validateObjectId("id"), async (req, res) => {
  const job = await Job.findById(req.params.id);

  if (!job) {
    return res.status(404).json({ success: false, message: "Job not found" });
  }

  if (job.createdBy.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: "You can only delete your own jobs" });
  }

  await Application.deleteMany({ job: job._id });
  await job.deleteOne();

  res.status(200).json({ success: true, message: "Job deleted successfully" });
});

module.exports = router;
