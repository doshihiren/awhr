// Earned-leave balance: employees see their own; owner/HR see everyone and can set a balance.
const router = require('express').Router();
const db     = require('../db/db');
const auth   = require('../middleware/auth');
const leave  = require('../services/leave');
const { getIST } = require('./attendance');

const ledgerFor = async (userId, limit = 60) => {
  const [rows] = await db.query(
    `SELECT l.id, l.entry_date, l.days, l.kind, l.note, u.name AS by_name
     FROM leave_ledger l LEFT JOIN users u ON u.id=l.created_by
     WHERE l.user_id=? ORDER BY l.entry_date DESC, l.id DESC LIMIT ?`, [userId, limit]);
  return rows;
};

// Days this month that will use leave when salary is calculated (so far).
async function monthSoFar(userId) {
  const { date } = getIST();
  const [rows] = await db.query(
    `SELECT status, COUNT(*) AS n FROM attendance WHERE user_id=? AND date BETWEEN ? AND ? GROUP BY status`,
    [userId, `${date.slice(0, 7)}-01`, date]);
  const by = Object.fromEntries(rows.map(r => [r.status, Number(r.n)]));
  const half = (by.half_day || 0) + (by.half_day_first || 0) + (by.half_day_second || 0);
  return { leave: by.leave || 0, absent: by.absent || 0, half, days: (by.leave || 0) + (by.absent || 0) + half * 0.5 };
}

router.get('/my', auth(), async (req, res) => {
  try {
    res.json({
      balance: await leave.balance(req.user.id),
      monthly: leave.MONTHLY_ACCRUAL,
      this_month: await monthSoFar(req.user.id),
      entries: await ledgerFor(req.user.id),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/balances', auth(['owner','hr']), async (req, res) => {
  try {
    const emps = await leave.activeEmployees();
    const out = [];
    for (const e of emps.sort((a, b) => a.name.localeCompare(b.name)))
      out.push({ id: e.id, name: e.name, balance: await leave.balance(e.id), this_month: await monthSoFar(e.id) });
    res.json({ employees: out, monthly: leave.MONTHLY_ACCRUAL, accrual_start: leave.ACCRUAL_START });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/ledger/:userId', auth(['owner','hr']), async (req, res) => {
  try {
    res.json({ balance: await leave.balance(req.params.userId), entries: await ledgerFor(req.params.userId, 200) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/set-balance', auth(['owner','hr']), async (req, res) => {
  try {
    const { user_id, balance, note } = req.body;
    const [[u]] = await db.query("SELECT id,name FROM users WHERE id=? AND role IN ('hr','team')", [user_id]);
    if (!u) return res.status(404).json({ message: 'Employee not found' });
    const b = await leave.setBalance(u.id, Number(balance), note, req.user.id);
    res.json({ message: `${u.name}'s leave balance is now ${b} days` });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

module.exports = router;
