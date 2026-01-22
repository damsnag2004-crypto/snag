const express = require('express');
const router = express.Router();

const {
  getFields,
  getFieldById,
  checkAvailability
} = require('../controllers/fieldController');

const {
  validateId,
  validatePagination
} = require('../middleware/validation');

// --------------------
// PUBLIC ROUTES
// --------------------

// ✔ Check availability
router.get('/availability/check', checkAvailability);

// ✔ Get list fields (status + type qua query)
router.get('/', validatePagination, getFields);

// ✔ Get field by id
router.get('/:id', validateId, getFieldById);

module.exports = router;
