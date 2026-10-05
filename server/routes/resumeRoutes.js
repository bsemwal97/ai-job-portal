const express = require("express");

const Resume = require("../models/Resume");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Express 5 forwards errors from async handlers to the central error handler,
// so no try/catch is needed here (and internal error messages are never sent to the client).


// GET MY RESUME (creates an empty one on first visit)
router.get("/", authMiddleware, async (req, res) => {
  let resume = await Resume.findOne({ user: req.user.id });

  if (!resume) {
    resume = await Resume.create({ user: req.user.id });
  }

  res.status(200).json({ success: true, resume });
});


// CREATE OR UPDATE MY RESUME (upsert)
router.put("/", authMiddleware, async (req, res) => {
  const updates = { ...req.body };

  delete updates.user;
  delete updates._id;

  const resume = await Resume.findOneAndUpdate(
    { user: req.user.id },
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(200).json({ success: true, message: "Resume saved", resume });
});


// DELETE MY RESUME
router.delete("/", authMiddleware, async (req, res) => {
  await Resume.findOneAndDelete({ user: req.user.id });

  res.status(200).json({ success: true, message: "Resume deleted" });
});

module.exports = router;
