const express = require("express");

const {
  createSession,
  markAttendance,
  lockSession,
  getSession,
} = require("../controllers/attendanceController");

const {
  protect,
  authorize,
} = require("../middleware/auth");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Teacher/Admin creates attendance session
|--------------------------------------------------------------------------
*/
router.post(
  "/sessions",
  protect,
  authorize("teacher", "admin"),
  createSession
);

/*
|--------------------------------------------------------------------------
| Student marks attendance
|--------------------------------------------------------------------------
*/
router.post(
  "/mark",
  protect,
  authorize("student"),
  markAttendance
);

/*
|--------------------------------------------------------------------------
| Teacher/Admin locks attendance
|--------------------------------------------------------------------------
*/
router.post(
  "/sessions/:id/lock",
  protect,
  authorize("teacher", "admin"),
  lockSession
);

/*
|--------------------------------------------------------------------------
| Get session + complete attendance records
|--------------------------------------------------------------------------
*/
router.get(
  "/sessions/:id",
  protect,
  getSession
);

module.exports = router;