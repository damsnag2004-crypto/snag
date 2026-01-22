const express = require('express');
const router = express.Router();

const {
  createPaymentQRCode,
  getUserPayments,
  getAllPayments,
  paymentWebhook,
  refundPayment          // ✅ THÊM
} = require('../controllers/paymentController');

const { authenticateToken } = require('../middleware/auth');

// ======================================================
// USER
// ======================================================
router.post('/create-qr', authenticateToken, createPaymentQRCode);
router.get('/my-payments', authenticateToken, getUserPayments);

// HUỶ / HOÀN CỌC (backend tự check confirmed hay chưa)
router.post(
  '/refund/:booking_id',
  authenticateToken,
  refundPayment
);

// ======================================================
// ADMIN
// ======================================================
router.get('/admin/all', authenticateToken, getAllPayments);

// ======================================================
// MOMO WEBHOOK
// ======================================================
router.post('/webhook', paymentWebhook);

module.exports = router;
