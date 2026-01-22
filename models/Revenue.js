const { executeQuery } = require('../config/database');

const Revenue = {

  getWeeklyRevenue() {
    return executeQuery(`
      SELECT 
        DATE(booking_date) AS label,
        COUNT(*) AS total_bookings,
        SUM(total_price) AS revenue
      FROM bookings
      WHERE status = 'CONFIRMED'
        AND payment_status = 'paid'
        AND booking_date >= CURDATE() - INTERVAL 6 DAY
      GROUP BY DATE(booking_date)
      ORDER BY label
    `);
  },

  getMonthlyRevenue() {
    return executeQuery(`
      SELECT 
        DATE(booking_date) AS label,
        COUNT(*) AS total_bookings,
        SUM(total_price) AS revenue
      FROM bookings
      WHERE status = 'CONFIRMED'
        AND payment_status = 'paid'
        AND MONTH(booking_date) = MONTH(CURDATE())
        AND YEAR(booking_date) = YEAR(CURDATE())
      GROUP BY DATE(booking_date)
      ORDER BY label
    `);
  },

  getYearlyRevenue() {
    return executeQuery(`
      SELECT 
        MONTH(booking_date) AS label,
        COUNT(*) AS total_bookings,
        SUM(total_price) AS revenue
      FROM bookings
      WHERE status = 'CONFIRMED'
        AND payment_status = 'paid'
        AND YEAR(booking_date) = YEAR(CURDATE())
      GROUP BY MONTH(booking_date)
      ORDER BY label
    `);
  },

  compareThisMonthWithLastMonth() {
    return executeQuery(`
      SELECT
        SUM(CASE 
          WHEN MONTH(booking_date) = MONTH(CURDATE()) 
          THEN total_price ELSE 0 END) AS this_month,
        SUM(CASE 
          WHEN MONTH(booking_date) = MONTH(CURDATE() - INTERVAL 1 MONTH) 
          THEN total_price ELSE 0 END) AS last_month
      FROM bookings
      WHERE status = 'CONFIRMED'
        AND payment_status = 'paid'
    `);
  }

};

module.exports = Revenue;
