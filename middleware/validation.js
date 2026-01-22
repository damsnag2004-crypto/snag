const { body, param, query, validationResult } = require('express-validator');
const constants = require('../config/constants');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Auth validation
const validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: constants.VALIDATION.NAME_MAX_LENGTH })
    .withMessage('Name must be between 2 and 255 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: constants.VALIDATION.PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${constants.VALIDATION.PASSWORD_MIN_LENGTH} characters`),
  body('phone')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Field validation
const validateField = [
  body('name')
    .trim()
    .isLength({ min: 2, max: constants.VALIDATION.FIELD_NAME_MAX_LENGTH })
    .withMessage('Field name must be between 2 and 255 characters'),
  body('location')
    .trim()
    .isLength({ min: 5, max: constants.VALIDATION.LOCATION_MAX_LENGTH })
    .withMessage('Location must be between 5 and 255 characters'),
  body('price_per_hour')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('image_url')
    .optional()
    .isURL()
    .withMessage('Please provide a valid image URL'),
  handleValidationErrors
];

// Booking validation
const validateBooking = [
  body('field_id')
    .isInt({ min: 1 })
    .withMessage('Field ID must be a positive integer'),
  body('booking_date')
    .isDate()
    .withMessage('Please provide a valid booking date'),
  body('start_time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide a valid start time (HH:MM)'),
  body('end_time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide a valid end time (HH:MM)'),
  handleValidationErrors
];

// ID validation
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: constants.PAGINATION.MAX_LIMIT })
    .withMessage(`Limit must be between 1 and ${constants.PAGINATION.MAX_LIMIT}`),
  handleValidationErrors
];
// User validation
const validateUser = [
  body('name')
    .trim()
    .isLength({ min: 2, max: constants.VALIDATION.NAME_MAX_LENGTH })
    .withMessage('Name must be between 2 and 255 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .optional() // optional khi update
    .isLength({ min: constants.VALIDATION.PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${constants.VALIDATION.PASSWORD_MIN_LENGTH} characters`),
  body('role')
    .isIn(Object.values(constants.ROLES))
    .withMessage('Invalid role'),
  handleValidationErrors
];


module.exports = {
  validateRegister,
  validateLogin,
  validateField,
  validateBooking,
  validateId,
  validatePagination,
  validateUser,
  handleValidationErrors
};