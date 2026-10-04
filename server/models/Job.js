const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    company: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    salary: {
      type: String,
      default: "Not Disclosed",
    },

    jobType: {
      type: String,
      enum: ["Full-Time", "Part-Time", "Internship", "Remote"],
      default: "Full-Time",
    },

    description: {
      type: String,
      required: true,
    },

    // Closed jobs are hidden from the public list and no longer accept applications
    status: {
      type: String,
      enum: ["Open", "Closed"],
      default: "Open",
    },

    skills: {
      type: [String],
      default: [],
    },

    companyLogo: {
      type: String,
      default: "",
    },

    applicationLink: {
      type: String,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

jobSchema.index({ createdAt: -1 });
jobSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Job", jobSchema);