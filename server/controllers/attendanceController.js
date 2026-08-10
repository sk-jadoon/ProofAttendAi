const crypto = require("crypto");
const { pool } = require("../config/db");
const { mintAttendanceNFT } = require("../services/blockchainService");

const createSession = async (req, res) => {
  try {
    const { course_name, session_date, start_time } = req.body;

    if (!course_name || !session_date || !start_time) {
      return res.status(400).json({
        success: false,
        message: "Course name, date and start time are required",
      });
    }

    const qrToken = crypto.randomBytes(32).toString("hex");

    const [result] = await pool.execute(
      `INSERT INTO attendance_sessions
       (teacher_id, course_name, session_date, start_time, qr_token)
       VALUES (?, ?, ?, ?, ?)`,
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


const markAttendance = async (req, res) => {
  try {
    const { qr_token } = req.body;

    if (!qr_token) {
      return res.status(400).json({
        success: false,
        message: "QR token is required",
      });
    }

    const [sessions] = await pool.execute(
      `SELECT *
       FROM attendance_sessions
       WHERE qr_token = ?
       AND status = 'open'`,
      [qr_token]
    );

    if (sessions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Attendance session is invalid or locked",
      });
    }

    const session = sessions[0];

    const [existing] = await pool.execute(
      `SELECT id
       FROM attendance_records
       WHERE session_id = ?
       AND student_id = ?`,
      [session.id, req.user.id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Attendance already marked",
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO attendance_records
       (session_id, student_id)
       VALUES (?, ?)`,
      [session.id, req.user.id]
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


const lockSession = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Check that the session belongs to this teacher
    const [sessions] = await pool.execute(
      `SELECT *
       FROM attendance_sessions
       WHERE id = ?
       AND teacher_id = ?`,
      [id, req.user.id]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Attendance session not found",
      });
    }

    const session = sessions[0];

    // 2. Do not lock twice
    if (session.status === "locked") {
      return res.status(400).json({
        success: false,
        message: "Attendance is already locked",
      });
    }

    // 3. Get attendance records + wallet addresses
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
       ORDER BY a.student_id`,
      [id]
    );

    if (records.length === 0) {
  return res.status(400).json({
    success: false,
    message: "Cannot lock session: no attendance records found",
  });
}

    // 4. Create deterministic attendance data
    const attendanceData = JSON.stringify({
      session_id: Number(id),
      records: records.map((record) => ({
        id: record.id,
        session_id: record.session_id,
        student_id: record.student_id,
        marked_at: record.marked_at,
        status: record.status,
      })),
    });

    // 5. SHA-256 hash
    const attendanceHash = crypto
      .createHash("sha256")
      .update(attendanceData)
      .digest("hex");

    // 6. Validate every student's wallet
    for (const record of records) {
      if (!record.wallet_address) {
        return res.status(400).json({
          success: false,
          message: `Student ID ${record.student_id} does not have a wallet address`,
        });
      }

      if (!/^0x[a-fA-F0-9]{40}$/.test(record.wallet_address)) {
        return res.status(400).json({
          success: false,
          message: `Invalid wallet address for student ID ${record.student_id}`,
        });
      }
    }

    // 7. Mint NFT for each student
    const blockchainResults = [];

    for (const record of records) {
      const metadataURI =
        `https://proofattend.example/attendance/${id}/${record.student_id}`;

      const blockchainResult = await mintAttendanceNFT({
        studentWallet: record.wallet_address,
        sessionId: Number(id),
        attendanceHash,
        metadataURI,
      });

    blockchainResults.push({
  attendance_id: record.id,
  student_id: record.student_id,
  transaction_hash: blockchainResult.transactionHash,
  contract_address: blockchainResult.contractAddress,
  token_id: blockchainResult.tokenId,
});
    }

    // 8. Lock session
    await pool.execute(
      `UPDATE attendance_sessions
       SET status = 'locked',
           end_time = CURTIME(),
           attendance_hash = ?
       WHERE id = ?`,
      [attendanceHash, id]
    );

    // 9. Save blockchain information
    for (const result of blockchainResults) {
  await pool.execute(
    `UPDATE attendance_records
     SET blockchain_tx_hash = ?,
         nft_token_id = ?
     WHERE id = ?`,
    [
      result.transaction_hash,
      result.token_id,
      result.attendance_id,
    ]
  );
}

    return res.json({
      success: true,
      message: "Attendance locked and NFTs minted successfully",
      session_id: id,
      attendance_hash: attendanceHash,
      blockchain: blockchainResults,
    });

  } catch (error) {
    console.error("Lock attendance blockchain error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not lock attendance or mint NFT",
      error: error.message,
    });
  }
};


const getSession = async (req, res) => {
  try {
    const { id } = req.params;

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
      [id]
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


module.exports = {
  createSession,
  markAttendance,
  lockSession,
  getSession,
};