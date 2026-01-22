const cron = require('node-cron');
const { autoCancelExpiredBookings } = require('../services/bookingAutoCancel.service');

cron.schedule('*/5 * * * *', async () => {
  try {
    const result = await autoCancelExpiredBookings();
    if (result.cancelled > 0) {
      console.log(`⏰ Auto cancelled ${result.cancelled} bookings`);
    }
  } catch (err) {
    console.error('Cron auto cancel error:', err.message);
  }
});
