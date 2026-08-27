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
| CONNECT STUDENT WALLET
|--------------------------------------------------------------------------
*/
router.post(
  "/wallet/connect",
  protect,
  authorize("student"),
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
| Backend calculates the attendance hash.
| No blockchain transaction is sent here.
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
| Frontend sends confirmed blockchain transaction records here.
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