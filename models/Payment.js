const { executeQuery } = require('../config/database');

class Payment {

  // ======================================================
  // CREATE PAYMENT (KHI TẠO QR – ĐẶT CỌC 30%)
  // ======================================================
  static async create({
    booking_id,
    amount,
    deposit_amount,
    payment_method,
    transaction_id
  }) {
    return await executeQuery(
      `INSERT INTO payments 
        (booking_id, amount, deposit_amount, payment_method, status, refund_status, transaction_id)
       VALUES (?, ?, ?, ?, 'pending', 'none', ?)`,
      [booking_id, amount, deposit_amount, payment_method, transaction_id]
    );
  }

  // ======================================================
  // FIND BY ID
  // ======================================================
  static async findById(id) {
    const rows = await executeQuery(
      `SELECT * FROM payments WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  // ======================================================
  // FIND BY BOOKING ID
  // ======================================================
  static async findByBookingId(booking_id) {
    const rows = await executeQuery(
      `SELECT * FROM payments WHERE booking_id = ? LIMIT 1`,
      [booking_id]
    );
    return rows[0] || null;
  }

  // ======================================================
  // FIND BY TRANSACTION (WEBHOOK MOMO)
  // ======================================================
  static async findByTransaction(transaction_id) {
    const rows = await executeQuery(
      `SELECT * FROM payments WHERE transaction_id = ? LIMIT 1`,
      [transaction_id]
    );
    return rows[0] || null;
  }

  // ======================================================
  // MARK DEPOSIT PAID (MOMO SUCCESS)
  // ======================================================
  static async markDepositPaid(payment_id) {
    return await executeQuery(
      `UPDATE payments
       SET status = 'completed',
           deposit_paid_at = NOW(),
           payment_date = NOW(),
           refund_status = 'none'
       WHERE id = ?`,
      [payment_id]
    );
  }

  // ======================================================
  // ADMIN CONFIRM BOOKING (KHÔNG ĐỤNG CỌC)
  // ======================================================
  static async confirm(payment_id) {
    return await executeQuery(
      `UPDATE payments
       SET status = 'completed',
           payment_date = NOW()
       WHERE id = ?`,
      [payment_id]
    );
  }

  // ======================================================
  // REFUND DEPOSIT (ADMIN CHƯA CONFIRM)
  // ======================================================
  static async refund(payment_id) {
    return await executeQuery(
      `UPDATE payments
       SET refund_status = 'refunded'
       WHERE id = ?`,
      [payment_id]
    );
  }

  // ======================================================
  // FORFEIT DEPOSIT (ADMIN ĐÃ CONFIRM → MẤT CỌC)
  // ======================================================
  static async forfeit(payment_id) {
    return await executeQuery(
      `UPDATE payments
       SET refund_status = 'forfeited'
       WHERE id = ?`,
      [payment_id]
    );
  }
}

module.exports = Payment;
