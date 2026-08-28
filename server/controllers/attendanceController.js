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
        message:
          "Course name, date and start time are required",
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
    console.error(
      "Create session error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Could not create attendance session",
    });
  }
};

/*
|--------------------------------------------------------------------------
| CONNECT STUDENT WALLET
|--------------------------------------------------------------------------
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
    | Prevent same wallet from being connected
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
        message:
          "This wallet is already connected to another account",
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
    console.error(
      "Connect wallet error:",
      error
    );

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
        message:
          "Attendance session is invalid or locked",
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
      message:
        "Attendance marked successfully",

      attendance: {
        id: result.insertId,
        session_id: session.id,
        student_id: req.user.id,
        status: "present",
      },
    });
  } catch (error) {
    console.error(
      "Mark attendance error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Could not mark attendance",
    });
  }
};

/*
|--------------------------------------------------------------------------
| PREPARE LOCK SESSION
|
| This does NOT send blockchain transactions.
| It prepares the attendance data for the frontend.
|--------------------------------------------------------------------------
*/
const prepareLockSession = async (req, res) => {
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
        message:
          "Attendance session not found",
      });
    }

    const session = sessions[0];

    /*
    |--------------------------------------------------------------------------
    | Check locked status
    |--------------------------------------------------------------------------
    */
    if (session.status === "locked") {
      return res.status(400).json({
        success: false,
        message:
          "Attendance is already locked",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get attendance records
    |--------------------------------------------------------------------------
    */
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

    /*
    |--------------------------------------------------------------------------
    | Do not lock empty attendance
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
    | Check wallets
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
    | Create ONE session attendance hash
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
    | Create UNIQUE hash for every student
    |--------------------------------------------------------------------------
    */
    const students = records.map((record) => {
      const studentHash = crypto
        .createHash("sha256")
        .update(
          `${attendanceHash}:${record.id}:${record.student_id}`
        )
        .digest("hex");

      return {
        attendance_id: record.id,
        student_id: record.student_id,
        student_name: record.student_name,
        student_email: record.student_email,
        wallet_address:
          record.wallet_address,

        attendance_hash:
          `0x${studentHash}`,

        metadata_uri:
          `https://proofattendai.netlify.app/attendance/${sessionId}/${record.student_id}`,
      };
    });

    return res.status(200).json({
      success: true,

      session_id: sessionId,

      attendance_hash:
        `0x${attendanceHash}`,

      total_students:
        students.length,

      students,
    });
  } catch (error) {
    console.error(
      "Prepare lock error:",
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

/*
|--------------------------------------------------------------------------
| CONFIRM LOCK SESSION
|
| Frontend sends confirmed blockchain transactions here.
|--------------------------------------------------------------------------
*/
const confirmLockSession = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      attendance_hash,
    } = req.body;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    const sessionId = Number(id);

    if (
      !attendance_hash ||
      !/^0x[a-fA-F0-9]{64}$/.test(
        attendance_hash
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance hash",
      });
    }

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
    | GET ATTENDANCE RECORDS + STUDENT WALLETS
    |--------------------------------------------------------------------------
    */

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
        message: "No attendance records found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATE STUDENT WALLETS
    |--------------------------------------------------------------------------
    */

    for (const record of records) {
      if (!record.wallet_address) {
        return res.status(400).json({
          success: false,
          message:
            `Student "${record.student_name}" has not connected a wallet.`,
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
    | VERIFY ATTENDANCE HASH
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

    const calculatedAttendanceHash =
      crypto
        .createHash("sha256")
        .update(attendanceData)
        .digest("hex");

    const calculatedHash =
      `0x${calculatedAttendanceHash}`;

    if (
      calculatedHash.toLowerCase() !==
      attendance_hash.toLowerCase()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Attendance hash does not match prepared attendance data",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | MINT NFT FOR EACH STUDENT
    |--------------------------------------------------------------------------
    */

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
        `Minting NFT for student ${record.student_id}...`
      );

      const mintResult =
        await mintAttendanceNFT(
          record.wallet_address,
          sessionId,
          studentAttendanceHash,
          metadataURI
        );

      if (
        !mintResult ||
        !mintResult.transactionHash ||
        mintResult.tokenId === undefined ||
        mintResult.tokenId === null
      ) {
        throw new Error(
          `NFT mint failed for student ${record.student_id}`
        );
      }

      /*
      |--------------------------------------------------------------------------
      | SAVE NFT DATA IN MYSQL
      |--------------------------------------------------------------------------
      */

      await pool.execute(
        `UPDATE attendance_records
         SET
           blockchain_tx_hash = ?,
           nft_token_id = ?
         WHERE id = ?
         AND session_id = ?`,
        [
          mintResult.transactionHash,
          mintResult.tokenId,
          record.id,
          sessionId,
        ]
      );

      blockchainRecords.push({
        attendance_id: record.id,
        student_id: record.student_id,
        student_name: record.student_name,
        student_email: record.student_email,
        wallet_address: record.wallet_address,

        transaction_hash:
          mintResult.transactionHash,

        token_id:
          mintResult.tokenId,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | LOCK SQL SESSION
    |--------------------------------------------------------------------------
    */

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

    if (lockResult.affectedRows === 0) {
      return res.status(409).json({
        success: false,
        message:
          "Session could not be locked because its status changed",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | GET FINAL RECORDS
    |--------------------------------------------------------------------------
    */

    const [finalRecords] =
      await pool.execute(
        `SELECT
          a.id AS attendance_id,
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

      session_id: sessionId,

      attendance_hash:
        calculatedHash,

      total_students:
        finalRecords.length,

      blockchain:
        finalRecords,
    });

  } catch (error) {
    console.error(
      "Confirm lock error:",
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
/*
|--------------------------------------------------------------------------
| EXPORT CONTROLLERS
|--------------------------------------------------------------------------
*/
module.exports = {
  createSession,
  connectWallet,
  markAttendance,
  prepareLockSession,
  confirmLockSession,
  getSession,
};