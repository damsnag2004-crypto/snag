const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { initializeDatabase } = require('./utils/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const fieldRoutes = require('./routes/fields');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');

const app = express();

// 👉 Cho phép chạy mạng LAN và điện thoại thật
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; 

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, try again later',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});
app.use(limiter);

// ⭐⭐⭐ CORS – Cho phép Android device thật truy cập
app.use(cors({
  origin: "*",  // DEV MODE — Cho phép toàn bộ domain để Android truy cập
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: logger.stream }));
}

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});
const paymentRoutes = require('./routes/payments');
app.use('/api/payments', paymentRoutes);

app.use('/api/wallet', require('./routes/walletRoutes'));

app.use('/api/admin', require('./routes/adminTopupRoutes'));


// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/fields', fieldRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
// server.js
app.use('/api/admin/revenue', require('./routes/adminRevenue.routes'));

require('./cron/booking.cron');

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) throw new Error('Failed to connect to database');

    await initializeDatabase();

    app.listen(PORT, HOST, () => {
      console.log('\n🎯 Server Started Successfully!');
      console.log(`📍 Local Access:      http://localhost:${PORT}/api`);
      console.log(`📍 Android Emulator:  http://10.0.2.2:${PORT}/api`);
      console.log(`📍 Network Access:    http://192.168.1.13:${PORT}/api`);  // 👉 IP thật của bạn
      console.log(`🌍 Environment:       ${process.env.NODE_ENV}`);
      console.log('\n✅ Backend is ready!\n');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
