const validator = require('validator');
const constants = require('../config/constants');

const validateEmail = (email) => {
  return validator.isEmail(email) && 
         email.length <= constants.VALIDATION.EMAIL_MAX_LENGTH;
};

const validatePhone = (phone) => {
  return validator.isMobilePhone(phone, 'any') && 
         phone.length <= constants.VALIDATION.PHONE_MAX_LENGTH;
};

const validateName = (name) => {
  return typeof name === 'string' && 
         name.trim().length >= 2 && 
         name.length <= constants.VALIDATION.NAME_MAX_LENGTH;
};

const validatePrice = (price) => {
  return !isNaN(price) && 
         parseFloat(price) >= 0 && 
         parseFloat(price) <= 10000000; // 10 million max
};

const validateTime = (time) => {
  return validator.matches(time, /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/);
};

const validateDate = (date) => {
  return validator.isDate(date, { format: 'YYYY-MM-DD', delimiters: ['-'] });
};

const validateURL = (url) => {
  if (!url) return true; // Optional field
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true
  });
};

const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return validator.escape(validator.trim(input));
  }
  return input;
};

const validateTimeSlot = (startTime, endTime) => {
  if (!validateTime(startTime) || !validateTime(endTime)) {
    return false;
  }

  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);
  const hours = (end - start) / (1000 * 60 * 60);

  return hours >= constants.TIME_SLOTS.MIN_BOOKING_HOURS && 
         hours <= constants.TIME_SLOTS.MAX_BOOKING_HOURS;
};

module.exports = {
  validateEmail,
  validatePhone,
  validateName,
  validatePrice,
  validateTime,
  validateDate,
  validateURL,
  sanitizeInput,
  validateTimeSlot
};