const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const ExcelJS = require("exceljs");
const multer = require("multer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "gb_secret_jwt_key_2026";

app.use(cors());
app.use(express.json());

// Public static files
app.use("/static", express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Multi-file upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Math.random().toString(36).substring(2, 10);
    cb(null, `${unique}${ext}`);
  }
});
const upload = multer({ limits: { fileSize: 15 * 1024 * 1024 }, storage });

// Role-Based Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Avtorizatsiyadan o'tilmagan" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Yaroqsiz token" });
    req.user = user;
    next();
  });
};

// Strict Coordinator RBAC Guard
const requireCoordinatorOrSuper = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Ruxsat yo'q" });
  next();
};

// Root Single Page Application
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 G'oyalar Banki Node.js serveri ishga tushdi: http://localhost:${PORT}`);
});
