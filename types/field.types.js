/**
 * @typedef {'5v5' | '7v7' | '11v11' | 'futsal'} FieldType
 */

/**
 * @typedef {'AVAILABLE' | 'UNAVAILABLE' | 'MAINTENANCE'} FieldStatus
 */

/**
 * @typedef {Object} CreateFieldPayload
 * @property {string} name
 * @property {FieldType} type
 * @property {string} location
 * @property {number} price_per_hour
 * @property {string=} image_url
 * @property {string=} description
 * @property {FieldStatus=} status
 */

/**
 * @typedef {Object} FieldEntity
 * @property {number} id
 * @property {string} name
 * @property {FieldType} type
 * @property {string} location
 * @property {number} price_per_hour
 * @property {string|null} image_url
 * @property {string|null} description
 * @property {FieldStatus} status
 * @property {string} created_at
 */
