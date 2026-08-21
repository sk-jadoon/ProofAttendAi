const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const { pool } = require("./config/db");

const app = express();

const allowedOrigins = [
  "https://proofattendai.netlify.app",
  "https://proof-attend-g39vuoazu-sidra13.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ProofAttend AI API is running",
  });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT 1 AS connected");

    return res.status(200).json({
      success: true,
      database: "connected",
      result: rows,
    });
  } catch (error) {
    console.error("DB TEST ERROR:", error);

    return res.status(500).json({
      success: false,
      database: "connection failed",
      error: error.code,
      message: error.message,
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);

  return res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

module.exports = app;