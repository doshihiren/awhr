// Monthly salary calculation. Runs automatically once a month is over (see runDue),
// and the owner can recalculate any month that hasn't been marked paid.
//
// Rules (agreed with the owner):
// - One day's pay = monthly salary ÷ days in that month. Sundays/holidays are paid.
// - Absent day = 1, half day = 0.5, leave day = 1. These come out of the earned-leave balance first;
//   only what the balance can't cover is unpaid (LOP).
// - Days before joining / after the last working day are unpaid and don't use leave.
// - Professional tax ₹200 when earned gross is ₹12,000 or more (Gujarat). Approved salary advances
//   set to be recovered in that month are deducted. Owner can add a bonus or other deduction.
const db = require('../db/db');
const { getIST, getDayStatus } = require('../routes/attendance');
const leave = require('./leave');

const FIRST_AUTO_PERIOD = process.env.PAYROLL_AUTO_START || '2026-10';
const PT_AMOUNT = 200, PT_THRESHOLD = 12000;

const pad = n => String(n).padStart(2, '0');
const r2 = n => Math.round(Number(n) * 100) / 100;
const num = n => Number(n) || 0;

class PayrollError extends Error {}

function periodOf(month, year) { return `${year}-${pad(month)}`; }
function previousPeriod(dateStr) {
  let [y, m] = dateStr.split('-').map(Number);
  m -= 1; if (m === 0) { m = 12; y -= 1; }
  return { month: m, year: y };
}

