const { executeQuery, pool } = require('../config/database');

/**
 * Helper response
 */
const ok = (res, message, data = null, extra = {}) =>
  res.json({ success: true, message, error: null, data, ...extra });

const fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, message, error: message });

/* =====================================================
   USER: LẤY SỐ DƯ VÍ (AUTO CREATE WALLET NẾU CHƯA CÓ)
===================================================== */
exports.getBalance = async (req, res) => {
  const user_id = req.user.id;

  try {
    // đảm bảo ví tồn tại
    await executeQuery(
      `INSERT INTO wallets (user_id, balance)
       VALUES (?, 0)
       ON DUPLICATE KEY UPDATE user_id = user_id`,
      [user_id]
    );

    const [wallet] = await executeQuery(
      `SELECT balance FROM wallets WHERE user_id = ?`,
      [user_id]
    );

    return ok(res, 'Lấy số dư thành công', {
      user: {
        id: user_id,
        balance: wallet.balance
      }
    });
  } catch (err) {
    console.error('❌ getBalance:', err);
    return fail(res, 'Lỗi server', 500);
  }
};

/* =====================================================
   USER: TẠO YÊU CẦU NẠP TIỀN
===================================================== */
exports.createTopup = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { amount, note } = req.body;

    if (!amount || amount <= 0) {
      return fail(res, 'Số tiền không hợp lệ');
    }

    const result = await executeQuery(
      `INSERT INTO wallet_topups (user_id, amount, note, status, created_at)
       VALUES (?, ?, ?, 'PENDING', NOW())`,
      [user_id, amount, note || null]
    );

    return ok(res, 'Tạo yêu cầu nạp tiền thành công', {
      topup_id: result.insertId,
      amount,
      status: 'PENDING'
    });
  } catch (err) {
    console.error('❌ createTopup:', err);
    return fail(res, 'Lỗi server', 500);
  }
};

