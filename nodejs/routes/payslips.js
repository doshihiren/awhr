// Salary / payslips — OWNER ONLY. HR and employees cannot see any of this.
const router  = require('express').Router();
const db      = require('../db/db');
const auth    = require('../middleware/auth');
const payroll = require('../services/payroll');
const { getIST } = require('./attendance');

const owner = auth(['owner']);
const fail = (res, err) => res.status(err instanceof payroll.PayrollError ? 400 : 500).json({ message: err.message });

router.get('/', owner, async (req, res) => {
  try {
    let { month, year } = req.query;
    if (!month || !year) ({ month, year } = payroll.previousPeriod(getIST().date));
    const [rows] = await db.query(`
      SELECT p.*, u.name, u.avatar, e.department, e.designation
      FROM payslips p JOIN users u ON u.id=p.user_id LEFT JOIN employees e ON e.user_id=u.id
      WHERE p.month=? AND p.year=? ORDER BY u.name`, [month, year]);
    const [[run]] = await db.query('SELECT * FROM payroll_runs WHERE period=?', [payroll.periodOf(month, year)]);
    // Employees with no salary set (they are skipped by the calculation)
    const [noSalary] = await db.query(`
      SELECT u.id,u.name FROM users u JOIN employees e ON e.user_id=u.id
      LEFT JOIN employee_details ed ON ed.user_id=u.id
      WHERE u.role IN ('hr','team') AND COALESCE(ed.status,'active')='active'
        AND COALESCE(e.basic_salary,0)+COALESCE(e.hra,0)+COALESCE(e.other_allowance,0)=0`);
    res.json({ month: Number(month), year: Number(year), run: run || null, slips: rows, no_salary: noSalary });
  } catch (err) { fail(res, err); }
});

router.get('/:id', owner, async (req, res) => {
  try {
    const [[slip]] = await db.query(`
      SELECT p.*, u.name, u.email, u.phone, e.department, e.designation, e.date_of_joining,
             ed.bank_name, ed.bank_account_number, ed.bank_ifsc, ed.pan_number
      FROM payslips p JOIN users u ON u.id=p.user_id
      LEFT JOIN employees e ON e.user_id=u.id LEFT JOIN employee_details ed ON ed.user_id=u.id
      WHERE p.id=?`, [req.params.id]);
    if (!slip) return res.status(404).json({ message: 'Payslip not found' });
    const [[company]] = await db.query('SELECT company_name,address,city,state,pincode,phone,email,gstin,pan,signature FROM company_settings LIMIT 1');
    res.json({ slip, company: company || {} });
  } catch (err) { fail(res, err); }
});

router.post('/generate', owner, async (req, res) => {
  try {
    const r = await payroll.generate(req.body.month, req.body.year, { mode: 'manual' });
    const extra = r.skipped.length ? ` (${r.skipped.length} already paid, not changed)` : '';
    res.json({ message: `Salary calculated for ${r.count} employee${r.count === 1 ? '' : 's'}${extra}` });
  } catch (err) { fail(res, err); }
});

// Bonus / other deduction / remarks for one payslip, then recalculate it
router.put('/:id/adjust', owner, async (req, res) => {
  try {
    const [[s]] = await db.query('SELECT * FROM payslips WHERE id=?', [req.params.id]);
    if (!s) return res.status(404).json({ message: 'Payslip not found' });
    if (s.status === 'paid') return res.status(400).json({ message: 'This payslip is marked paid. Mark it unpaid first to change it.' });
    const bonus = Math.max(0, Number(req.body.bonus) || 0);
    const other = Math.max(0, Number(req.body.other_deduction) || 0);
    const remarks = req.body.remarks ? String(req.body.remarks).slice(0, 255) : null;
    await db.query('UPDATE payslips SET bonus=?,other_deduction=?,remarks=? WHERE id=?', [bonus, other, remarks, s.id]);
    await payroll.generate(s.month, s.year, { mode: 'manual', userId: s.user_id });
    res.json({ message: 'Payslip updated' });
  } catch (err) { fail(res, err); }
});

router.put('/:id/status', owner, async (req, res) => {
  try {
    const paid = req.body.status === 'paid';
    const paidOn = paid ? (req.body.paid_on || getIST().date) : null;
    await db.query('UPDATE payslips SET status=?,paid_on=? WHERE id=?', [paid ? 'paid' : 'generated', paidOn, req.params.id]);
    res.json({ message: paid ? 'Marked as paid' : 'Marked as not paid' });
  } catch (err) { fail(res, err); }
});

router.post('/mark-paid', owner, async (req, res) => {
  try {
    const { month, year } = req.body;
    const paidOn = req.body.paid_on || getIST().date;
    const [r] = await db.query(`UPDATE payslips SET status='paid',paid_on=? WHERE month=? AND year=? AND status<>'paid'`, [paidOn, month, year]);
    res.json({ message: `${r.affectedRows} payslip${r.affectedRows === 1 ? '' : 's'} marked as paid` });
  } catch (err) { fail(res, err); }
});

module.exports = router;
