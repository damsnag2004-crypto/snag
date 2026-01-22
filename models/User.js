// models/User.js
const { executeQuery } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const constants = require('../config/constants');

class User {

  // ===========================
  // CREATE USER + CREATE WALLET
  // ===========================
  static async create(userData) {
    const { name, email, password, phone, role = constants.ROLES.USER } = userData;

    const hashedPassword = await hashPassword(password);

    const result = await executeQuery(
      `
      INSERT INTO users (name, email, password, phone, role, status)
      VALUES (?, ?, ?, ?, ?, 'active')
      `,
      [name, email, hashedPassword, phone, role]
    );

    const userId = result.insertId;

    await executeQuery(
      `INSERT INTO wallets (user_id, balance) VALUES (?, 0)`,
      [userId]
    );

    return userId;
  }

  // ===========================
  // FIND USER
  // ===========================
  static async findByEmail(email) {
    const rows = await executeQuery(
      `SELECT * FROM users WHERE email = ?`,
      [email]
    );
    return rows[0] || null;
  }

  static async findById(id) {
    const rows = await executeQuery(
      `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.phone,
        u.created_at,
        IFNULL(w.balance, 0) AS balance
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      WHERE u.id = ?
      `,
      [id]
    );
    return rows[0] || null;
  }

  // ===========================
  // AUTH
  // ===========================
  static async verifyPassword(plainPassword, hashedPassword) {
    return comparePassword(plainPassword, hashedPassword);
  }

  static generateAuthToken(user) {
    return generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });
  }

  // ===========================
  // UPDATE PROFILE
  // ===========================
  static async updateProfile(id, updateData) {
    const allowedFields = ['name', 'phone', 'role'];
    const updates = [];
    const values = [];

    for (const key of Object.keys(updateData)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);

    await executeQuery(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  // ===========================
  // CHANGE PASSWORD
  // ===========================
  static async changePassword(id, currentPassword, newPassword) {
    const rows = await executeQuery(
      `SELECT password FROM users WHERE id = ?`,
      [id]
    );

    if (!rows[0]) throw new Error('User not found');

    const isValid = await comparePassword(currentPassword, rows[0].password);
    if (!isValid) throw new Error('Current password incorrect');

    const hashed = await hashPassword(newPassword);

    await executeQuery(
      `UPDATE users SET password = ? WHERE id = ?`,
      [hashed, id]
    );

    return true;
  }

  // ===========================
  // PAGINATION - ADMIN (FIXED)
  // ===========================
  static async findAll(page = 1, limit = 10) {
  page = Number(page);
  limit = Number(limit);

  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) limit = 10;

  const offset = (page - 1) * limit;

  const sql = `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.role,
      u.phone,
      u.created_at,
      IFNULL(w.balance, 0) AS balance
    FROM users u
    LEFT JOIN wallets w ON w.user_id = u.id
    ORDER BY u.created_at DESC
    LIMIT ${offset}, ${limit}
  `;

  const users = await executeQuery(sql);

  const totalResult = await executeQuery(
    `SELECT COUNT(*) AS total FROM users`
  );

  const total = Number(totalResult[0].total);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}


  // ===========================
  // DELETE USER
  // ===========================
  static async delete(id) {
    await executeQuery(`DELETE FROM wallets WHERE user_id = ?`, [id]);
    const result = await executeQuery(`DELETE FROM users WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }

  // ===========================
  // WALLET
  // ===========================
  static async getBalance(userId) {
    const rows = await executeQuery(
      `SELECT balance FROM wallets WHERE user_id = ?`,
      [userId]
    );
    if (!rows[0]) throw new Error('Wallet not found');
    return Number(rows[0].balance);
  }

  static async addBalance(userId, amount) {
    amount = Number(amount);
    if (amount <= 0) throw new Error('Amount must be > 0');

    await executeQuery(
      `UPDATE wallets SET balance = balance + ? WHERE user_id = ?`,
      [amount, userId]
    );

    await executeQuery(
      `
      INSERT INTO wallet_transactions (user_id, amount, type, note)
      VALUES (?, ?, 'CREDIT', 'Admin topup')
      `,
      [userId, amount]
    );

    return this.getBalance(userId);
  }

  static async deductBalance(userId, amount, note = 'Booking payment') {
    amount = Number(amount);

    const balance = await this.getBalance(userId);
    if (amount > balance) throw new Error('Insufficient balance');

    await executeQuery(
      `UPDATE wallets SET balance = balance - ? WHERE user_id = ?`,
      [amount, userId]
    );

    await executeQuery(
      `
      INSERT INTO wallet_transactions (user_id, amount, type, note)
      VALUES (?, ?, 'DEBIT', ?)
      `,
      [userId, amount, note]
    );

    return this.getBalance(userId);
  }

  static async getWalletTransactions(userId) {
    return executeQuery(
      `
      SELECT id, amount, type, note, created_at
      FROM wallet_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [userId]
    );
  }
}

module.exports = User;
