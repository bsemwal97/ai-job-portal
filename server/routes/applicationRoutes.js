const express = require("express");

const Application = require("../models/Application");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// APPLY JOB
router.post(
  "/:jobId",
  authMiddleware,
  async (req, res) => {

    try {

      const existingApplication =
        await Application.findOne({
          user: req.user.id,
          job: req.params.jobId,
        });

      if (existingApplication) {

        return res.status(400).json({
          message: "Already applied",
        });

      }

      const application =
        await Application.create({
          user: req.user.id,
          job: req.params.jobId,
        });

      res.status(201).json(application);

    } catch (error) {

      res.status(500).json({
        message: error.message,
      });

    }
  }
);


// GET MY APPLICATIONS
router.get(
  "/my-applications",
  authMiddleware,
  async (req, res) => {

    try {

      const applications =
        await Application.find({
          user: req.user.id,
        })
        .populate("job");

      res.json(applications);

    } catch (error) {

      res.status(500).json({
        message: error.message,
      });

    }
  }
);


module.exports = router;