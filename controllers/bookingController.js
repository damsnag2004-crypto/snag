const { Booking, Field, Wallet } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const constants = require('../config/constants');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);


/**
 * ======================================================
 * HELPER: CHECK CAN CANCEL (FIXED)
 * ======================================================
 */
const canCancelBooking = (booking, user) => {
  if (!booking || !user) return false;
  if (booking.status === 'cancelled') return false;

  if (user.role === 'admin') return true;

  if (
    Number(booking.user_id) !== Number(user.id) ||
    booking.status !== 'pending'
  ) return false;

  const now = dayjs().tz('Asia/Ho_Chi_Minh');

  // ⏱ 30 phút sau khi đặt
  const createdAt = dayjs
  .utc(booking.created_at)      // 👈 ÉP UTC TRƯỚC
  .tz('Asia/Ho_Chi_Minh'); 
  if (!createdAt.isValid()) return false;
  if (now.diff(createdAt, 'minute') > 30) return false;

  // ⛔ chưa tới giờ đá
  const bookingDate = dayjs(booking.booking_date)
    .tz('Asia/Ho_Chi_Minh')
    .format('YYYY-MM-DD');

  const startDateTime = dayjs.tz(
    `${bookingDate} ${booking.start_time}`,
    'YYYY-MM-DD HH:mm:ss',
    'Asia/Ho_Chi_Minh'
  );

  if (!startDateTime.isValid()) return false;

  return now.isBefore(startDateTime);
};


/**
 * ======================================================
 * CREATE BOOKING
 * - Check ví
 * - Trừ tiền ngay
 * - Tạo booking PENDING
 * ======================================================
 */
const createBooking = asyncHandler(async (req, res) => {
  const { field_id, booking_date, start_time, end_time } = req.body;
  const user_id = req.user.id;

  // 1️⃣ Check sân
  const field = await Field.findById(field_id);
  if (!field) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy sân'
    });
  }

  if (field.status !== constants.FIELD_STATUS.AVAILABLE) {
    return res.status(400).json({
      success: false,
      message: 'Sân không khả dụng'
    });
  }

  // 2️⃣ Check trùng lịch
  const isAvailable = await Booking.isTimeSlotAvailable(
    field_id,
    booking_date,
    start_time,
    end_time
  );

  if (!isAvailable) {
    return res.status(400).json({
      success: false,
      message: 'Khung giờ đã được đặt'
    });
  }

  // 3️⃣ Tính tiền
  const total_price = await Booking.calculatePrice(
    field_id,
    start_time,
    end_time
  );

  // 4️⃣ Check ví
  const wallet = await Wallet.getByUserId(user_id);
  if (!wallet || wallet.balance < total_price) {
    return res.status(400).json({
      success: false,
      error: 'INSUFFICIENT_BALANCE',
      message: 'Số dư ví không đủ để đặt sân',
      balance: wallet?.balance || 0,
      required: total_price
    });
  }

  // 5️⃣ Trừ tiền ví + ghi transaction
  await Wallet.decreaseBalance(
    user_id,
    total_price,
    'BOOKING',
    null,
    'Đặt sân bóng'
  );

  // 6️⃣ Tạo booking (PENDING – chờ admin duyệt)
  const bookingId = await Booking.create({
    user_id,
    field_id,
    booking_date,
    start_time,
    end_time,
    total_price,
    status: constants.BOOKING_STATUS.PENDING,
    payment_method: 'wallet',
    payment_status: 'paid'
  });

  const booking = await Booking.findByIdForUser(bookingId, user_id);

  res.status(201).json({
  success: true,
  message: 'Đặt sân thành công',
  booking: {
    ...booking,
    json_can_cancel: canCancelBooking(booking, req.user) ? 1 : 0
  },
  notification: {               // 👈 THÊM
    type: 'BOOKING_DEDUCT',
    title: 'Đặt sân thành công',
    body: `Bạn đã bị trừ ${Number(total_price).toLocaleString()}đ từ ví`
  }
});

});

/**
 * ======================================================
 * GET MY BOOKINGS
 * ======================================================
 */
const getMyBookings = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const result = await Booking.findByUserId(req.user.id, page, limit);

  const bookings = (result.bookings || []).map(b => ({
    ...b,
    json_can_cancel: canCancelBooking(b, req.user) ? 1 : 0
  }));

  res.json(bookings);
});

/**
 * ======================================================
 * GET BOOKING BY ID
 * ======================================================
 */
const getBookingById = asyncHandler(async (req, res) => {
  const booking =
  req.user.role === constants.ROLES.ADMIN
    ? await Booking.findById(req.params.id)
    : await Booking.findByIdForUser(req.params.id, req.user.id);

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  if (
    req.user.role !== constants.ROLES.ADMIN &&
    Number(booking.user_id) !== Number(req.user.id)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  res.json({
    ...booking,
    json_can_cancel: canCancelBooking(booking, req.user) ? 1 : 0
  });
});

/**
 * ======================================================
 * CANCEL BOOKING
 * ======================================================
 */
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  // 🔒 Check quyền huỷ
  if (!canCancelBooking(booking, req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền huỷ booking'
    });
  }

  const isAdmin = req.user.role === constants.ROLES.ADMIN;
  const isPending = booking.status === constants.BOOKING_STATUS.PENDING;

  // =============================
  // 🔥 HUỶ + HOÀN TIỀN (CHỈ KHI)
  // - booking PENDING
  // - HOẶC admin huỷ
  // =============================
  if (isPending || isAdmin) {
    await Booking.cancelWithRefund(booking.id);

    return res.json({
      success: true,
      message: 'Huỷ booking thành công – đã hoàn tiền'
    });
  }

  // =============================
  // 🔥 HUỶ KHÔNG HOÀN TIỀN
  // =============================
  await Booking.cancel(booking.id);

  return res.json({
  success: true,
  message: 'Huỷ booking thành công – đã hoàn tiền',
  notification: {               // 👈 THÊM
    type: 'BOOKING_REFUND',
    title: 'Hoàn tiền thành công',
    body: `Số tiền đã được hoàn lại vào ví của bạn`
  }
});

});

/**
 * ======================================================
 * CALCULATE PRICE
 * ======================================================
 */
const calculatePrice = asyncHandler(async (req, res) => {
  const { field_id, start_time, end_time } = req.body;

  const total_price = await Booking.calculatePrice(
    field_id,
    start_time,
    end_time
  );

  res.json({ total_price });
});

/**
 * ======================================================
 * ADMIN - GET ALL BOOKINGS
 * ======================================================
 */
const getAllBookings = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const result = await Booking.findAll(page, limit);

  const bookings = (result.bookings || []).map(b => ({
    ...b,
    json_can_cancel: 1 // admin luôn huỷ được
  }));

  res.json({
    bookings,
    pagination: result.pagination
  });
});

/**
 * ======================================================
 * ADMIN - DASHBOARD
 * ======================================================
 */
const getDashboardData = asyncHandler(async (req, res) => {
  // recent bookings
  const recentResult = await Booking.findAll(1, 5);

  // 👉 LẤY TỔNG ALL (KHÔNG LỌC NGÀY)
  const allStats = await Booking.getStatisticsAll();

  res.json({
    success: true,
    data: {
      overview: {
        today: allStats, // Android đang đọc key này
        week: allStats
      },
      recent_bookings: recentResult.bookings || []
    }
  });
});


module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  calculatePrice,
  getAllBookings,
  getDashboardData 
};  