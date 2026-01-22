const express = require('express');
const router = express.Router();
const controller = require('../controllers/adminRevenue.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken, authorizeRoles('admin'));

router.get('/weekly', controller.weekly);
router.get('/monthly', controller.monthly);
router.get('/yearly', controller.yearly);
router.get('/compare-month', controller.compareMonth);

module.exports = router;
