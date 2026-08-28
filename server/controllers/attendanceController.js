const crypto = require("crypto");

const { pool } = require("../config/db");
const {
  mintAttendanceNFT,
} = require("../services/blockchainService");

/* ============================================================
   HELPERS
============================================================ */

function isValidWalletAddress(wallet) {
  return /^0x[a-fA-F0-9]{40}$/.test(
    String(wallet || "").trim()
  );
}

function isValidHash(hash) {
  return /^0x[a-fA-F0-9]{64}$/.test(
    String(hash || "").trim()
  );
}

function getUserId(req) {
  if (!req.user || !req.user.id) {
    return null;
  }

  return Number(req.user.id);
}

function getUserRole(req) {
  return String(req.user?.role || "").toLowerCase();
}

/* ============================================================
   CREATE ATTENDANCE SESSION
============================================================ */

const createSession = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const {
      course_name,
      session_date,
      start_time,
    } = req.body || {};

    if (!course_name || !session_date || !start_time) {
      return res.status(400).json({
        success: false,
        message:
          "Course name, date and start time are required",
      });
    }

    const courseName = String(course_name).trim();

    if (!courseName) {
      return res.status(400).json({
        success: false,
        message: "Course name cannot be empty",
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
        userId,
        courseName,
        session_date,
        start_time,
        qrToken,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Attendance session created",

      session: {
        id: Number(result.insertId),
        teacher_id: userId,
        course_name: courseName,
        session_date,
        start_time,
        end_time: null,
        qr_token: qrToken,
        status: "open",
        total_attendance: 0,
      },
    });
  } catch (error) {
    console.error(
      "CREATE SESSION ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Could not create attendance session",
    });
  }
};

/* ============================================================
   CONNECT STUDENT WALLET
============================================================ */

const connectWallet = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { wallet_address } = req.body || {};

    if (!wallet_address) {
      return res.status(400).json({
        success: false,
        message: "Wallet address is required",
      });
    }

    const wallet = String(wallet_address).trim();

    if (!isValidWalletAddress(wallet)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address",
      });
    }

    const [existing] = await pool.execute(
      `SELECT id, name, email
       FROM users
       WHERE LOWER(wallet_address) = LOWER(?)
       AND id != ?
       LIMIT 1`,
      [
        wallet,
        userId,
      ]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This wallet is already connected to another account",
      });
    }

    await pool.execute(
      `UPDATE users
       SET wallet_address = ?
       WHERE id = ?`,
      [
        wallet,
        userId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Wallet connected successfully",
      wallet_address: wallet,
    });
  } catch (error) {
    console.error(
      "CONNECT WALLET ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Could not connect wallet",
    });
  }
};

/* ============================================================
   MARK ATTENDANCE
============================================================ */

