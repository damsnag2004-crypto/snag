// controllers/adminWalletController.js
const { executeQuery, pool } = require('../config/database');

/* =====================================================
   ADMIN: Lấy danh sách ví tất cả user
===================================================== */
exports.getAllWallets = async (req, res) => {
  try {
    const wallets = await executeQuery(`
      SELECT 
        w.user_id,
        u.username,
        u.email,
        w.balance,
        w.created_at,
        w.updated_at
      FROM wallets w
      JOIN users u ON w.user_id = u.id
      ORDER BY u.username ASC
    `);

    return res.json({
      success: true,
      message: 'Lấy danh sách ví thành công',
      data: wallets
    });
  } catch (err) {
    console.error('❌ getAllWallets error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

/* =====================================================
   ADMIN: Điều chỉnh số dư ví (CREDIT / DEBIT)
===================================================== */
exports.adjustWallet = async (req, res) => {
  const userId = req.params.userId;
  let { amount, type, note } = req.body;

  amount = Number(amount);

  if (!userId || !amount || amount <= 0 || !['CREDIT', 'DEBIT'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ'
    });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 🔒 Lock wallet
    const [walletRows] = await conn.query(
      `SELECT * FROM wallets WHERE user_id = ? FOR UPDATE`,
      [userId]
    );

    if (!walletRows.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        message: 'Ví không tồn tại'
      });
    }

    const wallet = walletRows[0];
    let newBalance = Number(wallet.balance);

    if (type === 'CREDIT') {
      newBalance += amount;
    } else {
      if (wallet.balance < amount) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: 'Số dư không đủ để trừ'
        });
      }
      newBalance -= amount;
    }

    // Update wallet balance
    await conn.query(
      `UPDATE wallets SET balance = ? WHERE user_id = ?`,
      [newBalance, userId]
    );

    // Log transaction
    await conn.query(
      `INSERT INTO wallet_transactions
        (user_id, amount, type, reference_id, description, created_at)
       VALUES (?, ?, ?, NULL, ?, NOW())`,
      [
        userId,
        amount,
        type,
        note || (type === 'CREDIT'
          ? 'Admin cộng tiền'
          : 'Admin trừ tiền')
      ]
    );

    await conn.commit();

    return res.json({
      success: true,
      message: 'Điều chỉnh ví thành công',
      data: {
        user_id: userId,
        balance: newBalance
      }
    });

  } catch (err) {
    await conn.rollback();
    console.error('❌ adjustWallet error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  } finally {
    conn.release();
  }
};
