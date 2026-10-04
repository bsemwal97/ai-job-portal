const mongoose = require("mongoose");

const STATUSES = ["Applied", "Shortlisted", "Interview", "Rejected", "Hired"];

const applicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },

    status: { type: String, enum: STATUSES, default: "Applied" },
  },
  { timestamps: true }
);

// One application per candidate per job, enforced by the database
applicationSchema.index({ user: 1, job: 1 }, { unique: true });
applicationSchema.index({ job: 1, createdAt: -1 });

module.exports = mongoose.model("Application", applicationSchema);
module.exports.STATUSES = STATUSES;