const markAttendance = async (req, res) => {
  try {
    const { qr_token } = req.body || {};

    /*
    |--------------------------------------------------------------------------
    | AUTHENTICATION
    |--------------------------------------------------------------------------
    */

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | ONLY STUDENT CAN MARK ATTENDANCE
    |--------------------------------------------------------------------------
    */

    const userRole = String(req.user.role || "").toLowerCase();

    if (userRole !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can mark attendance",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | QR TOKEN VALIDATION
    |--------------------------------------------------------------------------
    */

    if (!qr_token) {
      return res.status(400).json({
        success: false,
        message: "QR token is required",
      });
    }

    const qrToken = String(qr_token).trim();

    /*
    |--------------------------------------------------------------------------
    | FIND OPEN SESSION
    |--------------------------------------------------------------------------
    */

    const [sessions] = await pool.execute(
      `SELECT
        id,
        teacher_id,
        course_name,
        session_date,
        start_time,
        end_time,
        qr_token,
        status,
        attendance_hash
       FROM attendance_sessions
       WHERE qr_token = ?
       AND status = 'open'
       LIMIT 1`,
      [qrToken]
    );

    if (sessions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Attendance session is invalid or locked",
      });
    }

    const session = sessions[0];
    const sessionId = Number(session.id);

    /*
    |--------------------------------------------------------------------------
    | CHECK DUPLICATE ATTENDANCE
    |--------------------------------------------------------------------------
    */

    const [existing] = await pool.execute(
      `SELECT
        id,
        session_id,
        student_id,
        marked_at,
        status,
        blockchain_tx_hash,
        nft_token_id
       FROM attendance_records
       WHERE session_id = ?
       AND student_id = ?
       LIMIT 1`,
      [
        sessionId,
        req.user.id,
      ]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Attendance already marked",
        attendance: existing[0],
        attendance_hash: session.attendance_hash
          ? `0x${session.attendance_hash.replace(/^0x/, "")}`
          : null,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | INSERT ATTENDANCE
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
        sessionId,
        req.user.id,
      ]
    );

    const attendanceId = Number(result.insertId);

    /*
    |--------------------------------------------------------------------------
    | GET ALL CURRENT ATTENDANCE RECORDS & GENERATE HASH
    |--------------------------------------------------------------------------
    */

    const [records] = await pool.execute(
      `SELECT
        id,
        session_id,
        student_id,
        marked_at,
        status
       FROM attendance_records
       WHERE session_id = ?
       ORDER BY marked_at ASC, id ASC`,
      [sessionId]
    );

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

    const formattedAttendanceHash = `0x${attendanceHash}`;

    await pool.execute(
      `UPDATE attendance_sessions
       SET attendance_hash = ?
       WHERE id = ?
       AND status = 'open'`,
      [
        attendanceHash,
        sessionId,
      ]
    );

    /*
    |--------------------------------------------------------------------------
    | GET SAVED ATTENDANCE RECORD FOR RESPONSE
    |--------------------------------------------------------------------------
    */

    const [savedRecords] = await pool.execute(
      `SELECT
        a.id AS attendance_id,
        a.session_id,
        a.student_id,
        u.name AS student_name,
        u.email AS student_email,
        u.wallet_address,
        a.marked_at,
        a.status,
        a.blockchain_tx_hash AS transaction_hash,
        a.nft_token_id AS token_id
       FROM attendance_records a
       INNER JOIN users u
         ON a.student_id = u.id
       WHERE a.id = ?
       LIMIT 1`,
      [attendanceId]
    );

    return res.status(201).json({
      success: true,
      message: "Attendance marked successfully",
      session_id: sessionId,
      attendance_hash: formattedAttendanceHash,
      total_attendance: records.length,

      attendance:
        savedRecords.length > 0
          ? savedRecords[0]
          : {
              attendance_id: attendanceId,
              session_id: sessionId,
              student_id: Number(req.user.id),
              status: "present",
            },
    });
  } catch (error) {
    console.error(
      "MARK ATTENDANCE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Could not mark attendance",
    });
  }
};

/* ============================================================
   PREPARE LOCK SESSION
============================================================ */

const prepareLockSession = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    const sessionId = Number(id);
    const role = getUserRole(req);

    let sessions;

    if (role === "admin") {
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
          userId,
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

    const [records] = await pool.execute(
      `SELECT
        a.id,
        a.session_id,
        a.student_id,
        a.marked_at,
        a.status,
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

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot lock session: no attendance records found",
      });
    }

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
        !isValidWalletAddress(
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

    const attendanceData = JSON.stringify({
      session_id: sessionId,

      records: records.map((record) => ({
        id: Number(record.id),
        session_id: Number(
          record.session_id
        ),
        student_id: Number(
          record.student_id
        ),
        marked_at: record.marked_at,
        status: record.status,
      })),
    });

    const attendanceHash = crypto
      .createHash("sha256")
      .update(attendanceData)
      .digest("hex");

    const students = records.map(
      (record) => {
        const studentHash = crypto
          .createHash("sha256")
          .update(
            `${attendanceHash}:${record.id}:${record.student_id}`
          )
          .digest("hex");

        return {
          attendance_id: Number(
            record.id
          ),

          student_id: Number(
            record.student_id
          ),

          student_name:
            record.student_name,

          student_email:
            record.student_email,

          wallet_address:
            record.wallet_address,

          attendance_hash:
            `0x${studentHash}`,

          metadata_uri:
            `https://proofattendai.netlify.app/attendance/${sessionId}/${record.student_id}`,
        };
      }
    );

    return res.status(200).json({
      success: true,

      session_id: sessionId,

      course_name:
        session.course_name,

      session_date:
        session.session_date,

      start_time:
        session.start_time,

      end_time:
        session.end_time,

      status:
        session.status,

      attendance_hash:
        `0x${attendanceHash}`,

      total_students:
        students.length,

      students,
    });
  } catch (error) {
    console.error(
      "PREPARE LOCK ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Could not prepare attendance lock",
    });
  }
};

