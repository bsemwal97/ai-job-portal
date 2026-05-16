const express = require("express");
const multer = require("multer");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const storage = multer.diskStorage({

  destination: (req, file, cb) => {

    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {

    cb(
      null,
      Date.now() + "-" + file.originalname
    );
  },
});

const upload = multer({ storage });


// UPLOAD RESUME
router.post(
  "/resume",
  authMiddleware,
  upload.single("resume"),
  async (req, res) => {

    try {

      res.json({
        message: "Resume uploaded",
        file: req.file,
      });

    } catch (error) {

      res.status(500).json({
        message: error.message,
      });

    }
  }
);

module.exports = router;