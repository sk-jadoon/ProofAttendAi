const { pool } = require("../config/db");

const findUserByEmail = async (email) => {
  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  return rows[0] || null;
};

const findUserById = async (id) => {
  const [rows] = await pool.execute(
    "SELECT id, name, email, role, wallet_address, is_active, created_at, updated_at FROM users WHERE id = ? LIMIT 1",
    [id]
  );

  return rows[0] || null;
};

const createUser = async ({
  name,
  email,
  password,
  role,
}) => {
  const [result] = await pool.execute(
    `INSERT INTO users
      (name, email, password, role)
     VALUES (?, ?, ?, ?)`,
    [name, email, password, role]
  );

  return findUserById(result.insertId);
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
};