const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminTopupController = require('../controllers/adminTopupController');

// ================= ADMIN =================
router.get(
  '/topups',
  auth.authenticateToken,
  auth.authorizeRoles('ADMIN'),
  adminTopupController.getAllTopups
);

router.put(
  '/topups/:id/approve',
  auth.authenticateToken,
  auth.authorizeRoles('ADMIN'),
  adminTopupController.approveTopup
);

router.put(
  '/topups/:id/reject',
  auth.authenticateToken,
  auth.authorizeRoles('ADMIN'),
  adminTopupController.rejectTopup
);

module.exports = router;
