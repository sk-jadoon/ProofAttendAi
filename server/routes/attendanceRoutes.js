const express = require("express");

const {
  createSession,
  markAttendance,
  lockSession,
  getSession,
} = require("../controllers/attendanceController");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.post(
  "/sessions",
  protect,
  authorize("teacher", "admin"),
  createSession
);

router.post(
  "/mark",
  protect,
  authorize("student"),
  markAttendance
);

router.post(
  "/sessions/:id/lock",
  protect,
  authorize("teacher", "admin"),
  lockSession
);

router.get(
  "/sessions/:id",
  protect,
  getSession
);

module.exports = router;