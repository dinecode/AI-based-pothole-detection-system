const express = require("express");
const router = express.Router();
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const PotholeReport = require("../models/PotholeReport");

// ======================================
// 📁 MULTER SETUP
// ======================================
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// ======================================
// 🎥 UPLOAD VIDEO + DETECT + SAVE
// ======================================
router.post(
  "/upload-video",
  upload.single("video"),
  async (req, res) => {
    try {
      const { latitude, longitude, address } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "No video uploaded" });
      }

      // 🔥 Send video to Python
      const formData = new FormData();
      formData.append("video", fs.createReadStream(req.file.path));

      const response = await axios.post(
        "http://localhost:8000/detect-video",
        formData,
        {
          headers: formData.getHeaders(),
        }
      );

      const { count, severity } = response.data;

      // 🔥 Save in MongoDB
      const report = await PotholeReport.create({
        count: Number(count) || 0,
        severity: severity || "Low",
        address: address || "Unknown location",
        latitude,
        longitude,
        source: "upload",
        status: "Pending",
      });

      // delete file after processing
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        message: "Video processed successfully",
        report,
      });

    } catch (err) {
      console.error("❌ Upload video error:", err);
      res.status(500).json({ message: "Video detection failed" });
    }
  }
);

// ======================================
// 📤 LIVE / MANUAL SAVE
// ======================================
router.post("/potholes", async (req, res) => {
  try {
    let { count, severity, address, latitude, longitude } = req.body;

    count = Number(count) || 0;

    if (!severity) severity = "Low";
    else {
      const s = severity.toLowerCase();
      if (s === "high") severity = "High";
      else if (s === "medium") severity = "Medium";
      else severity = "Low";
    }

    const report = await PotholeReport.create({
      count,
      severity,
      address: address || "Unknown location",
      latitude,
      longitude,
      source: "live",
      status: "Pending",
    });

    res.json({ success: true, report });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Save failed" });
  }
});

// ======================================
// 📊 ADMIN ROUTES
// ======================================
router.get(
  "/all",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const reports = await PotholeReport.find().sort({ createdAt: -1 });
    res.json(reports);
  }
);

router.put(
  "/:id/status",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const report = await PotholeReport.findByIdAndUpdate(
      req.params.id,
      { status: "Resolved" },
      { new: true }
    );
    res.json(report);
  }
);

module.exports = router;