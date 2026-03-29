// backend/middleware/adminMiddleware.js

const adminMiddleware = (req, res, next) => {
  try {
    // 🔐 check role from token
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    next();
  } catch (err) {
    res.status(500).json({ message: "Admin middleware error" });
  }
};

module.exports = adminMiddleware;