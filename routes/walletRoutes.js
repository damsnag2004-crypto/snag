const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const auth = require('../middleware/auth');

// ================= USER =================
router.get('/balance', auth.authenticateToken, walletController.getBalance);
router.post('/topup', auth.authenticateToken, walletController.createTopup);
router.get('/topups', auth.authenticateToken, walletController.getMyTopups);
// ✅ LỊCH SỬ GIAO DỊCH
router.get(
  '/transactions',
  auth.authenticateToken,
  walletController.getMyTransactions
);
router.post('/book', auth.authenticateToken, walletController.bookFieldWithWallet);


module.exports = router;
