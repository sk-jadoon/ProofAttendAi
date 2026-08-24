const express = require("express");

const {
  createSession,
  markAttendance,
  lockSession,
  getSession,
  connectWallet,
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
| Teacher/Admin locks attendance + mints NFTs
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
| Get complete session + attendance records
|--------------------------------------------------------------------------
*/
router.get(
  "/sessions/:id",
  protect,
  getSession
);

module.exports = router;