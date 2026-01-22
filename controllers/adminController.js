const { Booking, User } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const constants = require('../config/constants');
const { executeQuery } = require('../config/database');

// ==================== GET ALL BOOKINGS ====================
const getAllBookings = asyncHandler(async (req, res) => {
  const pageNum = Number(req.query.page) || 1;
  const limitNum = Number(req.query.limit) || 10;
  const filters = {};

  if (req.query.status) filters.status = req.query.status;
  if (req.query.field_id) filters.field_id = req.query.field_id;
  if (req.query.user_id) filters.user_id = req.query.user_id;
  if (req.query.date_from) filters.date_from = req.query.date_from;
  if (req.query.date_to) filters.date_to = req.query.date_to;

  try {
    const result = await Booking.findAll(pageNum, limitNum);
res.json(result.bookings || []);

  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json([]);
  }
});

// ==================== UPDATE BOOKING STATUS ====================
// ==================== UPDATE BOOKING STATUS ====================
const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const bookingId = req.params.id;

  if (req.user.role !== constants.ROLES.ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ admin mới được thao tác'
    });
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  if (status === 'confirmed') {
    await Booking.confirm(bookingId);
  }
  else if (status === 'cancelled') {
    await Booking.cancelWithRefund(bookingId);
  }
  else {
    return res.status(400).json({
      success: false,
      message: 'Trạng thái không hợp lệ'
    });
  }

  res.json({
    success: true,
    message:
      status === 'confirmed'
        ? 'Xác nhận booking thành công'
        : 'Từ chối booking – đã hoàn tiền'
  });
});

// ==================== GET STATISTICS ====================
const getStatistics = asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;

  try {
    const bookingStats = await Booking.getStatisticsAll();

    const users = await User.findAll();
    const totalUsers = users.length;
    const totalAdmins = users.filter(u => u.role === constants.ROLES.ADMIN).length;

    const fieldStatsQuery = `
      SELECT 
        COUNT(*) AS total_fields,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available_fields,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) AS maintenance_fields
      FROM fields
    `;
    const fieldStats = (await executeQuery(fieldStatsQuery))[0];

    res.json({
      success: true,
      message: 'Statistics retrieved successfully',
      data: {
        bookings: bookingStats,
        users: {
          total: totalUsers,
          admins: totalAdmins,
          regular_users: totalUsers - totalAdmins
        },
        fields: fieldStats,
        period
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics',
      error: error.message
    });
  }
});

// ==================== DASHBOARD DATA ====================
const getDashboardData = asyncHandler(async (req, res) => {
  try {
    // 1️⃣ 5 booking mới nhất
    const { bookings: recentBookings } = await Booking.findAll(1, 5);

    // 2️⃣ Booking + doanh thu (FIX CHỮ THƯỜNG)
    const [bookingStats] = await executeQuery(`
      SELECT
        COUNT(*) AS total_bookings,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_bookings,
        IFNULL(
          SUM(CASE WHEN status = 'confirmed' THEN total_price ELSE 0 END),
          0
        ) AS total_revenue
      FROM bookings
    `);

    // 3️⃣ Tổng users
    const [userStats] = await executeQuery(`
      SELECT COUNT(*) AS total_users FROM users
    `);

    // 4️⃣ Tổng fields
    const [fieldStats] = await executeQuery(`
      SELECT COUNT(*) AS total_fields FROM fields
    `);

    res.json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: {
        total_users: userStats.total_users,
        total_fields: fieldStats.total_fields,
        overview: {
          today: bookingStats,
          week: bookingStats
        },
        recent_bookings: recentBookings || []
      }
    });
  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard data',
      error: error.message
    });
  }
});

module.exports = {
  getAllBookings,
  updateBookingStatus,
  getStatistics,
  getDashboardData
};
