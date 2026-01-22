// middleware/authAdmin.js
const { authenticateToken, authorizeRoles } = require('./auth');

const authAdmin = async (req, res, next) => {
  // Trước hết xác thực token
  authenticateToken(req, res, function(err) {
    if (err) return next(err);
    // Sau đó phân quyền admin
    authorizeRoles('admin')(req, res, next);
  });
};

module.exports = authAdmin;
