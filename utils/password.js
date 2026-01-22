const bcrypt = require('bcryptjs');
require('dotenv').config();

const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

const validatePasswordStrength = (password) => {
  const minLength = 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const issues = [];
  
  if (password.length < minLength) {
    issues.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    issues.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    issues.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    issues.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    issues.push('Password must contain at least one special character');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
};

module.exports = {
  hashPassword,
  comparePassword,
  validatePasswordStrength
};