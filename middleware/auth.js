const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');
const constants = require('../config/constants');


const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required',
      error: 'UNAUTHORIZED'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const users = await executeQuery(
      'SELECT id, email, role, name, phone FROM users WHERE id = ? AND status = "active"',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
        error: 'UNAUTHORIZED'
      });
    }

    // ✅ ÉP KIỂU ID VỀ NUMBER – CỰC KỲ QUAN TRỌNG
    req.user = {
      ...users[0],
      id: Number(users[0].id)
    };

    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token',
      error: 'FORBIDDEN'
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'UNAUTHORIZED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: 'FORBIDDEN'
      });
    }

    next();
  };
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const users = await executeQuery(
      'SELECT id, email, role, name, phone FROM users WHERE id = ? AND status = "active"',
      [decoded.id]
    );

    if (users.length > 0) {
      req.user = {
        ...users[0],
        id: Number(users[0].id) // ✅ ÉP KIỂU Ở ĐÂY LUÔN
      };
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  optionalAuth
};
