const constants = require('../config/constants');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = { ...err };
  error.message = err.message;

  // MySQL duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    const message = 'Resource already exists';
    error = {
      success: false,
      message,
      error: 'DUPLICATE_ENTRY',
      statusCode: 409
    };
  }

  // MySQL foreign key constraint
  if (err.code === 'ER_NO_REFERENCED_ROW') {
    const message = 'Referenced resource not found';
    error = {
      success: false,
      message,
      error: 'FOREIGN_KEY_CONSTRAINT',
      statusCode: 400
    };
  }

  // MySQL connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
    const message = 'Database connection error';
    error = {
      success: false,
      message,
      error: 'DATABASE_ERROR',
      statusCode: 503
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = {
      success: false,
      message,
      error: 'INVALID_TOKEN',
      statusCode: 401
    };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = {
      success: false,
      message,
      error: 'TOKEN_EXPIRED',
      statusCode: 401
    };
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      success: false,
      message,
      error: 'VALIDATION_ERROR',
      statusCode: 400
    };
  }

  // Cast errors (invalid ID)
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      success: false,
      message,
      error: 'NOT_FOUND',
      statusCode: 404
    };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || constants.MESSAGES.SERVER_ERROR,
    error: error.error || 'SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 handler
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
    error: 'NOT_FOUND'
  });
};

// Async error handler
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler
};