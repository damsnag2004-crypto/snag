const express = require('express');
const router = express.Router();
const {
  getAllBookings,
  updateBookingStatus,
  getStatistics,
  getDashboardData
} = require('../controllers/adminController');
const {
  getAllFields,
  createField,
  updateField,
  deleteField,
  uploadFieldImage // <- middleware multer
} = require('../controllers/fieldController');
const {
  validateId,
  validatePagination,
  validateField
} = require('../middleware/validation');
const {
  authenticateToken,
  authorizeRoles
} = require('../middleware/auth');
const constants = require('../config/constants');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');


const { validateUser } = require('../middleware/validation');

// Admin middleware for all routes
router.use(authenticateToken);
router.use(authorizeRoles(constants.ROLES.ADMIN));

const { 
  getAllTopups, 
  approveTopup 
} = require('../controllers/adminTopupController');

const {
  getAllWallets,
  adjustWallet
} = require('../controllers/adminWalletController'); // controller mới bạn cần tạo

// ----------------------
// Wallet / Topup management
// ----------------------

// GET ALL TOPUPS (Admin view)
router.get('/wallet/topups', getAllTopups);

// APPROVE / REJECT TOPUP
router.put('/wallet/topups/:id', approveTopup);

// GET ALL USERS' WALLET BALANCE
router.get('/wallets', getAllWallets);

// ADJUST USER WALLET (admin cộng/trừ tiền)
router.post('/wallets/:userId/adjust', adjustWallet);

// ----------------------
// Field management
// ----------------------

// GET ALL FIELDS ADMIN
router.get('/fields', validatePagination, getAllFields);

// CREATE FIELD (HỖ TRỢ upload ảnh)
router.post(
  '/fields',
  uploadFieldImage,      // <- multer xử lý file upload
  validateField,         // <- validate các trường bắt buộc
  createField            // <- controller tạo field
);

// UPDATE FIELD (HỖ TRỢ upload ảnh hoặc URL)
router.put(
  '/fields/:id',
  validateId,            // validate :id
  uploadFieldImage,      // multer xử lý file upload, optional
  validateField,         // validate các trường bắt buộc
  updateField            // controller update
);


// DELETE FIELD
router.delete('/fields/:id', validateId, deleteField);

// ----------------------
// Booking management
// ----------------------
router.get('/bookings', validatePagination, getAllBookings);
router.put('/bookings/:id/status', validateId, updateBookingStatus);

// ----------------------
// User management
// ----------------------

// GET ALL USERS
router.get('/users', validatePagination, getAllUsers);

// CREATE USER
router.post('/users', validateUser, createUser);

// UPDATE USER
router.put('/users/:id', validateId, validateUser, updateUser);

// DELETE USER
router.delete('/users/:id', validateId, deleteUser);


// ----------------------
// Statistics and dashboard
// ----------------------
router.get('/statistics', getStatistics);
router.get('/dashboard', getDashboardData);

// ----------------------
// Test simple fields query
// ----------------------
router.get('/fields-simple', async (req, res) => {
  try {
    console.log('🔧 Simple fields route called');
    
    const query = `
      SELECT id, name, location, price_per_hour, image_url, description, status
      FROM fields 
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    const [result] = await db.execute(query);
    console.log('✅ Simple query result:', result.length, 'fields');
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Simple fields error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
});

module.exports = router;
