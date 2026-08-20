const crypto = require("crypto");
const { pool } = require("../config/db");
const { mintAttendanceNFT } = require("../services/blockchainService");

/*
|--------------------------------------------------------------------------
| CREATE ATTENDANCE SESSION
|--------------------------------------------------------------------------
*/
const createSession = async (req, res) => {
  try {
    const {
      course_name,
      session_date,
      start_time,
    } = req.body;

    if (!course_name || !session_date || !start_time) {
      return res.status(400).json({
        success: false,
        message: "Course name, date and start time are required",
      });
    }

    // Generate secure QR token
    const qrToken = crypto.randomBytes(32).toString("hex");

    const [result] = await pool.execute(
      `INSERT INTO attendance_sessions
       (
         teacher_id,
         course_name,
         session_date,
         start_time,
         qr_token,
         status
       )
       VALUES (?, ?, ?, ?, ?, 'open')`,
      [
        req.user.id,
        course_name,
        session_date,
        start_time,
        qrToken,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Attendance session created",

      session: {
        id: result.insertId,
        course_name,
        session_date,
        start_time,
        qr_token: qrToken,
        status: "open",
      },
    });
  } catch (error) {
    console.error("Create session error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not create attendance session",
    });
  }
};


/*
|--------------------------------------------------------------------------
| MARK ATTENDANCE
|--------------------------------------------------------------------------
*/
const markAttendance = async (req, res) => {
  try {
    const { qr_token } = req.body;

    if (!qr_token) {
      return res.status(400).json({
        success: false,
        message: "QR token is required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find open session
    |--------------------------------------------------------------------------
    */
    const [sessions] = await pool.execute(
      `SELECT *
       FROM attendance_sessions
       WHERE qr_token = ?
       AND status = 'open'
       LIMIT 1`,
      [qr_token]
    );

    if (sessions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Attendance session is invalid or locked",
      });
    }

    const session = sessions[0];

    /*
    |--------------------------------------------------------------------------
    | Prevent duplicate attendance
    |--------------------------------------------------------------------------
    */
    const [existing] = await pool.execute(
      `SELECT id
       FROM attendance_records
       WHERE session_id = ?
       AND student_id = ?
       LIMIT 1`,
      [
        session.id,
        req.user.id,
      ]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Attendance already marked",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Insert attendance
    |--------------------------------------------------------------------------
    */
    const [result] = await pool.execute(
      `INSERT INTO attendance_records
       (
         session_id,
         student_id,
         status
       )
       VALUES (?, ?, 'present')`,
      [
        session.id,
        req.user.id,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Attendance marked successfully",

      attendance: {
        id: result.insertId,
        session_id: session.id,
        student_id: req.user.id,
        status: "present",
      },
    });
  } catch (error) {
    console.error("Mark attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not mark attendance",
    });
  }
};


/*
|--------------------------------------------------------------------------
| LOCK SESSION + MINT ATTENDANCE NFTs
|--------------------------------------------------------------------------
*/
const lockSession = async (req, res) => {
  try {
    const { id } = req.params;

    /*
    |--------------------------------------------------------------------------
    | Validate session ID
    |--------------------------------------------------------------------------
    */
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    const sessionId = Number(id);

    /*
    |--------------------------------------------------------------------------
    | Get session
    |
    | Teacher:
    |   Can only lock own session
    |
    | Admin:
    |   Can lock any session
    |--------------------------------------------------------------------------
    */
    let sessions;

    if (req.user.role === "admin") {
      [sessions] = await pool.execute(
        `SELECT *
         FROM attendance_sessions
         WHERE id = ?
         LIMIT 1`,
        [sessionId]
      );
    } else {
      [sessions] = await pool.execute(
        `SELECT *
         FROM attendance_sessions
         WHERE id = ?
         AND teacher_id = ?
         LIMIT 1`,
        [
          sessionId,
          req.user.id,
        ]
      );
    }

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Attendance session not found",
      });
    }

    const session = sessions[0];

    /*
    |--------------------------------------------------------------------------
    | Prevent locking an already locked session
    |--------------------------------------------------------------------------
    */
    if (session.status === "locked") {
      return res.status(400).json({
        success: false,
        message: "Attendance is already locked",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get all attendance records
    |--------------------------------------------------------------------------
    */
    const [records] = await pool.execute(
      `SELECT
         a.id,
         a.session_id,
         a.student_id,
         a.marked_at,
         a.status,
         u.wallet_address
       FROM attendance_records a
       INNER JOIN users u
         ON a.student_id = u.id
       WHERE a.session_id = ?
       ORDER BY a.student_id ASC`,
      [sessionId]
    );

    /*
    |--------------------------------------------------------------------------
    | Do not lock an empty session
    |--------------------------------------------------------------------------
    */
    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot lock session: no attendance records found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create deterministic attendance data
    |
    | Same attendance records produce the same SHA-256 hash.
    |--------------------------------------------------------------------------
    */
    const attendanceData = JSON.stringify({
      session_id: sessionId,

      records: records.map((record) => ({
        id: Number(record.id),
        session_id: Number(record.session_id),
        student_id: Number(record.student_id),
        marked_at: record.marked_at,
        status: record.status,
      })),
    });

    /*
    |--------------------------------------------------------------------------
    | SHA-256 attendance hash
    |--------------------------------------------------------------------------
    */
    const attendanceHash = crypto
      .createHash("sha256")
      .update(attendanceData)
      .digest("hex");

    /*
    |--------------------------------------------------------------------------
    | Validate student wallet addresses BEFORE minting anything
    |--------------------------------------------------------------------------
    */
    for (const record of records) {
      if (!record.wallet_address) {
        return res.status(400).json({
          success: false,
          message:
            `Student ID ${record.student_id} does not have a wallet address`,
        });
      }

      if (
        !/^0x[a-fA-F0-9]{40}$/.test(
          record.wallet_address
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Invalid wallet address for student ID ${record.student_id}`,
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Check whether blockchain transaction data already exists
    |
    | This prevents accidental re-minting if the database already contains
    | blockchain information.
    |--------------------------------------------------------------------------
    */
    const alreadyMinted = records.filter(
      (record) =>
        record.blockchain_tx_hash &&
        record.nft_token_id
    );

    if (alreadyMinted.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Blockchain NFTs already exist for one or more attendance records",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Mint NFT for every present student
    |--------------------------------------------------------------------------
    */
    const blockchainResults = [];

    for (const record of records) {
      const metadataURI =
        `https://proofattend.example/attendance/${sessionId}/${record.student_id}`;

      console.log(
        `Minting attendance NFT for student ${record.student_id}...`
      );

      const blockchainResult =
        await mintAttendanceNFT({
          studentWallet: record.wallet_address,
          sessionId,
          attendanceHash,
          metadataURI,
        });

      blockchainResults.push({
        attendance_id: record.id,
        student_id: record.student_id,
        transaction_hash:
          blockchainResult.transactionHash,
        contract_address:
          blockchainResult.contractAddress,
        token_id:
          blockchainResult.tokenId,
      });

      console.log(
        `NFT minted successfully. Student: ${record.student_id}, Token ID: ${blockchainResult.tokenId}`
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Save blockchain information into MySQL
    |--------------------------------------------------------------------------
    */
    for (const result of blockchainResults) {
      await pool.execute(
        `UPDATE attendance_records
         SET
           blockchain_tx_hash = ?,
           nft_token_id = ?
         WHERE id = ?`,
        [
          result.transaction_hash,
          result.token_id,
          result.attendance_id,
        ]
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Lock the attendance session
    |--------------------------------------------------------------------------
    */
    await pool.execute(
      `UPDATE attendance_sessions
       SET
         status = 'locked',
         end_time = CURTIME(),
         attendance_hash = ?
       WHERE id = ?
       AND status = 'open'`,
      [
        attendanceHash,
        sessionId,
      ]
    );

    /*
    |--------------------------------------------------------------------------
    | Final response
    |--------------------------------------------------------------------------
    */
    return res.json({
      success: true,

      message:
        "Attendance locked and NFTs minted successfully",

      session_id: sessionId,

      attendance_hash: attendanceHash,

      total_students: records.length,

      blockchain: blockchainResults,
    });
  } catch (error) {
    console.error(
      "Lock attendance blockchain error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Could not lock attendance or mint NFT",
      error: error.message,
    });
  }
};


/*
|--------------------------------------------------------------------------
| GET SESSION
|--------------------------------------------------------------------------
*/
const getSession = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    const [rows] = await pool.execute(
      `SELECT
         s.id,
         s.course_name,
         s.session_date,
         s.start_time,
         s.end_time,
         s.status,
         s.attendance_hash,
         COUNT(a.id) AS total_attendance
       FROM attendance_sessions s
       LEFT JOIN attendance_records a
         ON s.id = a.session_id
       WHERE s.id = ?
       GROUP BY
         s.id,
         s.course_name,
         s.session_date,
         s.start_time,
         s.end_time,
         s.status,
         s.attendance_hash`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    return res.json({
      success: true,
      session: rows[0],
    });
  } catch (error) {
    console.error("Get session error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve session",
    });
  }
};


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/
module.exports = {
  createSession,
  markAttendance,
  lockSession,
  getSession,
};