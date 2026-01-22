const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const MomoService = require('../services/momoService');

// ======================================================
// CREATE PAYMENT QR (ĐẶT CỌC 30%)
// ======================================================
exports.createPaymentQRCode = async (req, res) => {
  try {
    const { booking_id } = req.body;
    const user_id = req.user.id;

    const booking = await Booking.findById(booking_id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.user_id !== user_id) {
      return res.status(403).json({ success: false, message: "Not your booking" });
    }

    // ❌ Không cho tạo QR nếu đã confirmed
    if (booking.confirmed_at) {
      return res.status(400).json({
        success: false,
        message: "Booking already confirmed"
      });
    }

    const deposit = Math.round(booking.total_price * 0.3);

    const momo = await MomoService.createQR({
      amount: deposit,
      orderId: `ORDER_${booking_id}_${Date.now()}`
    });

    await Payment.create({
      booking_id,
      amount: booking.total_price,
      deposit_amount: deposit,
      payment_method: 'momo',
      transaction_id: momo.orderId
    });

    res.json({
      success: true,
      message: "QR created",
      deposit_amount: deposit,
      qr: momo.qrUrl
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================================================
// USER PAYMENT HISTORY
// ======================================================
exports.getUserPayments = async (req, res) => {
  const data = await Payment.getUserPayments(req.user.id);
  res.json(data || []);
};

// ======================================================
// ADMIN – ALL PAYMENTS
// ======================================================
exports.getAllPayments = async (req, res) => {
  const data = await Payment.getAll();
  res.json(data || []);
};

// ======================================================
// MOMO WEBHOOK (THANH TOÁN CỌC)
// ======================================================
exports.paymentWebhook = async (req, res) => {
  try {
    const { orderId, resultCode } = req.body;

    const payment = await Payment.findByTransaction(orderId);
    if (!payment) {
      return res.json({ message: "Payment not found" });
    }

    if (resultCode === 0) {
      await Payment.markDepositPaid(payment.id);
    }

    res.json({ message: "Webhook processed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Webhook error" });
  }
};

// ======================================================
// ADMIN CONFIRM BOOKING
// ======================================================
exports.confirmPayment = async (req, res) => {
  const { payment_id } = req.params;

  const payment = await Payment.findById(payment_id);
  if (!payment) {
    return res.status(404).json({ message: "Payment not found" });
  }

  // set confirmed_at
  await Booking.confirm(payment.booking_id);

  res.json({
    success: true,
    message: "Booking confirmed"
  });
};

// ======================================================
// USER CANCEL BOOKING (THEO LUẬT MỚI)
// ======================================================
exports.refundPayment = async (req, res) => {
  const { booking_id } = req.params;
  const user_id = req.user.id;

  const booking = await Booking.findById(booking_id);
  if (!booking || booking.user_id !== user_id) {
    return res.status(403).json({ message: "Not allowed" });
  }

  const payment = await Payment.findByBookingId(booking_id);
  if (!payment || payment.status !== 'completed') {
    return res.status(400).json({ message: "No valid payment found" });
  }

  // =========================
  // LUẬT DUY NHẤT
  // =========================
  if (booking.confirmed_at) {
    // ❌ ADMIN ĐÃ CONFIRM → MẤT CỌC
    await Payment.forfeit(payment.id);
  } else {
    // ✅ CHƯA CONFIRM → HOÀN CỌC
    await Payment.refund(payment.id);
  }

  await Booking.cancel(booking_id, user_id);

  res.json({
    success: true,
    message: booking.confirmed_at
      ? "Booking cancelled – deposit forfeited"
      : "Booking cancelled – deposit refunded"
  });
};
