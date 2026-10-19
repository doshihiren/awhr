// Earned leave: one leave type, +1.5 days on the 1st of every month (18 a year).
// Balance = SUM(leave_ledger.days). employees.leave_balance is kept in sync for older screens.
const db = require('../db/db');
const { getIST } = require('../routes/attendance');

const MONTHLY_ACCRUAL = 1.5;
const ACCRUAL_START = process.env.LEAVE_ACCRUAL_START || '2026-11'; // first month that gets automatic +1.5

const r2 = n => Math.round(Number(n) * 100) / 100;
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const periodName = p => { const [y, m] = p.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };

// Employees who earn leave / get salary: HR + team, not resigned/terminated.
async function activeEmployees() {
  const [rows] = await db.query(`
    SELECT u.id, u.name, e.date_of_joining, e.leave_balance
    FROM users u JOIN employees e ON e.user_id=u.id
    LEFT JOIN employee_details ed ON ed.user_id=u.id
    WHERE u.role IN ('hr','team') AND COALESCE(ed.status,'active')='active'`);
  return rows;
}

// Current balance. For a payroll month pass { monthEnd, excludeRef }: only entries dated up to the end
// of that month count (so a balance typed in during November doesn't change October's salary).
async function balance(userId, { monthEnd = null, excludeRef = null } = {}) {
  let sql = 'SELECT COALESCE(SUM(days),0) AS b FROM leave_ledger WHERE user_id=?';
  const args = [userId];
  if (monthEnd) { sql += ' AND entry_date<=?'; args.push(monthEnd); }
  if (excludeRef) { sql += ' AND (ref IS NULL OR ref<>?)'; args.push(excludeRef); }
  const [[{ b }]] = await db.query(sql, args);
  return r2(b);
}

async function sync(userId) {
  await db.query(
    'UPDATE employees SET leave_balance=(SELECT COALESCE(SUM(days),0) FROM leave_ledger WHERE user_id=?) WHERE user_id=?',
    [userId, userId]);
}

// First run: carry each employee's existing balance into the ledger as an opening entry.
async function ensureOpeningBalances() {
  const [rows] = await db.query(`
    SELECT e.user_id, e.leave_balance FROM employees e
    WHERE NOT EXISTS (SELECT 1 FROM leave_ledger l WHERE l.user_id=e.user_id)`);
  const { date } = getIST();
  for (const r of rows) {
    await db.query(
      `INSERT IGNORE INTO leave_ledger (user_id,entry_date,days,kind,ref,note) VALUES (?,?,?,?,?,?)`,
      [r.user_id, date, r2(r.leave_balance || 0), 'opening', 'opening', 'Opening balance']);
  }
}

// Owner/HR types the employee's current balance; we store the difference as an adjustment.
async function setBalance(userId, newBalance, note, by) {
  const target = r2(newBalance);
  if (!Number.isFinite(target) || target < 0 || target > 365) throw new Error('Enter a balance between 0 and 365 days');
  const current = await balance(userId);
  const delta = r2(target - current);
  if (delta !== 0) {
    const { date } = getIST();
    await db.query(
      'INSERT INTO leave_ledger (user_id,entry_date,days,kind,note,created_by) VALUES (?,?,?,?,?,?)',
      [userId, date, delta, 'adjust', (note || 'Balance set manually').slice(0, 255), by || null]);
  }
  await sync(userId);
  return target;
}

// Adds +1.5 to every active employee once per month (on or after the 1st). Safe to call often.
async function accrueDue() {
  const { date } = getIST();
  const period = date.slice(0, 7);
  if (period < ACCRUAL_START) return null;
  const [[done]] = await db.query('SELECT period FROM leave_accrual_runs WHERE period=?', [period]);
  if (done) return null;
  const firstDay = `${period}-01`;
  const emps = (await activeEmployees()).filter(e => !e.date_of_joining || String(e.date_of_joining).slice(0, 10) <= firstDay);
  for (const e of emps) {
    await db.query(
      `INSERT IGNORE INTO leave_ledger (user_id,entry_date,days,kind,ref,note) VALUES (?,?,?,?,?,?)`,
      [e.id, firstDay, MONTHLY_ACCRUAL, 'accrual', `accrual:${period}`, `Earned leave for ${periodName(period)}`]);
    await sync(e.id);
  }
  await db.query('INSERT IGNORE INTO leave_accrual_runs (period,employees) VALUES (?,?)', [period, emps.length]);
  return { period, employees: emps.length };
}

module.exports = { MONTHLY_ACCRUAL, ACCRUAL_START, balance, sync, setBalance, accrueDue, ensureOpeningBalances, activeEmployees, periodName, r2 };
