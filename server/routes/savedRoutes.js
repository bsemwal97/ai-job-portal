const express = require("express");

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authMiddleware");
const validateObjectId = require("../middleware/validateObjectId");
const Job = require("../models/Job");

const router = express.Router();

router.use(authMiddleware, requireRole("Candidate"));

// LIST MY SAVED JOBS (full job objects; deleted jobs are skipped)
router.get("/", async (req, res) => {
  const user = await User.findById(req.user.id).populate({
    path: "savedJobs",
    populate: { path: "createdBy", select: "name" },
  });

  res.json({ jobs: (user?.savedJobs || []).filter(Boolean) });
});

// JUST THE IDS — lets job lists show a filled heart without loading everything
router.get("/ids", async (req, res) => {
  const user = await User.findById(req.user.id).select("savedJobs");

  res.json({ ids: (user?.savedJobs || []).map(String) });
});

// SAVE A JOB ($addToSet makes it idempotent)
router.post("/:jobId", validateObjectId("jobId"), async (req, res) => {
  const exists = await Job.exists({ _id: req.params.jobId });

  if (!exists) return res.status(404).json({ message: "Job not found" });

  await User.updateOne({ _id: req.user.id }, { $addToSet: { savedJobs: req.params.jobId } });

  res.status(201).json({ saved: true });
});

// UNSAVE A JOB
router.delete("/:jobId", validateObjectId("jobId"), async (req, res) => {
  await User.updateOne({ _id: req.user.id }, { $pull: { savedJobs: req.params.jobId } });

  res.json({ saved: false });
});

module.exports = router;
