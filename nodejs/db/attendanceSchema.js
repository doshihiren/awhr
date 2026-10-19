// Adds lunch in/out (and the missed-check-out reminder flag) to the attendance table. Safe to run on every start.
const db = require('./db');

async function ensureAttendanceColumns() {
  const [cols] = await db.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='attendance'`);
  const have = new Set(cols.map(c => c.COLUMN_NAME || c.column_name));
  if (!have.has('lunch_out')) await db.query('ALTER TABLE attendance ADD COLUMN lunch_out TIME NULL');
  if (!have.has('lunch_in'))  await db.query('ALTER TABLE attendance ADD COLUMN lunch_in TIME NULL');
  if (!have.has('alerted'))   await db.query('ALTER TABLE attendance ADD COLUMN alerted TINYINT(1) NOT NULL DEFAULT 0');
}

module.exports = { ensureAttendanceColumns };
