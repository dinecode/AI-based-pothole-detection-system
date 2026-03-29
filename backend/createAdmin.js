const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

require("dotenv").config();

const createAdmin = async () => {
  try {
    // 🔌 connect DB
    await mongoose.connect(process.env.MONGO_URI);

    // 🔐 hash password
    const hashedPassword = await bcrypt.hash("123456", 10);

    // 👤 create admin
    const admin = new User({
      name: "NHO Admin",
      email: "admin@nho.gov",
      password: hashedPassword,
      role: "admin",
    });

    await admin.save();

    console.log("✅ Admin created successfully");
    process.exit();

  } catch (err) {
    console.error("❌ Error creating admin:", err.message);
    process.exit(1);
  }
};

createAdmin();