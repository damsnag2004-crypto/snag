const constants = require('../config/constants');
const {
  executeQuery,
  executeTransaction
} = require('../config/database');

class Booking {

  // =====================================================
  // CREATE BOOKING
  // - PENDING
  // - Đã thanh toán ví
  // =====================================================
  static async create({
    user_id,
    field_id,
    booking_date,
    start_time,
    end_time,
    total_price
  }) {
    const result = await executeQuery(
      `INSERT INTO bookings (
          user_id,
          field_id,
          booking_date,
          start_time,
          end_time,
          total_price,
          deposit,
          status,
          payment_method,
          payment_status
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        field_id,
        booking_date,
        start_time,
        end_time,
        total_price,
        total_price,
        constants.BOOKING_STATUS.PENDING,
        'wallet',
        'paid'
      ]
    );

    return result.insertId;
  }

  // =====================================================
  // FIND BY ID
  // =====================================================
  static async findById(id) {
    const rows = await executeQuery(
      `SELECT * FROM bookings WHERE id = ?`,
      [id]
    );
    return rows.length ? rows[0] : null;
  }

  // =====================================================
  // FIND BY ID (FOR USER)
  // =====================================================
  static async findByIdForUser(id, userId) {
    const rows = await executeQuery(
      `SELECT 
          b.*,
          f.name AS field_name,
          f.type AS field_type,
          f.location,
          f.price_per_hour
       FROM bookings b
       JOIN fields f ON b.field_id = f.id
       WHERE b.id = ? AND b.user_id = ?`,
      [id, userId]
    );

    return rows.length ? rows[0] : null;
  }

  // =====================================================
  // GET BOOKINGS BY USER (pagination)
  // =====================================================
  static async findByUserId(userId, page = 1, limit = 10) {
    page = Number(page) || 1;
    limit = Number(limit) || 10;
    const offset = (page - 1) * limit;

    const bookings = await executeQuery(
      `SELECT 
          b.*,
          f.name AS field_name,
          f.type AS field_type,
          f.location,
          f.price_per_hour
       FROM bookings b
       JOIN fields f ON b.field_id = f.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [userId]
    );

    const count = await executeQuery(
      `SELECT COUNT(*) AS total FROM bookings WHERE user_id = ?`,
      [userId]
    );

    return {
      bookings,
      pagination: {
        page,
        limit,
        total: count[0].total,
        pages: Math.ceil(count[0].total / limit)
      }
    };
  }

  // =====================================================
  // ADMIN – GET ALL BOOKINGS
  // =====================================================
  static async findAll(page = 1, limit = 10) {
    page = Number(page) || 1;
    limit = Number(limit) || 10;
    const offset = (page - 1) * limit;

    const bookings = await executeQuery(
      `SELECT 
          b.*,
          f.name AS field_name,
          f.type AS field_type,
          f.location,
          f.price_per_hour
       FROM bookings b
       JOIN fields f ON b.field_id = f.id
       ORDER BY b.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`
    );

    const count = await executeQuery(
      `SELECT COUNT(*) AS total FROM bookings`
    );

    return {
      bookings,
      pagination: {
        page,
        limit,
        total: count[0].total,
        pages: Math.ceil(count[0].total / limit)
      }
    };
  }

  // =====================================================
  // STATISTICS – ALL TIME
  // =====================================================
  static async getStatisticsAll() {
    const query = `
      SELECT
        COUNT(*) AS total_bookings,
        SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS confirmed_bookings,
        SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS pending_bookings,
        SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS cancelled_bookings,
        IFNULL(
          SUM(CASE WHEN status = ? THEN total_price ELSE 0 END),
          0
        ) AS total_revenue
      FROM bookings
    `;

    const rows = await executeQuery(query, [
      constants.BOOKING_STATUS.CONFIRMED,
      constants.BOOKING_STATUS.PENDING,
      constants.BOOKING_STATUS.CANCELLED,
      constants.BOOKING_STATUS.CONFIRMED
    ]);

    return {
      total_bookings: Number(rows[0].total_bookings) || 0,
      confirmed_bookings: Number(rows[0].confirmed_bookings) || 0,
      pending_bookings: Number(rows[0].pending_bookings) || 0,
      cancelled_bookings: Number(rows[0].cancelled_bookings) || 0,
      total_revenue: Number(rows[0].total_revenue) || 0
    };
  }

  // =====================================================
  // ADMIN CONFIRM BOOKING
  // =====================================================
  static async confirm(id) {
    await executeQuery(
      `UPDATE bookings
       SET status = ?, confirmed_at = NOW()
       WHERE id = ?`,
      [constants.BOOKING_STATUS.CONFIRMED, id]
    );

    return this.findById(id);
  }

