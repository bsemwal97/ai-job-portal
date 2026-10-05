const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authRoutes");
const jobRoutes = require("./routes/jobRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const aiRoutes = require("./routes/aiRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const savedRoutes = require("./routes/savedRoutes");

const app = express();

// Security headers (resume downloads are served by the API, so allow cross-origin reads)
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// Comma-separated list of allowed frontends, e.g. https://myapp.vercel.app
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));


// Rate limits — brute-force protection on login, cost protection on AI
const limiter = (windowMinutes, max, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",   // tests make many calls in a row
    message: { message },
  });

app.use("/api/auth", limiter(15, 30, "Too many attempts. Try again in a few minutes."));
app.use("/api/ai", limiter(10, 40, "Too many AI requests. Slow down for a bit."));
app.use("/api", limiter(1, 300, "Too many requests."));


// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/saved", savedRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    ai: Boolean(process.env.OPENAI_API_KEY),
  });
});


// 404 + central error handler (Express 5 forwards async errors here automatically)
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err);

  if (err.name === "ValidationError") {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(", ") });
  }

  res.status(err.status || 500).json({
    message: err.status && err.status < 500 ? err.message : "Something went wrong on the server",
  });
});

module.exports = app;
