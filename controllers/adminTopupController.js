const { executeQuery, pool } = require('../config/database');

/* =====================================================
   ADMIN: LẤY TẤT CẢ TOPUP
===================================================== */
exports.getAllTopups = async (req, res) => {
  try {
    const topups = await executeQuery(`
      SELECT 
        wt.id,
        wt.user_id,
        u.name  AS user_name,
        u.email,
        wt.amount,
        wt.status,
        wt.note,
        wt.created_at,
        wt.approved_at
      FROM wallet_topups wt
      LEFT JOIN users u ON wt.user_id = u.id
      ORDER BY wt.created_at DESC
    `);

    return res.json({
      success: true,
      data: topups
    });

  } catch (err) {
    console.error('❌ getAllTopups:', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

/* =====================================================
   ADMIN: DUYỆT TOPUP
===================================================== */
exports.approveTopup = async (req, res) => {
  const topupId = req.params.id;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1️⃣ Lock topup
    const [topups] = await conn.query(
      `
      SELECT *
      FROM wallet_topups
      WHERE id = ? AND status = 'PENDING'
      FOR UPDATE
      `,
      [topupId]
    );

    if (!topups.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        message: 'Topup không tồn tại hoặc đã xử lý'
      });
    }

    const { user_id, amount } = topups[0];

    // 2️⃣ Đảm bảo WALLET tồn tại (RẤT QUAN TRỌNG)
    await conn.query(
      `
      INSERT INTO wallets (user_id, balance)
      VALUES (?, 0)
      ON DUPLICATE KEY UPDATE user_id = user_id
      `,
      [user_id]
    );

    // 3️⃣ Cộng tiền ví
    const [walletResult] = await conn.query(
      `
      UPDATE wallets
      SET balance = balance + ?
      WHERE user_id = ?
      `,
      [amount, user_id]
    );

    if (walletResult.affectedRows === 0) {
      throw new Error('Không thể cập nhật số dư ví');
    }

    // 4️⃣ Update trạng thái topup
    await conn.query(
      `
      UPDATE wallet_topups
      SET status = 'APPROVED',
          approved_at = NOW()
      WHERE id = ?
      `,
      [topupId]
    );

    // 5️⃣ Ghi lịch sử giao dịch
    await conn.query(
      `
      INSERT INTO wallet_transactions
        (user_id, amount, type, reference_id, description, created_at)
      VALUES (?, ?, 'TOPUP', ?, 'Nạp tiền ví', NOW())
      `,
      [user_id, amount, topupId]
    );

    await conn.commit();

    return res.json({
      success: true,
      message: 'Duyệt nạp tiền thành công'
    });

  } catch (err) {
    await conn.rollback();
    console.error('❌ approveTopup:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  } finally {
    conn.release();
  }
};

/* =====================================================
   ADMIN: TỪ CHỐI TOPUP
===================================================== */
exports.rejectTopup = async (req, res) => {
  const topupId = req.params.id;
  const { note } = req.body;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Lock topup
    const [topups] = await conn.query(
      `
      SELECT *
      FROM wallet_topups
      WHERE id = ? AND status = 'PENDING'
      FOR UPDATE
      `,
      [topupId]
    );

    if (!topups.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        message: 'Topup không tồn tại hoặc đã xử lý'
      });
    }

    await conn.query(
      `
      UPDATE wallet_topups
      SET status = 'REJECTED',
          note = ?,
          approved_at = NOW()
      WHERE id = ?
      `,
      [note || null, topupId]
    );

    await conn.commit();

    return res.json({
      success: true,
      message: 'Đã từ chối nạp tiền'
    });

  } catch (err) {
    await conn.rollback();
    console.error('❌ rejectTopup:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  } finally {
    conn.release();
  }
};
