const { executeQuery } = require('../config/database');

class WalletTransaction {

  // =====================================
  // GET TRANSACTIONS BY USER
  // =====================================
  static async getByUserId(user_id) {
    return await executeQuery(
      `SELECT *
       FROM wallet_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [user_id]
    );
  }

  // =====================================
  // GET ALL TRANSACTIONS (ADMIN)
  // =====================================
  static async getAll() {
    return await executeQuery(
      `SELECT wt.*, u.name
       FROM wallet_transactions wt
       JOIN users u ON u.id = wt.user_id
       ORDER BY wt.created_at DESC`
    );
  }
}

module.exports = WalletTransaction;
