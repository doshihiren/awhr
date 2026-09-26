const router = require('express').Router();
const db     = require('../db/db');
const auth   = require('../middleware/auth');

// GET EMPLOYEE FULL PROFILE
router.get('/:id/profile', auth(['owner','hr']), async (req, res) => {
  try {
    const [[user]] = await db.query(
      `SELECT u.*,e.*,ed.* FROM users u
       LEFT JOIN employees e ON u.id=e.user_id
       LEFT JOIN employee_details ed ON u.id=ed.user_id
       WHERE u.id=?`, [req.params.id]
    );
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// MY OWN PROFILE
router.get('/my/profile', auth(), async (req, res) => {
  try {
    const [[user]] = await db.query(
      `SELECT u.id,u.name,u.email,u.role,u.avatar,u.phone,
       e.department,e.designation,e.date_of_joining,e.leave_balance,
       ed.date_of_birth,ed.gender,ed.blood_group,ed.personal_email,
       ed.emergency_contact_name,ed.emergency_contact_phone,ed.emergency_contact_relation,
       ed.address,ed.city,ed.state,ed.pincode,
       ed.bank_name,ed.bank_account_number,ed.bank_ifsc,ed.bank_branch,
       ed.probation_end_date,ed.is_on_probation,ed.status
       FROM users u
       LEFT JOIN employees e ON u.id=e.user_id
       LEFT JOIN employee_details ed ON u.id=ed.user_id
       WHERE u.id=?`, [req.user.id]
    );
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// UPDATE EMPLOYEE DETAILS
router.put('/:id/details', auth(['owner','hr']), async (req, res) => {
  try {
    const {
      date_of_birth, gender, blood_group, personal_email,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      address, city, state, pincode,
      aadhar_number, pan_number,
      bank_name, bank_account_number, bank_ifsc, bank_branch,
      probation_end_date, is_on_probation, probation_months
    } = req.body;
    await db.query(
      `INSERT INTO employee_details
       (user_id,date_of_birth,gender,blood_group,personal_email,
        emergency_contact_name,emergency_contact_phone,emergency_contact_relation,
        address,city,state,pincode,aadhar_number,pan_number,
        bank_name,bank_account_number,bank_ifsc,bank_branch,
        probation_end_date,is_on_probation,probation_months)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
       date_of_birth=?,gender=?,blood_group=?,personal_email=?,
       emergency_contact_name=?,emergency_contact_phone=?,emergency_contact_relation=?,
       address=?,city=?,state=?,pincode=?,aadhar_number=?,pan_number=?,
       bank_name=?,bank_account_number=?,bank_ifsc=?,bank_branch=?,
       probation_end_date=?,is_on_probation=?,probation_months=?`,
      [req.params.id,
       date_of_birth,gender,blood_group,personal_email,
       emergency_contact_name,emergency_contact_phone,emergency_contact_relation,
       address,city,state,pincode,aadhar_number,pan_number,
       bank_name,bank_account_number,bank_ifsc,bank_branch,
       probation_end_date,is_on_probation,probation_months,
       date_of_birth,gender,blood_group,personal_email,
       emergency_contact_name,emergency_contact_phone,emergency_contact_relation,
       address,city,state,pincode,aadhar_number,pan_number,
       bank_name,bank_account_number,bank_ifsc,bank_branch,
       probation_end_date,is_on_probation,probation_months]
    );
    res.json({ message: 'Employee details updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// MARK AS RESIGNED
router.post('/:id/resign', auth(['owner','hr']), async (req, res) => {
  try {
    const { resignation_date, last_working_date, resignation_reason } = req.body;
    await db.query(
      `UPDATE employee_details SET resignation_date=?,last_working_date=?,
       resignation_reason=?,status='resigned' WHERE user_id=?`,
      [resignation_date, last_working_date, resignation_reason, req.params.id]
    );
    await db.query(`UPDATE users SET role='team' WHERE id=?`, [req.params.id]);
    res.json({ message: 'Employee marked as resigned' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PROFESSIONAL TAX
router.get('/pt/:month/:year', auth(['owner','hr']), async (req, res) => {
  try {
    const { month, year } = req.params;
    const [emps] = await db.query(
      `SELECT u.id,u.name,u.avatar,e.basic_salary,e.hra,e.other_allowance,
       COALESCE(pt.pt_amount,0) as pt_amount, COALESCE(pt.status,'pending') as pt_status
       FROM users u
       JOIN employees e ON u.id=e.user_id
       LEFT JOIN professional_tax pt ON u.id=pt.user_id AND pt.month=? AND pt.year=?
       WHERE u.role IN ('hr','team')`, [month, year]
    );
    res.json(emps.map(e => ({
      ...e,
      gross: parseFloat(e.basic_salary)+parseFloat(e.hra)+parseFloat(e.other_allowance),
      pt_amount: (parseFloat(e.basic_salary)+parseFloat(e.hra)+parseFloat(e.other_allowance)) > 12000 ? 200 : 0
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/pt/deduct', auth(['owner','hr']), async (req, res) => {
  try {
    const { month, year } = req.body;
    const [emps] = await db.query(
      `SELECT u.id,e.basic_salary,e.hra,e.other_allowance FROM users u
       JOIN employees e ON u.id=e.user_id WHERE u.role IN ('hr','team')`
    );
    for (const e of emps) {
      const gross = parseFloat(e.basic_salary)+parseFloat(e.hra)+parseFloat(e.other_allowance);
      const pt    = gross > 12000 ? 200 : 0;
      await db.query(
        `INSERT INTO professional_tax (user_id,month,year,gross_salary,pt_amount,status)
         VALUES (?,?,?,?,?,'deducted') ON DUPLICATE KEY UPDATE pt_amount=?,status='deducted'`,
        [e.id, month, year, gross, pt, pt]
      );
    }
    res.json({ message: 'Professional tax deducted for all employees' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// REIMBURSEMENTS
router.get('/reimbursements', auth(['owner','hr']), async (req, res) => {
  const [rows] = await db.query(
    `SELECT r.*,u.name,u.avatar FROM reimbursements r JOIN users u ON r.user_id=u.id
     ORDER BY r.created_at DESC`
  );
  res.json(rows);
});

router.post('/reimbursements', auth(), async (req, res) => {
  try {
    const { title, amount, date, category, receipt_description } = req.body;
    await db.query(
      'INSERT INTO reimbursements (user_id,title,amount,date,category,receipt_description) VALUES (?,?,?,?,?,?)',
      [req.user.id, title, amount, date, category, receipt_description]
    );
    res.json({ message: 'Reimbursement request submitted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/reimbursements/:id', auth(['owner','hr']), async (req, res) => {
  try {
    const { status, notes } = req.body;
    await db.query(
      `UPDATE reimbursements SET status=?,approved_by=?,approved_at=NOW(),notes=? WHERE id=?`,
      [status, req.user.id, notes, req.params.id]
    );
    res.json({ message: `Reimbursement ${status}` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
