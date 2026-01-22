const fs = require('fs');
const path = require('path');

const logLevels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLogLevel = process.env.LOG_LEVEL || 'INFO';

const getTimestamp = () => {
  return new Date().toISOString();
};

const ensureLogDirectory = () => {
  const logDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
};

const writeToFile = (level, message, meta = {}) => {
  try {
    const logDir = ensureLogDirectory();
    const logFile = path.join(logDir, 'app.log');
    const timestamp = getTimestamp();
    const logEntry = `${timestamp} [${level}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}\n`;
    
    fs.appendFileSync(logFile, logEntry, 'utf8');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
};

const shouldLog = (level) => {
  return logLevels[level] <= logLevels[currentLogLevel];
};

const logger = {
  error: (message, meta = {}) => {
    if (shouldLog('ERROR')) {
      console.error(`❌ [ERROR] ${message}`, meta);
      writeToFile('ERROR', message, meta);
    }
  },
  
  warn: (message, meta = {}) => {
    if (shouldLog('WARN')) {
      console.warn(`⚠️ [WARN] ${message}`, meta);
      writeToFile('WARN', message, meta);
    }
  },
  
  info: (message, meta = {}) => {
    if (shouldLog('INFO')) {
      console.log(`ℹ️ [INFO] ${message}`, meta);
      writeToFile('INFO', message, meta);
    }
  },
  
  debug: (message, meta = {}) => {
    if (shouldLog('DEBUG')) {
      console.debug(`🐛 [DEBUG] ${message}`, meta);
      writeToFile('DEBUG', message, meta);
    }
  },
  
  http: (message, meta = {}) => {
    if (shouldLog('INFO')) {
      console.log(`🌐 [HTTP] ${message}`, meta);
      writeToFile('HTTP', message, meta);
    }
  }
};

module.exports = logger;