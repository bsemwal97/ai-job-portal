const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const User = require("../models/User");
const Job = require("../models/Job");
const Application = require("../models/Application");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authMiddleware");
const validateObjectId = require("../middleware/validateObjectId");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXT = [".pdf", ".doc", ".docx"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),

  // Never trust the client's filename — it can contain path tricks
  filename: (req, file, cb) =>
    cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname).toLowerCase()}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return cb(new Error("Only PDF, DOC and DOCX files are allowed"));
    }
    cb(null, true);
  },
});

const removeFile = (filename) => {
  if (!filename) return;
  fs.unlink(path.join(UPLOAD_DIR, path.basename(filename)), () => {});
};


// UPLOAD / REPLACE MY RESUME FILE (candidate)
router.post("/resume", authMiddleware, requireRole("Candidate"), (req, res) => {
  upload.single("resume")(req, res, async (err) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE" ? "File too large (max 5 MB)" : err.message;
      return res.status(400).json({ message });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Choose a file to upload" });
    }

    const user = await User.findById(req.user.id);

    removeFile(user.resumeFile?.filename);

    user.resumeFile = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      uploadedAt: new Date(),
    };
    await user.save();

    res.json({
      message: "Resume uploaded",
      file: { name: req.file.originalname, size: req.file.size },
    });
  });
});


// DELETE MY UPLOADED RESUME FILE
router.delete("/resume", authMiddleware, requireRole("Candidate"), async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user?.resumeFile?.filename) {
    return res.status(404).json({ message: "No resume uploaded" });
  }

  removeFile(user.resumeFile.filename);

  user.resumeFile = { filename: "", originalName: "" };
  await user.save();

  res.json({ message: "Resume file deleted" });
});


// DOWNLOAD MY OWN RESUME
router.get("/resume/me", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user?.resumeFile?.filename) {
    return res.status(404).json({ message: "No resume uploaded" });
  }

  res.download(
    path.join(UPLOAD_DIR, path.basename(user.resumeFile.filename)),
    user.resumeFile.originalName
  );
});


// RECRUITER DOWNLOADS AN APPLICANT'S RESUME
// Only allowed if that candidate applied to one of the recruiter's jobs.
router.get(
  "/resume/:userId",
  authMiddleware,
  requireRole("Recruiter"),
  validateObjectId("userId"),
  async (req, res) => {
    const myJobIds = await Job.find({ createdBy: req.user.id }).distinct("_id");

    const applied = await Application.exists({
      user: req.params.userId,
      job: { $in: myJobIds },
    });

    if (!applied) {
      return res.status(403).json({ message: "This candidate has not applied to your jobs" });
    }

    const candidate = await User.findById(req.params.userId);

    if (!candidate?.resumeFile?.filename) {
      return res.status(404).json({ message: "Candidate has not uploaded a resume file" });
    }

    res.download(
      path.join(UPLOAD_DIR, path.basename(candidate.resumeFile.filename)),
      candidate.resumeFile.originalName
    );
  }
);

module.exports = router;
