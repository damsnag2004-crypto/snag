const { Booking, Wallet } = require('../models');

const autoCancelExpiredBookings = async () => {
  const expiredBookings = await Booking.findExpiredPendingBookings();

  for (const booking of expiredBookings) {
    try {
      // 1️⃣ Hoàn tiền ví
      await Wallet.increaseBalance(
        booking.user_id,
        booking.total_price,
        'REFUND',
        booking.id,
        'Hoàn tiền do quá 30 phút chưa xác nhận'
      );

      // 2️⃣ Update payment_status
      await Booking.updatePaymentStatus(
        booking.id,
        'refunded'
      );

      // 3️⃣ Huỷ booking
      await Booking.autoCancel(booking.id);

      console.log(`⏰ Auto-cancel booking #${booking.id}`);
    } catch (err) {
      console.error(
        `❌ Auto-cancel failed booking #${booking.id}`,
        err
      );
    }
  }
};

module.exports = autoCancelExpiredBookings;
