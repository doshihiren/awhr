// Creates the tables used by face-scan attendance. Safe to run on every start.
const db = require('./db');

async function ensureFaceTables() {
  await db.query(`CREATE TABLE IF NOT EXISTS face_profiles (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    descriptor  TEXT NOT NULL,
    photo       MEDIUMTEXT NULL,
    created_by  INT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_face_user (user_id)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS kiosk_devices (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    created_by  INT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen   DATETIME NULL
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS face_scan_logs (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    device_id   INT NULL,
    user_id     INT NULL,
    scan_date   DATE NOT NULL,
    scan_time   TIME NOT NULL,
    action      VARCHAR(20) NOT NULL,
    distance    DECIMAL(5,3) NULL,
    message     VARCHAR(255) NULL,
    photo       MEDIUMTEXT NULL,
    INDEX idx_scan_date (scan_date),
    INDEX idx_scan_user (user_id)
  )`);
  // Keep the database small: drop scan photos older than 90 days.
  await db.query('UPDATE face_scan_logs SET photo=NULL WHERE photo IS NOT NULL AND scan_date < (CURDATE() - INTERVAL 90 DAY)');
}

module.exports = { ensureFaceTables };
