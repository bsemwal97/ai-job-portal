const jwt = require("jsonwebtoken");

const User = require("../models/User");

// Accepts both "Bearer <token>" and the raw token (older client code)
const extractToken = (header = "") =>
  header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();

const authMiddleware = (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = { id: decoded.id, role: decoded.role };

    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Usage: router.post("/", authMiddleware, requireRole("Recruiter"), handler)
// Falls back to the database for tokens issued before roles were added to the JWT.
const requireRole = (...roles) => async (req, res, next) => {
  try {
    let role = req.user.role;

    if (!role) {
      const user = await User.findById(req.user.id).select("role");
      role = user?.role;
      req.user.role = role;
    }

    if (!roles.includes(role)) {
      return res.status(403).json({
        message: `Only ${roles.join(" / ")} accounts can do this`,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authMiddleware;
module.exports.requireRole = requireRole;
