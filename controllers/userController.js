// controllers/userController.js
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * ===========================
 * GET ALL USERS (ADMIN)
 * GET /admin/users?page=1&limit=10
 * ===========================
 * ⚠️ TRẢ VỀ ARRAY (FIX Expected BEGIN_ARRAY)
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const result = await User.findAll(page, limit);

  // 🔥 QUAN TRỌNG: trả về array, KHÔNG bọc object
  res.json(result.users);
});

/**
 * ===========================
 * GET USER BY ID (ADMIN)
 * GET /admin/users/:id
 * ===========================
 */
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
      error: 'USER_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: user
  });
});

/**
 * ===========================
 * CREATE USER (ADMIN)
 * POST /admin/users
 * ===========================
 */
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Name, email and password are required'
    });
  }

  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'Email already exists',
      error: 'EMAIL_EXISTS'
    });
  }

  const userId = await User.create({
    name,
    email,
    password,
    phone,
    role
  });

  const newUser = await User.findById(userId);

  res.status(201).json({
    success: true,
    data: newUser
  });
});

/**
 * ===========================
 * UPDATE USER (ADMIN)
 * PUT /admin/users/:id
 * ===========================
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, phone, role } = req.body;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
      error: 'USER_NOT_FOUND'
    });
  }

  const updatedUser = await User.updateProfile(id, {
    name,
    phone,
    role
  });

  res.json({
    success: true,
    data: updatedUser
  });
});

/**
 * ===========================
 * DELETE USER (ADMIN)
 * DELETE /admin/users/:id
 * ===========================
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
      error: 'USER_NOT_FOUND'
    });
  }

  await User.delete(id);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
