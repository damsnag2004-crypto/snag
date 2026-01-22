const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById
} = require('../controllers/userController');
const {
  authenticateToken,
  authorizeRoles
} = require('../middleware/auth');
const {
  validateId,
  validatePagination
} = require('../middleware/validation');
const constants = require('../config/constants');

// Admin only routes
router.get(
  '/',
  authenticateToken,
  authorizeRoles(constants.ROLES.ADMIN),
  validatePagination,
  getAllUsers
);

router.get(
  '/:id',
  authenticateToken,
  authorizeRoles(constants.ROLES.ADMIN),
  validateId,
  getUserById
);

module.exports = router;