  // =====================================================
  // CANCEL BOOKING
  // =====================================================
  static async cancel(id) {
    await executeQuery(
      `UPDATE bookings
       SET status = ?
       WHERE id = ?`,
      [constants.BOOKING_STATUS.CANCELLED, id]
    );
    return true;
  }

  // =====================================================
  // UPDATE PAYMENT STATUS
  // =====================================================
  static async updatePaymentStatus(id, status) {
    await executeQuery(
      `UPDATE bookings
       SET payment_status = ?
       WHERE id = ?`,
      [status, id]
    );
  }

  // =====================================================
  // AUTO CANCEL – FIND PENDING > 30 MINUTES
  // =====================================================
  static async findExpiredPendingBookings() {
    const rows = await executeQuery(
      `SELECT *
       FROM bookings
       WHERE status = ?
         AND created_at <= NOW() - INTERVAL 30 MINUTE`,
      [constants.BOOKING_STATUS.PENDING]
    );
    return rows;
  }

  // =====================================================
  // AUTO CANCEL BOOKING
  // =====================================================
  static async autoCancel(id) {
    await executeQuery(
      `UPDATE bookings
       SET status = ?
       WHERE id = ?`,
      [constants.BOOKING_STATUS.CANCELLED, id]
    );
  }

  // =====================================================
  // CALCULATE PRICE
  // =====================================================
  static async calculatePrice(fieldId, startTime, endTime) {
    const field = await executeQuery(
      `SELECT price_per_hour FROM fields WHERE id = ?`,
      [fieldId]
    );

    if (!field.length) throw new Error('FIELD_NOT_FOUND');

    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    const hours = (end - start) / 36e5;

    if (hours < constants.TIME_SLOTS.MIN_BOOKING_HOURS)
      throw new Error('MIN_BOOKING_HOURS');

    if (hours > constants.TIME_SLOTS.MAX_BOOKING_HOURS)
      throw new Error('MAX_BOOKING_HOURS');

    return hours * field[0].price_per_hour;
  }

  // =====================================================
  // CHECK TIME SLOT AVAILABLE
  // - BLOCK CONFIRMED + PENDING
  // =====================================================
  static async isTimeSlotAvailable(
    fieldId,
    date,
    startTime,
    endTime,
    excludeId = null
  ) {
    let sql = `
      SELECT id
      FROM bookings
      WHERE field_id = ?
        AND booking_date = ?
        AND status IN (?, ?)
        AND start_time < ?
        AND end_time > ?
    `;

    const params = [
      fieldId,
      date,
      constants.BOOKING_STATUS.CONFIRMED,
      constants.BOOKING_STATUS.PENDING,
      endTime,
      startTime
    ];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const rows = await executeQuery(sql, params);
    return rows.length === 0;
  }

  // =====================================================
  // CANCEL + REFUND (TRANSACTION)
  // =====================================================
  // =====================================================
// CANCEL + REFUND (TRANSACTION) ✅ FIXED
// =====================================================
static async cancelWithRefund(bookingId) {
  return executeTransaction(async (conn) => {

    // 🔒 LOCK booking
    const [[booking]] = await conn.query(
      `SELECT * FROM bookings WHERE id = ? FOR UPDATE`,
      [bookingId]
    );

    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND');
    }

    if (booking.status === constants.BOOKING_STATUS.CANCELLED) {
      throw new Error('BOOKING_ALREADY_CANCELLED');
    }

    // 💰 CHỈ HOÀN TIỀN NẾU CÓ DEPOSIT
    if (booking.deposit > 0 && booking.payment_status === 'paid') {

      // ➕ hoàn tiền ví
      await conn.query(
        `UPDATE wallets
         SET balance = balance + ?
         WHERE user_id = ?`,
        [booking.deposit, booking.user_id]
      );

      // 🧾 log giao dịch
      await conn.query(
        `INSERT INTO wallet_transactions
          (user_id, amount, type, reference_id, description, created_at)
         VALUES (?, ?, 'REFUND', ?, 'Hoàn tiền huỷ sân', NOW())`,
        [booking.user_id, booking.deposit, booking.id]
      );
    }

    // ❌ huỷ booking (SAU KHI HOÀN TIỀN)
    await conn.query(
      `UPDATE bookings
       SET status = ?,
           payment_status = 'refunded'
       WHERE id = ?`,
      [constants.BOOKING_STATUS.CANCELLED, booking.id]
    );
  });
}

}
module.exports = Booking;
