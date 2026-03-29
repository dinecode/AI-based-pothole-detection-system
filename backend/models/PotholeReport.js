const mongoose = require("mongoose");

const potholeSchema = new mongoose.Schema(
  {
    // =========================
    // MEDIA
    // =========================
    image: {
      type: String,
      default: "",
    },

    video: {
      type: String,
      default: "",
    },

    // =========================
    // AI DETECTION DATA (🔥 NEW)
    // =========================
    count: {
      type: Number,
      default: 0,
    },

    severity: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low",
    },

    // =========================
    // LOCATION
    // =========================
    latitude: Number,
    longitude: Number,

    address: {
      type: String,
      default: "",
    },

    // =========================
    // WORKFLOW STATUS
    // =========================
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved"],
      default: "Pending",
    },

    // =========================
    // SOURCE OF REPORT
    // =========================
    source: {
      type: String,
      enum: ["live", "upload"],
      default: "live",
    },

    // =========================
    // USER
    // =========================
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PotholeReport", potholeSchema);