const router = require('express').Router();
const db     = require('../db/db');
const auth   = require('../middleware/auth');
const bcrypt = require('bcryptjs');

router.get('/employees', auth(['owner','admin','hr']), async (req, res) => {
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
    const safeRows = req.user.role==='hr' ? rows.map(({basic_salary,hra,other_allowance,...rest})=>rest) : rows;
    res.json(safeRows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/employees', auth(['owner','admin']), async (req, res) => {
  try {
    const { name,email,phone,role,department,designation,date_of_joining,basic_salary,hra,other_allowance } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'Name and email are required' });
    const temporaryPassword = require('crypto').randomBytes(15).toString('base64url');
    const hashed = await bcrypt.hash(temporaryPassword, 10);
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
    res.json({ message:'Employee created. Share the generated temporary password securely and ask the employee to change it immediately.', id:result.insertId, temporary_password:temporaryPassword });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Email already exists' });
    res.status(500).json({ message: err.message });
  }
});

router.put('/employees/:id', auth(['owner','admin']), async (req, res) => {
  try {
    const { name,email,phone,department,designation,date_of_joining,basic_salary,hra,other_allowance,role } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
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
    const [[u]] = await db.query('SELECT id FROM users WHERE id=?', [req.params.id]);
    if (!u) return res.status(404).json({ message: 'Employee not found' });
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
    const { leave_type, from_date, to_date, reason } = req.body || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from_date||'') || !/^\d{4}-\d{2}-\d{2}$/.test(to_date||''))
      return res.status(400).json({message:'Valid start and end dates are required'});
    const from = new Date(from_date+'T00:00:00Z'), to = new Date(to_date+'T00:00:00Z');
    const days = Math.round((to-from)/86400000)+1;
    if(!Number.isFinite(days)||days<1||days>90)
      return res.status(400).json({message:'Leave date range must be between 1 and 90 days'});
    await db.query('INSERT INTO leave_requests (user_id,leave_type,from_date,to_date,days,reason) VALUES (?,?,?,?,?,?)',
      [req.user.id,leave_type,from_date,to_date,days,reason||null]);
    // Pending requests must NOT overwrite real check-in/check-out attendance.
    res.json({message:'Leave request submitted for review',days});
  } catch (err) { res.status(500).json({message:'Unable to submit leave request'}); }
});

router.put('/leaves/:id', auth(['owner','admin','hr']), async (req, res) => {
  const status = req.body?.status;
  if (!['approved','rejected'].includes(status))
    return res.status(400).json({message:'Select Approve or Reject'});
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[leave]] = await conn.query('SELECT * FROM leave_requests WHERE id=? FOR UPDATE',[req.params.id]);
    if (!leave) { await conn.rollback();return res.status(404).json({message:'Leave request not found'}); }
    if(leave.status!=='pending') { await conn.rollback();return res.status(409).json({message:'Leave already reviewed; refresh to see the latest status'}); }
    await conn.query('UPDATE leave_requests SET status=?,approved_by=? WHERE id=?',[status,req.user.id,req.params.id]);
    if(status==='approved'){
      // This executes once because the pending check is locked in this transaction.
      await conn.query('UPDATE employees SET leave_balance=leave_balance-? WHERE user_id=?',[leave.days,leave.user_id]);
      const first=new Date(String(leave.from_date).slice(0,10)+'T00:00:00Z');
      const last=new Date(String(leave.to_date).slice(0,10)+'T00:00:00Z');
      for(let d=new Date(first);d<=last;d.setUTCDate(d.getUTCDate()+1)){
        const day=d.toISOString().slice(0,10);
        await conn.query("INSERT INTO attendance (user_id,date,status,method) VALUES (?,?,'leave','leave_approved') ON DUPLICATE KEY UPDATE status=IF(check_in IS NULL AND check_out IS NULL,'leave',status),method=IF(check_in IS NULL AND check_out IS NULL,'leave_approved',method)",[leave.user_id,day]);
      }
    }else{
      // Remove only old pending placeholders, never real punch records.
      await conn.query("DELETE FROM attendance WHERE user_id=? AND date>=? AND date<=? AND method='leave_applied' AND check_in IS NULL AND check_out IS NULL",
        [leave.user_id,leave.from_date,leave.to_date]);
    }
    await conn.commit();res.json({message:'Leave '+status});
  } catch(err){await conn.rollback();res.status(500).json({message:'Unable to review leave request'});}
  finally{conn.release();}
});

router.get('/payroll', auth(['owner','admin']), async (req, res) => {
  const m = req.query.month || new Date().getMonth()+1;
  const y = req.query.year  || new Date().getFullYear();
  const [rows] = await db.query(`
    SELECT p.*,u.name,u.avatar,e.department FROM payroll p
    JOIN users u ON p.user_id=u.id JOIN employees e ON e.user_id=u.id
    WHERE p.month=? AND p.year=? ORDER BY u.name
  `, [m,y]);
  res.json(rows);
});

router.post('/payroll/process', auth(['owner','admin']), async (req, res) => {
  return res.status(409).json({message:'Legacy payroll processing is disabled pending the reviewed attendance-based payroll implementation.'});
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

router.post('/leaves/accrue', auth(['owner','admin']), async (req, res) => {
  return res.status(409).json({message:'Legacy bulk leave accrual is disabled; use the reviewed earned-leave register.'});
  await db.query('UPDATE employees SET leave_balance=LEAST(leave_balance+1.5,18)');
  res.json({ message:'+1.5 days accrued' });
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