/* =====================================================
   USER: LẤY DANH SÁCH TOPUP
===================================================== */
exports.getMyTopups = async (req, res) => {
  try {
    const user_id = req.user.id;

    const topups = await executeQuery(
      `SELECT * FROM wallet_topups
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [user_id]
    );

    return ok(res, 'Lấy danh sách topup thành công', { topups });
  } catch (err) {
    console.error('❌ getMyTopups:', err);
    return fail(res, 'Lỗi server', 500);
  }
};

/* =====================================================
   ADMIN: DUYỆT / TỪ CHỐI TOPUP
===================================================== */
exports.approveTopup = async (req, res) => {
  const topup_id = req.params.id;
  const { action, note } = req.body;

  if (!['APPROVE', 'REJECT'].includes(action)) {
    return fail(res, 'Action không hợp lệ');
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 🔒 lock topup
    const [rows] = await conn.query(
      `SELECT * FROM wallet_topups
       WHERE id = ? AND status = 'PENDING'
       FOR UPDATE`,
      [topup_id]
    );

    if (!rows.length) {
      await conn.rollback();
      return fail(res, 'Topup không tồn tại hoặc đã xử lý', 404);
    }

    const { user_id, amount } = rows[0];

    // =================================================
    // ❌ REJECT
    // =================================================
    if (action === 'REJECT') {
      await conn.query(
        `UPDATE wallet_topups
         SET status = 'REJECTED',
             note = ?,
             approved_at = NOW()
         WHERE id = ?`,
        [note || null, topup_id]
      );

      // 🔔 LOG THÔNG BÁO (KHÔNG CỘNG TIỀN)
      await conn.query(
        `INSERT INTO wallet_transactions
         (user_id, amount, type, reference_id, description, created_at)
         VALUES (?, 0, 'TOPUP_REJECT', ?, ?, NOW())`,
        [
          user_id,
          topup_id,
          note
            ? `Nạp tiền bị từ chối: ${note}`
            : 'Nạp tiền bị từ chối'
        ]
      );

      await conn.commit();
      return ok(res, 'Đã từ chối nạp tiền');
    }

    // =================================================
    // ✅ APPROVE
    // =================================================
    await conn.query(
      `UPDATE wallet_topups
       SET status = 'APPROVED',
           approved_at = NOW()
       WHERE id = ?`,
      [topup_id]
    );

    // 🔑 đảm bảo ví tồn tại
    await conn.query(
      `INSERT INTO wallets (user_id, balance)
       VALUES (?, 0)
       ON DUPLICATE KEY UPDATE user_id = user_id`,
      [user_id]
    );

    // ➕ cộng tiền
    await conn.query(
      `UPDATE wallets
       SET balance = balance + ?
       WHERE user_id = ?`,
      [amount, user_id]
    );

    // 🧾 LOG + THÔNG BÁO
    await conn.query(
      `INSERT INTO wallet_transactions
       (user_id, amount, type, reference_id, description, created_at)
       VALUES (?, ?, 'TOPUP', ?, ?, NOW())`,
      [
        user_id,
        amount,
        topup_id,
        `Nạp tiền thành công +${Number(amount).toLocaleString()}đ`
      ]
    );

    await conn.commit();
    return ok(res, 'Duyệt nạp tiền thành công');

  } catch (err) {
    await conn.rollback();
    console.error('❌ approveTopup:', err);
    return fail(res, 'Lỗi server', 500);
  } finally {
    conn.release();
  }
};

/* =====================================================
   USER: ĐẶT SÂN BẰNG VÍ
===================================================== */
exports.bookFieldWithWallet = async (req, res) => {
  const user_id = req.user.id;
  const { field_id, booking_date, start_time, end_time, total_price } = req.body;

  if (!field_id || !booking_date || !start_time || !end_time || !total_price) {
    return fail(res, 'Thiếu dữ liệu đặt sân');
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 🔑 đảm bảo ví tồn tại + LOCK
    const [wallets] = await conn.query(
      `SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE`,
      [user_id]
    );

    if (!wallets.length) {
      await conn.rollback();
      return fail(res, 'Ví không tồn tại', 404);
    }

    const balance = Number(wallets[0].balance);
    const price = Number(total_price);

    if (balance < price) {
      await conn.rollback();
      return fail(res, 'Số dư không đủ');
    }

    // 1️⃣ TRỪ TIỀN
    await conn.query(
      `UPDATE wallets
       SET balance = balance - ?
       WHERE user_id = ?`,
      [price, user_id]
    );

    // 2️⃣ TẠO BOOKING
    const [bookingResult] = await conn.query(
      `INSERT INTO bookings
       (user_id, field_id, booking_date, start_time, end_time,
        total_price, deposit, payment_method, payment_status, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'wallet', 'paid', 'PENDING')`,
      [
        user_id,
        field_id,
        booking_date,
        start_time,
        end_time,
        price,
        price
      ]
    );

    // 3️⃣ LOG GIAO DỊCH (TRỪ TIỀN)
    await conn.query(
      `INSERT INTO wallet_transactions
       (user_id, amount, type, reference_id, description, created_at)
       VALUES (?, ?, 'BOOKING', ?, 'Thanh toán đặt sân', NOW())`,
      [user_id, price, bookingResult.insertId]
    );

    await conn.commit();

    const newBalance = balance - price;

    // 4️⃣ RESPONSE CHUẨN CHO ANDROID
    return ok(
      res,
      `- ${price.toLocaleString()}đ đã được trừ khỏi ví`,
      {
        booking_id: bookingResult.insertId
      },
      {
        wallet: {
          amount: price,
          type: 'booking', // 👈 dùng lowercase cho client
          balance: newBalance
        }
      }
    );

  } catch (err) {
    await conn.rollback();
    console.error('❌ bookFieldWithWallet:', err);
    return fail(res, 'Lỗi server', 500);
  } finally {
    conn.release();
  }
};


/* =====================================================
   USER: LẤY LỊCH SỬ GIAO DỊCH VÍ
===================================================== */
exports.getMyTransactions = async (req, res) => {
  const user_id = req.user.id;

  try {
    const transactions = await executeQuery(
      `SELECT 
         id,
         amount,
         type,
         reference_id,
         description,
         created_at
       FROM wallet_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [user_id]
    );

    return ok(res, 'Lấy lịch sử giao dịch thành công', {
      transactions
    });
  } catch (err) {
    console.error('❌ getMyTransactions:', err);
    return fail(res, 'Lỗi server', 500);
  }
};

