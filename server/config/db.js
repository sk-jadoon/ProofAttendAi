const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const connectDB = async () => {
  try {
    const connection = await pool.getConnection();

    console.log("MySQL connected successfully");

    connection.release();
  } catch (error) {
    console.error("========== MYSQL ERROR ==========");
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    console.error("SQL Message:", error.sqlMessage);
    console.error("Errno:", error.errno);
    console.error("=================================");

    process.exit(1);
  }
};

module.exports = {
  pool,
  connectDB,
};