const { executeQuery } = require('../config/database');

class Wallet {

  // =====================================
  // CREATE WALLET (khi user đăng ký)
  // =====================================
  static async create(user_id) {
    const result = await executeQuery(
      `INSERT INTO wallets (user_id, balance)
       VALUES (?, 0)`,
      [user_id]
    );
    return result.insertId;
  }

  // =====================================
  // GET WALLET BY USER ID
  // =====================================
  static async getByUserId(user_id) {
    const rows = await executeQuery(
      `SELECT * FROM wallets WHERE user_id = ?`,
      [user_id]
    );
    return rows[0];
  }

  // =====================================
  // CHECK BALANCE ENOUGH
  // =====================================
  static async hasEnoughBalance(user_id, amount) {
    const rows = await executeQuery(
      `SELECT balance FROM wallets WHERE user_id = ?`,
      [user_id]
    );

    if (!rows.length) return false;
    return Number(rows[0].balance) >= Number(amount);
  }

  // =====================================
  // INCREASE BALANCE (ADMIN APPROVE)
  // =====================================
  static async increaseBalance(user_id, amount, reference_id = null) {
    await executeQuery(
      `UPDATE wallets
       SET balance = balance + ?
       WHERE user_id = ?`,
      [amount, user_id]
    );

    await executeQuery(
      `INSERT INTO wallet_transactions
       (user_id, amount, type, reference_id, description)
       VALUES (?, ?, 'TOPUP', ?, 'Admin duyệt nạp tiền')`,
      [user_id, amount, reference_id]
    );
  }

  // =====================================
  // DECREASE BALANCE (BOOKING)
  // =====================================
  static async decreaseBalance(user_id, amount, reference_id = null) {
    await executeQuery(
      `UPDATE wallets
       SET balance = balance - ?
       WHERE user_id = ? AND balance >= ?`,
      [amount, user_id, amount]
    );

    await executeQuery(
      `INSERT INTO wallet_transactions
       (user_id, amount, type, reference_id, description)
       VALUES (?, ?, 'BOOKING', ?, 'Thanh toán đặt sân')`,
      [user_id, -amount, reference_id]
    );
  }
}

module.exports = Wallet;
