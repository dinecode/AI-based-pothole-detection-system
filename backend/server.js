const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();

// =====================
// 🔹 MIDDLEWARE
// =====================
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// static uploads
app.use("/uploads", express.static("uploads"));

// =====================
// 🔹 ROUTES
// =====================
console.log("✅ server.js loaded");
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/report", require("./routes/reportRoutes")); // ⭐ IMPORTANT

// health check
app.get("/", (req, res) => {
  res.json({ message: "Backend running 🚀" });
});

// =====================
// 🔹 SERVER
// =====================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});