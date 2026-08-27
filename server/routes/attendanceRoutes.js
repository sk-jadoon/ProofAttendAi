const express = require("express");

const {
  createSession,
  markAttendance,
  lockSession,
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
| Student connects MetaMask wallet
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
| Prepare attendance lock
|--------------------------------------------------------------------------
| Does NOT send blockchain transaction.
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
| Confirm attendance lock
|--------------------------------------------------------------------------
| Called AFTER MetaMask transactions are confirmed.
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
| Get complete session + attendance records
|--------------------------------------------------------------------------
*/
router.get(
  "/sessions/:id",
  protect,
  getSession
);

module.exports = router;