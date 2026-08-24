const crypto = require("crypto");

const { pool } = require("../config/db");

const {
  mintAttendanceNFT,
} = require("../services/blockchainService");

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

    const qrToken = crypto
      .randomBytes(32)
      .toString("hex");

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
        course_name.trim(),
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
        course_name: course_name.trim(),
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
| CONNECT STUDENT WALLET
|--------------------------------------------------------------------------
|
| Student connects MetaMask from frontend.
| Frontend sends wallet address here.
|
*/
const connectWallet = async (req, res) => {
  try {
    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({
        success: false,
        message: "Wallet address is required",
      });
    }

    const wallet = wallet_address.trim();

    /*
    |--------------------------------------------------------------------------
    | Validate Ethereum wallet address
    |--------------------------------------------------------------------------
    */
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent same wallet from being connected to another student
    |--------------------------------------------------------------------------
    */
    const [existing] = await pool.execute(
      `SELECT id, name, email
       FROM users
       WHERE wallet_address = ?
       AND id != ?
       LIMIT 1`,
      [
        wallet,
        req.user.id,
      ]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This wallet is already connected to another account",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Save wallet
    |--------------------------------------------------------------------------
    */
    await pool.execute(
      `UPDATE users
       SET wallet_address = ?
       WHERE id = ?`,
      [
        wallet,
        req.user.id,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Wallet connected successfully",
      wallet_address: wallet,
    });
  } catch (error) {
    console.error("Connect wallet error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not connect wallet",
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
      [qr_token.trim()]
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
    | Check duplicate attendance
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
    | Save attendance
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
| LOCK SESSION + MINT NFTS
|--------------------------------------------------------------------------
*/
const lockSession = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    const sessionId = Number(id);

    /*
    |--------------------------------------------------------------------------
    | Find session
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

    if (session.status === "locked") {
      return res.status(400).json({
        success: false,
        message: "Attendance is already locked",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get all students who marked attendance
    |--------------------------------------------------------------------------
    */
    const [records] = await pool.execute(
      `SELECT
        a.id,
        a.session_id,
        a.student_id,
        a.marked_at,
        a.status,
        a.blockchain_tx_hash,
        a.nft_token_id,

        u.name AS student_name,
        u.email AS student_email,
        u.wallet_address

       FROM attendance_records a

       INNER JOIN users u
         ON a.student_id = u.id

       WHERE a.session_id = ?

       ORDER BY a.marked_at ASC`,
      [sessionId]
    );

    /*
    |--------------------------------------------------------------------------
    | Do not lock empty attendance
    |--------------------------------------------------------------------------
    */
    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot lock session: no attendance records found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check if NFTs already exist
    |--------------------------------------------------------------------------
    */
    const alreadyMinted = records.filter(
      (record) =>
        record.blockchain_tx_hash &&
        record.nft_token_id !== null &&
        record.nft_token_id !== undefined
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
    | Check student wallets
    |--------------------------------------------------------------------------
    */
    for (const record of records) {
      if (!record.wallet_address) {
        return res.status(400).json({
          success: false,
          message:
            `Student "${record.student_name}" has not connected a wallet. ` +
            `Ask the student to connect MetaMask before locking attendance.`,
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
            `Invalid wallet address for student "${record.student_name}"`,
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Create deterministic attendance hash
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

    const attendanceHash = crypto
      .createHash("sha256")
      .update(attendanceData)
      .digest("hex");

    /*
    |--------------------------------------------------------------------------
    | Mint NFT for every student
    |--------------------------------------------------------------------------
    */
    const blockchainResults = [];

    for (const record of records) {
      const metadataURI =
        `https://proofattendai.netlify.app/attendance/${sessionId}/${record.student_id}`;

      console.log(
        "Minting attendance NFT:",
        {
          studentId: record.student_id,
          wallet: record.wallet_address,
          sessionId,
        }
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
        student_name: record.student_name,
        student_email: record.student_email,
        wallet_address: record.wallet_address,

        transaction_hash:
          blockchainResult.transactionHash,

        contract_address:
          blockchainResult.contractAddress,

        token_id:
          blockchainResult.tokenId,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Save blockchain data in SQL
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
    | Lock session
    |--------------------------------------------------------------------------
    */
    const [lockResult] = await pool.execute(
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

    if (lockResult.affectedRows === 0) {
      return res.status(409).json({
        success: false,
        message:
          "Session could not be locked because its status changed",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Final response
    |--------------------------------------------------------------------------
    */
    return res.status(200).json({
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
        error.message ||
        "Could not lock attendance or mint NFT",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET SESSION + COMPLETE ATTENDANCE RECORDS
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

    const sessionId = Number(id);

    /*
    |--------------------------------------------------------------------------
    | Get session
    |--------------------------------------------------------------------------
    */
    const [sessions] = await pool.execute(
      `SELECT
        s.id,
        s.teacher_id,
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
        s.teacher_id,
        s.course_name,
        s.session_date,
        s.start_time,
        s.end_time,
        s.status,
        s.attendance_hash`,
      [sessionId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    const session = sessions[0];

    /*
    |--------------------------------------------------------------------------
    | Get every student attendance record
    |--------------------------------------------------------------------------
    */
    const [records] = await pool.execute(
      `SELECT
        a.id,
        a.session_id,
        a.student_id,

        u.name AS student_name,
        u.email AS student_email,
        u.wallet_address,

        a.marked_at,
        a.status,
        a.blockchain_tx_hash,
        a.nft_token_id

       FROM attendance_records a

       INNER JOIN users u
         ON a.student_id = u.id

       WHERE a.session_id = ?

       ORDER BY a.marked_at ASC`,
      [sessionId]
    );

    return res.status(200).json({
      success: true,

      session: {
        ...session,
        total_attendance:
          Number(session.total_attendance),
      },

      records,
    });
  } catch (error) {
    console.error(
      "Get session error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Could not retrieve session",
    });
  }
};

module.exports = {
  createSession,
  connectWallet,
  markAttendance,
  lockSession,
  getSession,
};