const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:            process.env.DB_HOST,
  user:            process.env.DB_USER,
  password:        process.env.DB_PASSWORD,
  database:        process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,   // return DATE/DATETIME/TIME as plain strings (no JS Date/timezone shift)
  timezone: 'Z',       // treat stored values as UTC literal, no conversion
});

module.exports = pool;
