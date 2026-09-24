const express = require("express");

const Resume = require("../models/Resume");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// GET MY RESUME (creates an empty one on first visit)
router.get("/", authMiddleware, async (req, res) => {
  try {

    let resume = await Resume.findOne({ user: req.user.id });

    if (!resume) {
      resume = await Resume.create({ user: req.user.id });
    }

    res.status(200).json({
      success: true,
      resume,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
});


// CREATE OR UPDATE MY RESUME (upsert)
router.put("/", authMiddleware, async (req, res) => {
  try {

    const updates = { ...req.body };

    delete updates.user;
    delete updates._id;

    const resume = await Resume.findOneAndUpdate(
      { user: req.user.id },
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Resume saved",
      resume,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
});


// DELETE MY RESUME
router.delete("/", authMiddleware, async (req, res) => {
  try {

    await Resume.findOneAndDelete({ user: req.user.id });

    res.status(200).json({
      success: true,
      message: "Resume deleted",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
});

module.exports = router;
