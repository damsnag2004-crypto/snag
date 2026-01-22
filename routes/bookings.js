const express = require('express');
const router = express.Router();

const {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  calculatePrice
} = require('../controllers/bookingController');


const {
  validateBooking,
  validateId,
  validatePagination
} = require('../middleware/validation');

const { authenticateToken } = require('../middleware/auth');





// ==========================================================
// BOOKING OFFLINE / BOOKING THƯỜNG
// ==========================================================
router.post(
  '/',
  authenticateToken,
  validateBooking,
  createBooking
);


// ==========================================================
// USER GET LIST BOOKING
// ==========================================================
router.get(
  '/my-bookings',
  authenticateToken,
  validatePagination,
  getMyBookings
);


// ==========================================================
// GET BOOKING BY ID
// ==========================================================
router.get(
  '/:id',
  authenticateToken,
  validateId,
  getBookingById
);


// ==========================================================
// CANCEL BOOKING
// ==========================================================
router.put(
  '/:id/cancel',
  authenticateToken,
  validateId,
  cancelBooking
);


// ==========================================================
// TÍNH GIÁ BOOKING
// ==========================================================
router.post(
  '/calculate-price',
  authenticateToken,
  calculatePrice
);

module.exports = router;
