// controllers/authController.js

const { User } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const constants = require('../config/constants');

/**
 * Register a new user
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  // Kiểm tra xem email đã tồn tại chưa
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'User already exists with this email',
      error: 'DUPLICATE_EMAIL'
    });
  }

  // Tạo user mới
  const userId = await User.create({ name, email, password, phone });
  
  // Tạo Wallet cho user mới
  await Wallet.create(userId);
  
  // Lấy thông tin user vừa tạo
  const user = await User.findById(userId);

  // Tạo token
  const token = User.generateAuthToken(user);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        created_at: user.created_at
      },
      token
    }
  });
});

/**
 * Login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Tìm user theo email
  const user = await User.findByEmail(email);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
      error: 'INVALID_CREDENTIALS'
    });
  }

  // Kiểm tra mật khẩu
  const isPasswordValid = await User.verifyPassword(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
      error: 'INVALID_CREDENTIALS'
    });
  }

  // Tạo token
  const token = User.generateAuthToken(user);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        created_at: user.created_at
      },
      token
    }
  });
});

/**
 * Get current user's profile
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
      error: 'USER_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    message: 'Profile retrieved successfully',
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        created_at: user.created_at
      }
    }
  });
});

/**
 * Update user profile (name, phone)
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;

  const updatedUser = await User.updateProfile(req.user.id, { name, phone });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        created_at: updatedUser.created_at
      }
    }
  });
});

/**
 * Change password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;

  try {
    await User.changePassword(req.user.id, current_password, new_password);
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
      error: 'PASSWORD_CHANGE_FAILED'
    });
  }
});

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
};