/* ============================================================
   CONFIRM LOCK SESSION
============================================================ */

const confirmLockSession = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;
    const { attendance_hash } = req.body || {};

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    const sessionId = Number(id);

    if (!attendance_hash) {
      return res.status(400).json({
        success: false,
        message:
          "Attendance hash is required",
      });
    }

    if (!isValidHash(attendance_hash)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid attendance hash",
      });
    }

    const role = getUserRole(req);

    let sessions;

    if (role === "admin") {
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
          userId,
        ]
      );
    }

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Attendance session not found",
      });
    }

    const session = sessions[0];

    if (session.status === "locked") {
      return res.status(400).json({
        success: false,
        message:
          "Attendance is already locked",
      });
    }

    const [records] = await pool.execute(
      `SELECT
        a.id,
        a.session_id,
        a.student_id,
        a.marked_at,
        a.status,
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

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No attendance records found",
      });
    }

    for (const record of records) {
      if (!record.wallet_address) {
        return res.status(400).json({
          success: false,
          message:
            `Student "${record.student_name}" has not connected a wallet.`,
        });
      }

      if (
        !isValidWalletAddress(
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

    const attendanceData = JSON.stringify({
      session_id: sessionId,

      records: records.map((record) => ({
        id: Number(record.id),
        session_id: Number(
          record.session_id
        ),
        student_id: Number(
          record.student_id
        ),
        marked_at: record.marked_at,
        status: record.status,
      })),
    });

    const calculatedAttendanceHash =
      crypto
        .createHash("sha256")
        .update(attendanceData)
        .digest("hex");

    const calculatedHash =
      `0x${calculatedAttendanceHash}`;

    if (
      calculatedHash.toLowerCase() !==
      String(attendance_hash).toLowerCase()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Attendance hash does not match prepared attendance data",

        expected_hash:
          calculatedHash,
      });
    }

    const [currentSession] =
      await pool.execute(
        `SELECT id, status
         FROM attendance_sessions
         WHERE id = ?
         LIMIT 1`,
        [sessionId]
      );

    if (currentSession.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Attendance session not found",
      });
    }

    if (
      currentSession[0].status !==
      "open"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Attendance session is no longer open",
      });
    }

    const blockchainRecords = [];

    for (const record of records) {
      const studentHash =
        crypto
          .createHash("sha256")
          .update(
            `${calculatedAttendanceHash}:${record.id}:${record.student_id}`
          )
          .digest("hex");

      const studentAttendanceHash =
        `0x${studentHash}`;

      const metadataURI =
        `https://proofattendai.netlify.app/attendance/${sessionId}/${record.student_id}`;

      console.log(
        `[LOCK] Minting NFT for student ${record.student_id}`
      );

      let mintResult;

      try {
        mintResult =
          await mintAttendanceNFT(
            record.wallet_address,
            sessionId,
            studentAttendanceHash,
            metadataURI
          );
      } catch (blockchainError) {
        console.error(
          "[LOCK] Blockchain error:",
          blockchainError
        );

        return res.status(500).json({
          success: false,

          message:
            `Blockchain NFT mint failed for student "${record.student_name}"`,

          student_id:
            Number(record.student_id),

          student_name:
            record.student_name,

          error:
            blockchainError.message ||
            "Blockchain transaction failed",
        });
      }

      if (
        !mintResult ||
        !mintResult.transactionHash ||
        mintResult.tokenId ===
          undefined ||
        mintResult.tokenId === null
      ) {
        return res.status(500).json({
          success: false,

          message:
            `NFT mint failed for student "${record.student_name}"`,

          student_id:
            Number(record.student_id),
        });
      }

      let tokenId =
        mintResult.tokenId;

      if (
        typeof tokenId === "object" &&
        tokenId !== null
      ) {
        tokenId =
          tokenId.toString();
      }

      tokenId = String(tokenId);

      const [updateResult] =
        await pool.execute(
          `UPDATE attendance_records
           SET
             blockchain_tx_hash = ?,
             nft_token_id = ?
           WHERE id = ?
           AND session_id = ?`,
          [
            mintResult.transactionHash,
            tokenId,
            Number(record.id),
            sessionId,
          ]
        );

      if (
        !updateResult ||
        updateResult.affectedRows === 0
      ) {
        return res.status(500).json({
          success: false,

          message:
            `Blockchain transaction succeeded but attendance record could not be updated for "${record.student_name}"`,

          student_id:
            Number(record.student_id),

          transaction_hash:
            mintResult.transactionHash,

          token_id:
            tokenId,
        });
      }

      blockchainRecords.push({
        attendance_id:
          Number(record.id),

        session_id:
          sessionId,

        student_id:
          Number(record.student_id),

        student_name:
          record.student_name,

        student_email:
          record.student_email,

        wallet_address:
          record.wallet_address,

        attendance_hash:
          studentAttendanceHash,

        metadata_uri:
          metadataURI,

        transaction_hash:
          mintResult.transactionHash,

        token_id:
          tokenId,
      });
    }

    const [lockResult] =
      await pool.execute(
        `UPDATE attendance_sessions
         SET
           status = 'locked',
           end_time = CURTIME(),
           attendance_hash = ?
         WHERE id = ?
         AND status = 'open'`,
        [
          calculatedAttendanceHash,
          sessionId,
        ]
      );

    if (
      !lockResult ||
      lockResult.affectedRows === 0
    ) {
      return res.status(409).json({
        success: false,

        message:
          "Blockchain records were created, but the attendance session could not be locked.",

        session_id:
          sessionId,

        blockchain:
          blockchainRecords,
      });
    }

    const [finalRecords] =
      await pool.execute(
        `SELECT
          a.id AS attendance_id,
          a.session_id,
          a.student_id,
          u.name AS student_name,
          u.email AS student_email,
          u.wallet_address,
          a.marked_at,
          a.status,
          a.blockchain_tx_hash AS transaction_hash,
          a.nft_token_id AS token_id
         FROM attendance_records a
         INNER JOIN users u
           ON a.student_id = u.id
         WHERE a.session_id = ?
         ORDER BY a.marked_at ASC`,
        [sessionId]
      );

    return res.status(200).json({
      success: true,

      message:
        "Attendance locked and blockchain records saved successfully",

      session_id:
        sessionId,

      course_name:
        session.course_name,

      session_date:
        session.session_date,

      start_time:
        session.start_time,

      attendance_hash:
        calculatedHash,

      total_students:
        finalRecords.length,

      blockchain:
        finalRecords,
    });
  } catch (error) {
    console.error(
      "CONFIRM LOCK ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Could not confirm attendance lock",
    });
  }
};

