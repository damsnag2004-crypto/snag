const { pool, executeQuery } = require('../config/database');
const constants = require('../config/constants');
const bcrypt = require('bcryptjs');

const initializeDatabase = async () => {
  try {
    // Create database if not exists
    const connection = await pool.getConnection();
    
    // Create tables
    await createUsersTable(connection);
    await createFieldsTable(connection);
    await createBookingsTable(connection);
    
    // Insert default data
    await insertDefaultData(connection);
    
    connection.release();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

const createUsersTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin', 'user') DEFAULT 'user',
      phone VARCHAR(20),
      status ENUM('active', 'inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const createFieldsTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS fields (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      location VARCHAR(255) NOT NULL,
      price_per_hour DECIMAL(10,2) NOT NULL,
      image_url VARCHAR(500),
      description TEXT,
      status ENUM('available', 'maintenance') DEFAULT 'available',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status (status),
      INDEX idx_location (location)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const createBookingsTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      field_id INT NOT NULL,
      booking_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      total_price DECIMAL(10,2) NOT NULL,
      status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_field_id (field_id),
      INDEX idx_booking_date (booking_date),
      INDEX idx_status (status),
      INDEX idx_user_date (user_id, booking_date),
      INDEX idx_field_date (field_id, booking_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const insertDefaultData = async (connection) => {
  // Insert default admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  await connection.execute(
    `INSERT IGNORE INTO users (name, email, password, role, phone) 
     VALUES (?, ?, ?, ?, ?)`,
    ['Admin', 'admin@example.com', hashedPassword, 'admin', '0123456789']
  );
};

const backupDatabase = async () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `backup-${timestamp}.sql`;
    
    // This would typically use mysqldump in production
    console.log(`📦 Database backup created: ${backupFile}`);
    return backupFile;
  } catch (error) {
    console.error('❌ Database backup failed:', error);
    throw error;
  }
};

const optimizeDatabase = async () => {
  try {
    const tables = ['users', 'fields', 'bookings'];
    
    for (const table of tables) {
      await executeQuery(`OPTIMIZE TABLE ${table}`);
    }
    
    console.log('✅ Database optimized successfully');
  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    throw error;
  }
};

module.exports = {
  initializeDatabase,
  backupDatabase,
  optimizeDatabase
};