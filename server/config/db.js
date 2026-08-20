const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: {
    rejectUnauthorized: false,
  },

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const connectDB = async () => {
  try {
    const connection = await pool.getConnection();

    console.log("=================================");
    console.log("MYSQL CONNECTED SUCCESSFULLY");
    console.log("Host:", process.env.DB_HOST);
    console.log("Database:", process.env.DB_NAME);
    console.log("=================================");

    connection.release();
  } catch (error) {
    console.error("========== MYSQL ERROR ==========");
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    console.error("=================================");

    throw error;
  }
};

module.exports = {
  pool,
  connectDB,
};
