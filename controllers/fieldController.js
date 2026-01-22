const { Field } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================================
// MULTER CONFIG – UPLOAD ẢNH SÂN
// ============================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/fields';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });
const uploadFieldImage = upload.single('image');

// ============================================================
// GET FIELDS (USER) – FILTER status + type
// ============================================================
const getFields = asyncHandler(async (req, res) => {
  const status = req.query.status || 'available';
  const type = req.query.type || 'all';

  const fields = await Field.getAllFields({ status, type });
  res.json(fields); // Android: List<Field>
});

// ============================================================
// GET FIELD BY ID
// ============================================================
const getFieldById = asyncHandler(async (req, res) => {
  const field = await Field.findById(req.params.id);

  if (!field) {
    return res.status(404).json({ message: 'Field not found' });
  }

  res.json(field);
});

// ============================================================
// CREATE FIELD (ADMIN)
// ============================================================
const createField = asyncHandler(async (req, res) => {
  let {
  name,
  type,
  location,
  latitude,
  longitude,
  price_per_hour,
  description,
  image_url
} = req.body;


  if (!name || !type || !location || !price_per_hour) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  if (req.file) {
    image_url = `/uploads/fields/${req.file.filename}`;
  }

  const fieldId = await Field.create({
  name,
  type,
  location,
  latitude: latitude ?? null,
  longitude: longitude ?? null,
  price_per_hour,
  image_url: image_url ?? null,
  description: description ?? null
});


  const field = await Field.findById(fieldId);

  res.status(201).json({
    success: true,
    message: 'Field created successfully',
    data: field
  });
});

// ============================================================
// UPDATE FIELD (ADMIN)
// ============================================================
const updateField = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let {
  name,
  type,
  location,
  latitude,
  longitude,
  price_per_hour,
  description,
  image_url,
  status
} = req.body;


  const field = await Field.findById(id);
  if (!field) {
    return res.status(404).json({
      success: false,
      message: 'Field not found'
    });
  }

  if (req.file) {
    image_url = `/uploads/fields/${req.file.filename}`;
  }

  const updatedField = await Field.update(id, {
  name,
  type,
  location,
  latitude: latitude ?? null,
  longitude: longitude ?? null,
  price_per_hour,
  image_url: image_url ?? null,
  description: description ?? null,
  status
});


  res.json({
    success: true,
    message: 'Field updated successfully',
    data: updatedField
  });
});

// ============================================================
// DELETE FIELD
// ============================================================
const deleteField = asyncHandler(async (req, res) => {
  const field = await Field.findById(req.params.id);

  if (!field) {
    return res.status(404).json({
      success: false,
      message: 'Field not found'
    });
  }

  await Field.delete(req.params.id);

  res.json({
    success: true,
    message: 'Field deleted successfully'
  });
});

// ============================================================
// CHECK AVAILABILITY (USER)
// ============================================================
const checkAvailability = asyncHandler(async (req, res) => {
  const { field_id, date, start_time, end_time } = req.query;

  if (!field_id || !date || !start_time || !end_time) {
    return res.status(400).json({
      success: false,
      message: 'Missing parameters'
    });
  }

  const available = await Field.checkAvailability(
    field_id,
    date,
    start_time,
    end_time
  );

  res.json({
    success: true,
    data: { available }
  });
});

// ============================================================
// GET ALL FIELDS (ADMIN / ANDROID)
// ============================================================
const getAllFields = asyncHandler(async (req, res) => {
  const status = req.query.status || 'all';
  const type = req.query.type || 'all';

  const fields = await Field.getAllFields({ status, type });
  res.json(fields);
});

module.exports = {
  getFields,
  getFieldById,
  createField,
  updateField,
  deleteField,
  checkAvailability,
  getAllFields,
  uploadFieldImage
};
