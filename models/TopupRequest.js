const { executeQuery } = require('../config/database');

class TopupRequest {

  // =====================================
  // USER REQUEST TOPUP
  // =====================================
  static async create(user_id, amount, note = null) {
    const result = await executeQuery(
      `INSERT INTO wallet_topups (user_id, amount, note)
       VALUES (?, ?, ?)`,
      [user_id, amount, note]
    );
    return result.insertId;
  }

  // =====================================
  // GET MY TOPUPS
  // =====================================
  static async getByUserId(user_id) {
    return await executeQuery(
      `SELECT * FROM wallet_topups
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [user_id]
    );
  }

  // =====================================
  // ADMIN GET ALL TOPUPS
  // =====================================
  static async getAll() {
    return await executeQuery(
      `SELECT wt.*, u.name
       FROM wallet_topups wt
       JOIN users u ON u.id = wt.user_id
       ORDER BY wt.created_at DESC`
    );
  }

  // =====================================
  // GET TOPUP BY ID
  // =====================================
  static async getById(id) {
    const rows = await executeQuery(
      `SELECT * FROM wallet_topups WHERE id = ?`,
      [id]
    );
    return rows[0];
  }

  // =====================================
  // APPROVE TOPUP
  // =====================================
  static async approve(id) {
    await executeQuery(
      `UPDATE wallet_topups
       SET status = 'APPROVED',
           approved_at = NOW()
       WHERE id = ? AND status = 'PENDING'`,
      [id]
    );
  }

  // =====================================
  // REJECT TOPUP
  // =====================================
  static async reject(id) {
    await executeQuery(
      `UPDATE wallet_topups
       SET status = 'REJECTED'
       WHERE id = ? AND status = 'PENDING'`,
      [id]
    );
  }
}

module.exports = TopupRequest;
