const express = require("express");

const {
  createSession,
  markAttendance,
  getSession,
  connectWallet,
  prepareLockSession,
  confirmLockSession,
} = require("../controllers/attendanceController");

const {
  protect,
  authorize,
} = require("../middleware/auth");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| CREATE ATTENDANCE SESSION
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
| CONNECT WALLET
|--------------------------------------------------------------------------
|
| Both students and teachers can connect their wallet.
|
*/
router.post(
  "/wallet/connect",
  protect,
  authorize("student", "teacher", "admin"),
  connectWallet
);

/*
|--------------------------------------------------------------------------
| MARK ATTENDANCE
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
| PREPARE LOCK
|--------------------------------------------------------------------------
*/
router.post(
  "/sessions/:id/lock/prepare",
  protect,
  authorize("teacher", "admin"),
  prepareLockSession
);

/*
|--------------------------------------------------------------------------
| CONFIRM LOCK
|--------------------------------------------------------------------------
*/
router.post(
  "/sessions/:id/lock/confirm",
  protect,
  authorize("teacher", "admin"),
  confirmLockSession
);

/*
|--------------------------------------------------------------------------
| GET SESSION
|--------------------------------------------------------------------------
*/
router.get(
  "/sessions/:id",
  protect,
  getSession
);

module.exports = router;