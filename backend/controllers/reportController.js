const PotholeReport = require("../models/PotholeReport");
const { detectPotholesFromVideo } = require("../services/aiService");

// =============================
// UPLOAD VIDEO & DETECT
// =============================
exports.uploadVideoReport = async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Video is required" });
    }

    // call AI service
    const aiResult = await detectPotholesFromVideo(req.file.path);

    // 🔥 normalize severity (important for filters)
    const severity =
      aiResult.potholes_detected > 5 ? "high" : "low";

    // ✅ SAVE WITH STATUS (VERY IMPORTANT)
    const report = await PotholeReport.create({
      video: req.file.path,
      latitude,
      longitude,
      address,
      severity,
      status: "pending", // ⭐ REQUIRED FOR ADMIN
      source: "upload",
      reportedBy: req.user.id,
    });

    res.json({
      success: true,
      aiResult,
      processedVideo: `${process.env.AI_SERVICE_URL}/temp/${aiResult.processed_video}`,
      report,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =============================
// ✅ GET ALL REPORTS (ADMIN)
// =============================
exports.getAllReports = async (req, res) => {
  try {
    const reports = await PotholeReport.find()
      .populate("reportedBy", "email")
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: "Error fetching reports" });
  }
};

// =============================
// ✅ UPDATE STATUS (ADMIN)
// =============================
exports.updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const report = await PotholeReport.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    res.json(report);
  } catch (err) {
    res.status(500).json({ message: "Error updating status" });
  }
};