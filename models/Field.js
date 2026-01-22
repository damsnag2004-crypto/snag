const { executeQuery } = require('../config/database');
const constants = require('../config/constants');

class Field {

  // ============================================================
  // CREATE FIELD
  // ============================================================
  static async create(fieldData) {
    const {
  name,
  type,
  location,
  latitude = null,
  longitude = null,
  price_per_hour,
  image_url = null,
  description = null,
  status = constants.FIELD_STATUS.AVAILABLE
} = fieldData;


    const result = await executeQuery(
      `INSERT INTO fields (
  name,
  type,
  location,
  latitude,
  longitude,
  price_per_hour,
  image_url,
  description,
  status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
[
  name,
  type,
  location,
  latitude,
  longitude,
  price_per_hour,
  image_url,
  description,
  status
]
    );

    return result.insertId;
  }

  // ============================================================
  // FIND FIELD BY ID
  // ============================================================
  static async findById(id) {
    const rows = await executeQuery(
      `SELECT * FROM fields WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  // ============================================================
  // GET AVAILABLE FIELDS (PAGINATION + TYPE)
  // ============================================================
  static async findAvailable(page = 1, limit = 10, type = 'all') {
    const limitInt = Number(limit) || 10;
    const pageInt = Number(page) || 1;
    const offsetInt = (pageInt - 1) * limitInt;

    let sql = `
      SELECT * FROM fields
      WHERE status = ?
    `;
    const params = [constants.FIELD_STATUS.AVAILABLE];

    if (type !== 'all') {
      sql += ` AND type = ?`;
      params.push(type);
    }

    sql += ` ORDER BY created_at DESC LIMIT ?, ?`;
    params.push(offsetInt, limitInt);

    const fields = await executeQuery(sql, params);

    // COUNT
    let countSql = `
      SELECT COUNT(*) AS total
      FROM fields
      WHERE status = ?
    `;
    const countParams = [constants.FIELD_STATUS.AVAILABLE];

    if (type !== 'all') {
      countSql += ` AND type = ?`;
      countParams.push(type);
    }

    const countResult = await executeQuery(countSql, countParams);

    return {
      fields,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limitInt)
      }
    };
  }

  // ============================================================
  // GET ALL FIELDS (NO PAGINATION)
  // ============================================================
  static async getAllFields({ status = 'all', type = 'all' } = {}) {
    let sql = `SELECT * FROM fields WHERE 1=1`;
    const params = [];

    if (status !== 'all') {
      sql += ` AND status = ?`;
      params.push(status);
    }

    if (type !== 'all') {
      sql += ` AND type = ?`;
      params.push(type);
    }

    sql += ` ORDER BY created_at DESC`;

    return await executeQuery(sql, params);
  }

  // ============================================================
  // GET ALL FIELDS (ADMIN PAGINATION)
  // ============================================================
  static async findAll(page = 1, limit = 10) {
    const limitInt = Number(limit) || 10;
    const pageInt = Number(page) || 1;
    const offsetInt = (pageInt - 1) * limitInt;

    const fields = await executeQuery(
      `SELECT * FROM fields
       ORDER BY created_at DESC
       LIMIT ?, ?`,
      [offsetInt, limitInt]
    );

    const count = await executeQuery(
      `SELECT COUNT(*) AS total FROM fields`
    );

    return {
      fields,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total: count[0].total,
        pages: Math.ceil(count[0].total / limitInt)
      }
    };
  }

  // ============================================================
  // UPDATE FIELD
  // ============================================================
  static async update(id, updateData) {
    const allowedFields = [
  'name',
  'type',
  'location',
  'latitude',
  'longitude',
  'price_per_hour',
  'image_url',
  'description',
  'status'
];


    const updates = [];
    const values = [];

    for (const key of allowedFields) {
      if (key in updateData) {
        updates.push(`${key} = ?`);
        values.push(updateData[key] ?? null);
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);

    await executeQuery(
      `UPDATE fields SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return await this.findById(id);
  }

  // ============================================================
  // DELETE FIELD
  // ============================================================
  static async delete(id) {
    const bookings = await executeQuery(
      `SELECT id FROM bookings
       WHERE field_id = ?
         AND status != ?`,
      [id, constants.BOOKING_STATUS.CANCELLED]
    );

    if (bookings.length > 0) {
      throw new Error('Cannot delete field with active bookings');
    }

    const result = await executeQuery(
      `DELETE FROM fields WHERE id = ?`,
      [id]
    );

    return result.affectedRows > 0;
  }

  // ============================================================
  // CHECK FIELD AVAILABILITY
  // ============================================================
  static async checkAvailability(fieldId, date, startTime, endTime) {
    const rows = await executeQuery(
      `SELECT id FROM bookings
       WHERE field_id = ?
         AND booking_date = ?
         AND status = ?
         AND start_time < ?
         AND end_time > ?`,
      [
        fieldId,
        date,
        constants.BOOKING_STATUS.CONFIRMED,
        endTime,
        startTime
      ]
    );

    return rows.length === 0;
  }

  // ============================================================
  // SEARCH FIELDS (KEYWORD + TYPE)
  // ============================================================
  static async search(keyword, page = 1, limit = 10, type = 'all') {
    const limitInt = Number(limit) || 10;
    const pageInt = Number(page) || 1;
    const offsetInt = (pageInt - 1) * limitInt;
    const term = `%${keyword}%`;

    let sql = `
      SELECT * FROM fields
      WHERE status = ?
        AND (name LIKE ? OR location LIKE ? OR description LIKE ?)
    `;

    const params = [
      constants.FIELD_STATUS.AVAILABLE,
      term, term, term
    ];

    if (type !== 'all') {
      sql += ` AND type = ?`;
      params.push(type);
    }

    sql += ` ORDER BY created_at DESC LIMIT ?, ?`;
    params.push(offsetInt, limitInt);

    const fields = await executeQuery(sql, params);

    // COUNT
    let countSql = `
      SELECT COUNT(*) AS total FROM fields
      WHERE status = ?
        AND (name LIKE ? OR location LIKE ? OR description LIKE ?)
    `;
    const countParams = [
      constants.FIELD_STATUS.AVAILABLE,
      term, term, term
    ];

    if (type !== 'all') {
      countSql += ` AND type = ?`;
      countParams.push(type);
    }

    const totalResult = await executeQuery(countSql, countParams);

    return {
      fields,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total: totalResult[0].total,
        pages: Math.ceil(totalResult[0].total / limitInt)
      }
    };
  }
}

module.exports = Field;