async function generate(month, year, { mode = 'manual', userId = null } = {}) {
  month = Number(month); year = Number(year);
  if (!(month >= 1 && month <= 12) || !(year >= 2020 && year <= 2100)) throw new PayrollError('Choose a valid month');
  const period = periodOf(month, year);
  const D = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = `${period}-01`, monthEnd = `${period}-${pad(D)}`;
  const { date: today } = getIST();
  if (monthEnd >= today) throw new PayrollError(`${leave.periodName(period)} is not over yet — salary can be calculated from ${nextDayLabel(monthEnd)}`);

  // People employed at any point in the month
  const [emps] = await db.query(`
    SELECT u.id, u.name, e.date_of_joining, e.basic_salary, e.hra, e.other_allowance,
           COALESCE(ed.status,'active') AS emp_status, ed.last_working_date, ed.resignation_date
    FROM users u JOIN employees e ON e.user_id=u.id
    LEFT JOIN employee_details ed ON ed.user_id=u.id
    WHERE u.role IN ('hr','team') ${userId ? 'AND u.id=?' : ''}`, userId ? [userId] : []);

  const dayStatus = {};
  for (let d = 1; d <= D; d++) { const ds = `${period}-${pad(d)}`; dayStatus[ds] = await getDayStatus(ds); }

  const [attRows] = await db.query(
    'SELECT user_id, date, status FROM attendance WHERE date BETWEEN ? AND ?', [monthStart, monthEnd]);
  const att = {};
  for (const r of attRows) (att[r.user_id] = att[r.user_id] || {})[String(r.date).slice(0, 10)] = r.status;

  const [advRows] = await db.query(
    `SELECT user_id, COALESCE(SUM(amount),0) AS amt FROM advance_salary
     WHERE status='approved' AND recovery_month=? AND recovery_year=? GROUP BY user_id`, [month, year]);
  const advance = Object.fromEntries(advRows.map(r => [r.user_id, num(r.amt)]));

  const [existingRows] = await db.query('SELECT * FROM payslips WHERE month=? AND year=?', [month, year]);
  const existing = Object.fromEntries(existingRows.map(r => [r.user_id, r]));

  let count = 0; const skipped = [];
  for (const e of emps) {
    const doj = e.date_of_joining ? String(e.date_of_joining).slice(0, 10) : null;
    const lastDay = e.emp_status !== 'active' ? String(e.last_working_date || e.resignation_date || '').slice(0, 10) || null : null;
    if (doj && doj > monthEnd) continue;                       // joined after this month
    if (lastDay && lastDay < monthStart) continue;             // left before this month
    const prev = existing[e.id];
    if (prev && prev.status === 'paid') { skipped.push(e.name); continue; }
    const fixed = num(e.basic_salary) + num(e.hra) + num(e.other_allowance);
    if (fixed <= 0) continue;                                  // no salary set — owner fills it in HR

    const c = { working: 0, present: 0, half: 0, leave: 0, absent: 0, holiday: 0, notEmployed: 0 };
    const mine = att[e.id] || {};
    for (let d = 1; d <= D; d++) {
      const ds = `${period}-${pad(d)}`;
      if ((doj && ds < doj) || (lastDay && ds > lastDay)) { c.notEmployed++; continue; }
      if (dayStatus[ds] === 'holiday') { c.holiday++; continue; }
      c.working++;
      const st = mine[ds];
      if (st === 'present') c.present++;
      else if (st && st.startsWith('half_day')) c.half++;
      else if (st === 'leave') c.leave++;
      else if (st === 'holiday') c.holiday++, c.working--;
      else c.absent++;                                         // absent, or no check-in at all
    }

    const unpaid = r2(c.absent + c.leave + c.half * 0.5);
    const ref = `payroll:${period}`;
    const opening = await leave.balance(e.id, { monthEnd, excludeRef: ref });
    const leaveUsed = r2(Math.min(Math.max(opening, 0), unpaid));
    const lop = r2(unpaid - leaveUsed + c.notEmployed);
    const paidDays = r2(D - lop);

    const ratio = paidDays / D;
    const earned_basic = Math.round(num(e.basic_salary) * ratio);
    const earned_hra = Math.round(num(e.hra) * ratio);
    const earned_other = Math.round(num(e.other_allowance) * ratio);
    const bonus = num(prev?.bonus);
    const other_deduction = num(prev?.other_deduction);
    const gross = earned_basic + earned_hra + earned_other + bonus;
    const pt = gross >= PT_THRESHOLD ? PT_AMOUNT : 0;
    const adv = advance[e.id] || 0;
    const totalDed = pt + adv + other_deduction;
    const net = Math.max(0, Math.round(gross - totalDed));

    // Leave ledger: replace this month's "used" entry
    await db.query('DELETE FROM leave_ledger WHERE user_id=? AND ref=?', [e.id, ref]);
    if (leaveUsed > 0) {
      const bits = [c.absent && `${c.absent} absent`, c.leave && `${c.leave} leave`, c.half && `${c.half} half day${c.half > 1 ? 's' : ''}`].filter(Boolean).join(', ');
      await db.query(
        'INSERT INTO leave_ledger (user_id,entry_date,days,kind,ref,note) VALUES (?,?,?,?,?,?)',
        [e.id, monthEnd, -leaveUsed, 'used', ref, `Used in ${leave.periodName(period)} (${bits})`]);
    }
    await leave.sync(e.id);

    const row = {
      user_id: e.id, month, year, days_in_month: D, working_days: c.working, present_days: c.present, half_days: c.half,
      leave_days: c.leave, absent_days: c.absent, holidays: c.holiday, not_employed_days: c.notEmployed,
      unpaid_days: unpaid, leave_used: leaveUsed, lop_days: lop, paid_days: paidDays,
      basic: num(e.basic_salary), hra: num(e.hra), other_allowance: num(e.other_allowance),
      earned_basic, earned_hra, earned_other, bonus, gross_earned: gross, pt, advance: adv, other_deduction,
      total_deductions: totalDed, net_pay: net, leave_opening: opening, leave_closing: r2(opening - leaveUsed),
      remarks: prev?.remarks || null, status: 'generated',
    };
    const cols = Object.keys(row);
    await db.query(
      `INSERT INTO payslips (${cols.join(',')},generated_at) VALUES (${cols.map(() => '?').join(',')},NOW())
       ON DUPLICATE KEY UPDATE ${cols.filter(k => !['user_id', 'month', 'year'].includes(k)).map(k => `${k}=VALUES(${k})`).join(',')},generated_at=NOW()`,
      cols.map(k => row[k]));
    count++;
  }

  if (!userId) {
    await db.query(
      `INSERT INTO payroll_runs (period,mode,employees) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE mode=VALUES(mode),employees=VALUES(employees),generated_at=NOW()`, [period, mode, count]);
  }
  return { period, count, skipped };
}

function nextDayLabel(monthEnd) {
  const d = new Date(monthEnd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).split('-').reverse().join('/');
}

// Called on startup and regularly: accrue this month's leave, and calculate last month's salary once.
let running = false, lastRun = 0, ready = false;
const setReady = () => { ready = true; };
async function runDue({ force = false } = {}) {
  if (!ready || running || (!force && Date.now() - lastRun < 10 * 60 * 1000)) return;
  running = true; lastRun = Date.now();
  try {
    await leave.accrueDue();
    const { date } = getIST();
    const { month, year } = previousPeriod(date);
    const period = periodOf(month, year);
    if (period >= FIRST_AUTO_PERIOD) {
      const [[done]] = await db.query('SELECT period FROM payroll_runs WHERE period=?', [period]);
      if (!done) {
        const r = await generate(month, year, { mode: 'auto' });
        console.log(`✅ Salary calculated for ${period}: ${r.count} employees`);
      }
    }
  } catch (err) {
    console.error('⚠️ Monthly leave/salary job failed:', err.message);
  } finally { running = false; }
}

module.exports = { generate, runDue, setReady, PayrollError, periodOf, previousPeriod };