/* ============================================================
   GET SESSION / SHOW RECORD
============================================================ */

const getSession = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    const sessionId = Number(id);
    const role = getUserRole(req);

    const [sessions] =
      await pool.execute(
        `SELECT
          s.id,
          s.teacher_id,
          s.course_name,
          s.session_date,
          s.start_time,
          s.end_time,
          s.qr_token,
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
           s.qr_token,
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

    const session =
      sessions[0];

    if (role === "admin") {
      // Admin can view all sessions.
    } else if (role === "teacher") {
      if (
        Number(session.teacher_id) !==
        userId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to view this session",
        });
      }
    } else if (role === "student") {
      const [studentAttendance] =
        await pool.execute(
          `SELECT id
           FROM attendance_records
           WHERE session_id = ?
           AND student_id = ?
           LIMIT 1`,
          [
            sessionId,
            userId,
          ]
        );

      if (
        studentAttendance.length ===
        0
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to view this attendance session",
        });
      }
    }

    const [records] =
      await pool.execute(
        `SELECT
          a.id AS attendance_id,
          a.session_id,
          a.student_id,
          u.name AS student_name,
          u.email AS student_email,
          u.wallet_address,
          a.marked_at,
          a.status,
          a.blockchain_tx_hash AS transaction_hash,
          a.nft_token_id AS token_id
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
        id:
          Number(session.id),

        teacher_id:
          Number(session.teacher_id),

        course_name:
          session.course_name,

        session_date:
          session.session_date,

        start_time:
          session.start_time,

        end_time:
          session.end_time,

        qr_token:
          session.qr_token,

        status:
          session.status,

        attendance_hash:
          session.attendance_hash,

        total_attendance:
          Number(
            session.total_attendance
          ),
      },

      total_records:
        records.length,

      records,
    });
  } catch (error) {
    console.error(
      "GET SESSION ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Could not retrieve session",
    });
  }
};

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  createSession,
  connectWallet,
  markAttendance,
  prepareLockSession,
  confirmLockSession,
  getSession,
};