const express = require("express");
const router = express.Router();
const { signup, login } = require("../controllers/authController");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ✅ User routes (existing)
router.post("/signup", signup);
router.post("/login", login);

// ✅ Admin login route (NEW)
router.post("/admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await User.findOne({ email });

    if (!admin || admin.role !== "admin") {
      return res.status(401).json({ message: "Not authorized" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;