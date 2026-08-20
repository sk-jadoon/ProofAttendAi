const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");

const app = express();

// =========================
// CORS
// =========================

const allowedOrigins = [
  "https://proof-attend-ai.vercel.app",
  "https://proofattendai.netlify.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without an origin
      // (for example, server-to-server requests)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// =========================
// MIDDLEWARE
// =========================

app.use(express.json());

// =========================
// API TEST
// =========================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ProofAttend AI API is running",
  });
});

// =========================
// ROUTES
// =========================

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);

// =========================
// 404 HANDLER
// =========================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

// =========================
// ERROR HANDLER
// =========================

app.use((err, req, res, next) => {
  console.error("API Error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

module.exports = app;