const Revenue = require('../models/Revenue');

module.exports = {

  // 📊 Biểu đồ cột – tuần
  async weekly(req, res) {
    try {
      const rows = await Revenue.getWeeklyRevenue();

      res.json({
        success: true,
        type: 'bar',
        labels: rows.map(r => r.label),
        data: rows.map(r => Number(r.revenue))
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Lỗi tải doanh thu tuần' });
    }
  },

  // 📊 Biểu đồ cột – tháng
  async monthly(req, res) {
    try {
      const rows = await Revenue.getMonthlyRevenue();

      res.json({
        success: true,
        type: 'bar',
        labels: rows.map(r => r.label),
        data: rows.map(r => Number(r.revenue))
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Lỗi tải doanh thu tháng' });
    }
  },

  // 🥧 Biểu đồ tròn – năm
  async yearly(req, res) {
    try {
      const rows = await Revenue.getYearlyRevenue();

      res.json({
        success: true,
        type: 'pie',
        labels: rows.map(r => `Tháng ${r.label}`),
        data: rows.map(r => Number(r.revenue))
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Lỗi tải doanh thu năm' });
    }
  },

  // 🔥 So sánh tháng này vs tháng trước
  async compareMonth(req, res) {
    try {
      const [row] = await Revenue.compareThisMonthWithLastMonth();

      res.json({
        success: true,
        this_month: Number(row?.this_month || 0),
        last_month: Number(row?.last_month || 0),
        growth_percent: row?.last_month
          ? (((row.this_month - row.last_month) / row.last_month) * 100).toFixed(1)
          : 100
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Lỗi so sánh tháng' });
    }
  }

};
