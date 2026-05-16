const express = require("express");

const Job = require("../models/Job");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// CREATE JOB
router.post(
  "/",
  authMiddleware,
  async (req, res) => {

    try {

      const {
        title,
        company,
        location,
        salary,
        jobType,
        description,
        skills,
        companyLogo,
        applicationLink,
      } = req.body;

      const job = await Job.create({
        title,
        company,
        location,
        salary,
        jobType,
        description,
        skills,
        companyLogo,
        applicationLink,
        createdBy: req.user.id,
      });

      res.status(201).json({
        success: true,
        message: "Job created successfully",
        job,
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message,
      });

    }
  }
);


// GET ALL JOBS
router.get("/", async (req, res) => {

  try {

    const jobs = await Job.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
});


// GET SINGLE JOB
router.get("/:id", async (req, res) => {

  try {

    const job = await Job.findById(
      req.params.id
    ).populate(
      "createdBy",
      "name email"
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.status(200).json({
      success: true,
      job,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
});

// UPDATE JOB
router.put(
  "/:id",
  authMiddleware,
  async (req, res) => {

    try {

      const job = await Job.findById(
        req.params.id
      );

      if (!job) {

        return res.status(404).json({
          message: "Job not found",
        });
      }

      if (
        job.createdBy.toString() !==
        req.user.id
      ) {

        return res.status(401).json({
          message: "Unauthorized",
        });
      }

      const updatedJob =
        await Job.findByIdAndUpdate(
          req.params.id,
          req.body,
          {
            new: true,
          }
        );

      res.json({
        job: updatedJob,
      });

    } catch (error) {

      res.status(500).json({
        message: error.message,
      });

    }
  }
);

// DELETE JOB
router.delete(
  "/:id",
  authMiddleware,
  async (req, res) => {

    try {

      const job = await Job.findById(req.params.id);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }

      if (
        job.createdBy.toString() !== req.user.id
      ) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      await job.deleteOne();

      res.status(200).json({
        success: true,
        message: "Job deleted successfully",
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message,
      });

    }
  }
);

module.exports = router;