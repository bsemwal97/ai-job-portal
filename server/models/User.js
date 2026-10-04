const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: { type: String, required: true, minlength: 6 },

    role: {
      type: String,
      enum: ["Recruiter", "Candidate"],
      default: "Candidate",
    },

    // Password reset: we store only a hash of the emailed token, never the token itself
    resetPasswordHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],

    // Uploaded resume file (PDF / DOC / DOCX)
    resumeFile: {
      filename: { type: String, default: "" },
      originalName: { type: String, default: "" },
      uploadedAt: { type: Date },
    },
  },
  { timestamps: true }
);

// Never leak the password hash, even if a route forgets to strip it
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
