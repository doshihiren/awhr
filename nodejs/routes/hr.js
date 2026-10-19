const router = require('express').Router();
const db     = require('../db/db');
const auth   = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { getDayStatus } = require('./attendance');

router.get('/employees', auth(['owner','hr']), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id,u.name,u.email,u.role,u.avatar,u.phone,
             e.department,e.designation,e.date_of_joining,
             e.basic_salary,e.hra,e.other_allowance,e.leave_balance,
             COALESCE(ed.status,'active') as emp_status,
             ed.date_of_birth,ed.gender,ed.blood_group,ed.anniversary_date,ed.is_on_probation
      FROM users u
      LEFT JOIN employees e ON u.id=e.user_id
      LEFT JOIN employee_details ed ON u.id=ed.user_id
      WHERE u.role IN ('hr','team')
      ORDER BY u.name
    `);
    // Salary figures are visible to the owner only
    if (req.user.role !== 'owner') rows.forEach(r => { delete r.basic_salary; delete r.hra; delete r.other_allowance; });
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/employees', auth(['owner','hr']), async (req, res) => {
  try {
    const { name,email,phone,department,designation,date_of_joining } = req.body;
    let { role, basic_salary, hra, other_allowance } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'Name and email are required' });
    if (req.user.role !== 'owner') {           // HR cannot set salary or create owner accounts
      basic_salary = hra = other_allowance = 0;
      if (role === 'owner') role = 'team';
    }
    const hashed  = await bcrypt.hash('password123', 10);
    const initials= name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
    const [result]= await db.query(
      'INSERT INTO users (name,email,password,role,avatar,phone) VALUES (?,?,?,?,?,?)',
      [name, email.trim().toLowerCase(), hashed, role||'team', initials, phone||null]
    );
    await db.query(
      'INSERT INTO employees (user_id,department,designation,date_of_joining,basic_salary,hra,other_allowance) VALUES (?,?,?,?,?,?,?)',
      [result.insertId,department||null,designation||null,date_of_joining||null,basic_salary||0,hra||0,other_allowance||0]
    );
    await db.query('INSERT INTO employee_details (user_id,status) VALUES (?,?) ON DUPLICATE KEY UPDATE status=?',
      [result.insertId,'active','active']);
    res.json({ message:'Employee added', id:result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Email already exists' });
    res.status(500).json({ message: err.message });
  }
});

router.put('/employees/:id', auth(['owner','hr']), async (req, res) => {
  try {
    const { name,email,phone,department,designation,date_of_joining } = req.body;
    let { basic_salary,hra,other_allowance,role } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const [[target]] = await db.query('SELECT role FROM users WHERE id=?', [req.params.id]);
    if (!target) return res.status(404).json({ message: 'Employee not found' });
    if (req.user.role !== 'owner') {
      // HR cannot see or change salary, and cannot touch owner accounts or promote anyone to owner
      if (target.role === 'owner') return res.status(403).json({ message: 'Only the owner can edit this account' });
      if (role === 'owner') role = target.role;
      const [[cur]] = await db.query('SELECT basic_salary,hra,other_allowance FROM employees WHERE user_id=?', [req.params.id]);
      basic_salary = cur?.basic_salary || 0; hra = cur?.hra || 0; other_allowance = cur?.other_allowance || 0;
    }
    await db.query('UPDATE users SET name=?,email=?,phone=?,role=? WHERE id=?',
      [name, (email||'').trim().toLowerCase(), phone||null, role||'team', req.params.id]);
    await db.query(
      `INSERT INTO employees (user_id,department,designation,date_of_joining,basic_salary,hra,other_allowance)
       VALUES (?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE department=?,designation=?,date_of_joining=?,basic_salary=?,hra=?,other_allowance=?`,
      [req.params.id,department||null,designation||null,date_of_joining||null,basic_salary||0,hra||0,other_allowance||0,
       department||null,designation||null,date_of_joining||null,basic_salary||0,hra||0,other_allowance||0]
    );
    res.json({ message:'Employee updated' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Email already exists' });
    res.status(500).json({ message: err.message });
  }
});

// Soft status change — never delete data
router.delete('/employees/:id', auth(['owner']), async (req, res) => {
  try {
    const { action } = req.body; // 'resigned' or 'terminated' or 'active' (reactivate)
    const status = ['resigned','terminated','active'].includes(action) ? action : 'terminated';
    await db.query(
      `INSERT INTO employee_details (user_id,status,resignation_date)
       VALUES (?,?,${status==='active'?'NULL':'CURDATE()'})
       ON DUPLICATE KEY UPDATE status=?,resignation_date=${status==='active'?'NULL':'CURDATE()'}`,
      [req.params.id, status, status]
    );
    res.json({ message: `Employee marked as ${status}` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Reset password — owner or HR can reset any employee's password
router.put('/employees/:id/reset-password', auth(['owner','hr']), async (req, res) => {
  try {
    const { new_password } = req.body;
    if (!new_password || String(new_password).length < 6)
      return res.status(400).json({ message: 'Minimum 6 characters required' });
    const [[u]] = await db.query('SELECT id,role FROM users WHERE id=?', [req.params.id]);
    if (!u) return res.status(404).json({ message: 'Employee not found' });
    if (req.user.role !== 'owner' && u.role === 'owner')
      return res.status(403).json({ message: 'Only the owner can reset the owner password' });
    const hashed = await bcrypt.hash(String(new_password), 10);
    await db.query('UPDATE users SET password=? WHERE id=?', [hashed, req.params.id]);
    res.json({ message: 'Password reset successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// LEAVES
router.get('/leaves', auth(['owner','hr']), async (req, res) => {
  const [rows] = await db.query(`
    SELECT l.*,u.name,u.avatar FROM leave_requests l
    JOIN users u ON l.user_id=u.id ORDER BY l.created_at DESC
  `);
  res.json(rows);
});

router.post('/leaves', auth(), async (req, res) => {
  try {
    const { from_date, to_date, reason } = req.body;
    if (!from_date || !to_date) return res.status(400).json({ message: 'From and to dates required' });
    if (to_date < from_date) return res.status(400).json({ message: 'To date must be on or after the from date' });
    // Only working days count as leave (Sundays, off-Saturdays and holidays are skipped)
    const workDays = [];
    for (const d = new Date(from_date + 'T00:00:00Z'); d <= new Date(to_date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
      const ds = d.toISOString().slice(0, 10);
      if (await getDayStatus(ds) === 'working') workDays.push(ds);
      if (workDays.length > 60) return res.status(400).json({ message: 'Leave can be at most 60 days at a time' });
    }
    if (!workDays.length) return res.status(400).json({ message: 'Those dates are all holidays — no leave needed' });
    const days = workDays.length;
    await db.query(
      'INSERT INTO leave_requests (user_id,leave_type,from_date,to_date,days,reason) VALUES (?,?,?,?,?,?)',
      [req.user.id, 'earned', from_date, to_date, days, reason||null]
    );
    for (const dateStr of workDays) {
      await db.query(
        `INSERT INTO attendance (user_id,date,status,method) VALUES (?,?,'leave','leave_applied')
         ON DUPLICATE KEY UPDATE status='leave',method='leave_applied'`,
        [req.user.id, dateStr]
      );
    }
    res.json({ message:'Leave applied', days });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/leaves/:id', auth(['owner','hr']), async (req, res) => {
  try {
    const { status } = req.body;
    const [[leave]] = await db.query('SELECT * FROM leave_requests WHERE id=?', [req.params.id]);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });
    await db.query('UPDATE leave_requests SET status=?,approved_by=? WHERE id=?',
      [status, req.user.id, req.params.id]);
    // Leave balance is not changed here: leave and absent days are taken from the balance
    // when the month's salary is calculated (see services/payroll.js).
    if (status === 'rejected') {
      const d = new Date(leave.from_date);
      const end = new Date(leave.to_date);
      while (d <= end) {
        await db.query(
          `UPDATE attendance SET status='absent' WHERE user_id=? AND date=? AND method='leave_applied'`,
          [leave.user_id, d.toISOString().split('T')[0]]
        );
        d.setDate(d.getDate()+1);
      }
    }
    res.json({ message:`Leave ${status}` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/payroll', auth(['owner']), async (req, res) => {
  const m = req.query.month || new Date().getMonth()+1;
  const y = req.query.year  || new Date().getFullYear();
  const [rows] = await db.query(`
    SELECT p.*,u.name,u.avatar,e.department FROM payroll p
    JOIN users u ON p.user_id=u.id JOIN employees e ON e.user_id=u.id
    WHERE p.month=? AND p.year=? ORDER BY u.name
  `, [m,y]);
  res.json(rows);
});

router.post('/payroll/process', auth(['owner']), async (req, res) => {
  try {
    const { month, year } = req.body;
    const [emps] = await db.query('SELECT * FROM employees');
    for (const e of emps) {
      const net = parseFloat(e.basic_salary)+parseFloat(e.hra)+parseFloat(e.other_allowance);
      await db.query(
        `INSERT INTO payroll (user_id,month,year,basic,hra,other,net_salary,status)
         VALUES (?,?,?,?,?,?,?,'processed')
         ON DUPLICATE KEY UPDATE status='processed'`,
        [e.user_id,month,year,e.basic_salary,e.hra,e.other_allowance,net]
      );
    }
    res.json({ message:'Payroll processed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Leave is now added automatically (+1.5 on the 1st of every month) — kept so old screens don't break.
router.post('/leaves/accrue', auth(['owner','hr']), async (req, res) => {
  res.json({ message:'Leave is added automatically on the 1st of every month (+1.5 days).' });
});

// PEOPLE — for tagging in projects (employees + clients)
router.get('/people', auth(['owner','hr','team']), async (req, res) => {
  try {
    const [employees] = await db.query(`SELECT id,name,avatar,role FROM users WHERE role IN ('hr','team') ORDER BY name`);
    const [clients]   = await db.query(`SELECT id,name,avatar FROM users WHERE role='client' ORDER BY name`);
    res.json({ employees, clients });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
