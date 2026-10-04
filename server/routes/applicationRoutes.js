const express = require("express");

const Application = require("../models/Application");
const { STATUSES } = require("../models/Application");
const Job = require("../models/Job");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authMiddleware");
const validateObjectId = require("../middleware/validateObjectId");

const router = express.Router();


// GET MY APPLICATIONS (candidate)
router.get("/my-applications", authMiddleware, async (req, res) => {
  const applications = await Application.find({ user: req.user.id })
    .populate("job")
    .sort({ createdAt: -1 });

  // Drop applications whose job was deleted
  res.json(applications.filter((a) => a.job));
});


// GET APPLICANTS FOR ONE OF MY JOBS (recruiter)
router.get(
  "/job/:jobId",
  authMiddleware,
  requireRole("Recruiter"),
  validateObjectId("jobId"),
  async (req, res) => {
    const job = await Job.findById(req.params.jobId);

    if (!job) return res.status(404).json({ message: "Job not found" });

    if (job.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not your job" });
    }

    const applications = await Application.find({ job: job._id })
      .populate("user", "name email resumeFile.originalName")
      .sort({ createdAt: -1 });

    res.json({ job, applications });
  }
);


// UPDATE APPLICATION STATUS (recruiter who owns the job)
router.patch(
  "/:id/status",
  authMiddleware,
  requireRole("Recruiter"),
  validateObjectId("id"),
  async (req, res) => {
    const { status } = req.body;

    if (!STATUSES.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${STATUSES.join(", ")}` });
    }

    const application = await Application.findById(req.params.id).populate("job", "createdBy");

    if (!application || !application.job) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.job.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not your job" });
    }

    application.status = status;
    await application.save();

    res.json({ _id: application._id, status: application.status });
  }
);


// APPLY TO A JOB (candidate)
router.post(
  "/:jobId",
  authMiddleware,
  requireRole("Candidate"),
  validateObjectId("jobId"),
  async (req, res) => {
    const job = await Job.findById(req.params.jobId).select("_id");

    if (!job) return res.status(404).json({ message: "Job not found" });

    try {
      const application = await Application.create({
        user: req.user.id,
        job: job._id,
      });

      res.status(201).json(application);
    } catch (error) {
      // Unique index (user + job) — also catches double-click races
      if (error.code === 11000) {
        return res.status(400).json({ message: "Already applied" });
      }
      throw error;
    }
  }
);


// WITHDRAW MY APPLICATION (candidate, own applications only)
router.delete(
  "/:id",
  authMiddleware,
  requireRole("Candidate"),
  validateObjectId("id"),
  async (req, res) => {
    const result = await Application.deleteOne({ _id: req.params.id, user: req.user.id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.json({ message: "Application withdrawn" });
  }
);

module.exports = router;
