const db = require('../config/database'); // mysql2 pool

async function autoCancelExpiredBookings() {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // 1️⃣ Lấy danh sách booking PENDING quá hạn
    const [bookings] = await conn.query(`
      SELECT id, user_id, total_price, field_id
      FROM bookings
      WHERE status = 'PENDING'
      AND created_at <= NOW() - INTERVAL 30 MINUTE
      FOR UPDATE
    `);

    if (bookings.length === 0) {
      await conn.commit();
      return { cancelled: 0 };
    }

    for (const booking of bookings) {
      const { id, user_id, total_price, field_id, slot_time } = booking;

      // 2️⃣ Huỷ booking
      await conn.query(
        `UPDATE bookings SET status = 'CANCELLED' WHERE id = ?`,
        [id]
      );

      // 3️⃣ Hoàn tiền ví
      await conn.query(
        `UPDATE wallets SET balance = balance + ? WHERE user_id = ?`,
        [total_price, user_id]
      );

      // 4️⃣ Mở lại sân
      

      // 5️⃣ Ghi log (khuyến nghị)
      await conn.query(
        `
        INSERT INTO wallet_transactions (user_id, amount, type)
        VALUES (?, ?, 'REFUND')
        `,
        [
          user_id,
          total_price,
          `Hoàn tiền huỷ booking #${id} (quá 30 phút)`
        ]
      );
    }

    // ✅ Thành công → COMMIT
    await conn.commit();
    return { cancelled: bookings.length };

  } catch (err) {
    // ❌ Có lỗi → ROLLBACK
    await conn.rollback();
    console.error('❌ Auto cancel failed:', err);
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  autoCancelExpiredBookings
};
