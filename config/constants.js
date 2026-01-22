module.exports = {
  // User roles
  ROLES: {
    ADMIN: 'admin',
    USER: 'user'
  },

  // Field status
  FIELD_STATUS: {
    AVAILABLE: 'available',
    MAINTENANCE: 'maintenance'
  },
  FIELD_TYPES: ['5v5', '7v7', '11v11', 'futsal'],


  // Booking status
  BOOKING_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    CANCELLED: 'cancelled'
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  },

  // Validation
  VALIDATION: {
    EMAIL_MAX_LENGTH: 255,
    NAME_MAX_LENGTH: 255,
    PASSWORD_MIN_LENGTH: 6,
    PHONE_MAX_LENGTH: 20,
    FIELD_NAME_MAX_LENGTH: 255,
    LOCATION_MAX_LENGTH: 255
  },

  // Time slots
  TIME_SLOTS: {
    OPENING_HOUR: 6, // 6 AM
    CLOSING_HOUR: 23, // 11 PM
    MIN_BOOKING_HOURS: 1,
    MAX_BOOKING_HOURS: 4
  },

  // Response messages
  MESSAGES: {
    SUCCESS: 'Operation completed successfully',
    NOT_FOUND: 'Resource not found',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    VALIDATION_ERROR: 'Validation failed',
    SERVER_ERROR: 'Internal server error'
  }
};