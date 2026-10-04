const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const { sendMailSafe, resetPasswordEmail } = require("../utils/mailer");

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ["Recruiter", "Candidate"];

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});


// REGISTER
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name?.trim() || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address" });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  if (role && !ROLES.includes(role)) {
    return res.status(400).json({ message: "Role must be Recruiter or Candidate" });
  }

  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });

  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: role || "Candidate",
  });

  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});


// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });

  const isMatch = user && (await bcrypt.compare(password, user.password));

  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  res.json({ token: signToken(user), user: publicUser(user) });
});


const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");


// FORGOT PASSWORD
// Always answers the same way, so nobody can use this to discover which emails are registered.
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address" });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (user) {
    const token = crypto.randomBytes(32).toString("hex");

    user.resetPasswordHash = sha256(token);
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim();

    sendMailSafe({ to: user.email, ...resetPasswordEmail(user.name, `${clientUrl}/reset-password/${token}`) });
  }

  res.json({ message: "If that email is registered, a reset link has been sent." });
});


// RESET PASSWORD
router.post("/reset-password/:token", async (req, res) => {
  const { password } = req.body;

  if (!/^[a-f0-9]{64}$/.test(req.params.token)) {
    return res.status(400).json({ message: "Invalid or expired reset link" });
  }

  if (!password || password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  const user = await User.findOne({
    resetPasswordHash: sha256(req.params.token),
    resetPasswordExpires: { $gt: new Date() },
  }).select("+resetPasswordHash +resetPasswordExpires");

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired reset link" });
  }

  user.password = await bcrypt.hash(password, 10);
  user.resetPasswordHash = undefined;       // one-time use
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ message: "Password updated. You can log in now." });
});


// GET CURRENT USER
router.get("/me", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(user);
});

module.exports = router;
