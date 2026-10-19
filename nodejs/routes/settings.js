const router = require('express').Router();
const db     = require('../db/db');
const auth   = require('../middleware/auth');
const bcrypt = require('bcryptjs');

router.get('/', auth(), async (req, res) => {
  const [[s]] = await db.query('SELECT * FROM company_settings LIMIT 1');
  res.json(s || {});
});

router.put('/', auth(['owner']), async (req, res) => {
  try {
    const fields = ['company_name','gstin','pan','address','city','state','state_code',
      'pincode','phone','email','bank_name','bank_account','bank_ifsc','bank_branch',
      'smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from',
      'invoice_terms','invoice_notes','signature'];
    const vals = fields.map(f => req.body[f] ?? null);
    await db.query(
      `INSERT INTO company_settings (id,${fields.join(',')}) VALUES (1,${fields.map(()=>'?').join(',')})
       ON DUPLICATE KEY UPDATE ${fields.map(f=>`${f}=?`).join(',')}`,
      [...vals, ...vals]
    );
    res.json({ message: 'Settings saved' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Self change password
router.put('/change-password', auth(), async (req, res) => {
  try {
    let { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ message: 'Both fields required' });
    new_password = String(new_password);
    if (new_password.length < 6) return res.status(400).json({ message: 'Min 6 characters' });
    const [[user]] = await db.query('SELECT * FROM users WHERE id=?', [req.user.id]);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const valid = await bcrypt.compare(String(current_password), user.password);
    if (!valid) return res.status(400).json({ message: 'Current password incorrect' });
    const hashed = await bcrypt.hash(new_password, 10);
    const [result] = await db.query('UPDATE users SET password=? WHERE id=?', [hashed, req.user.id]);
    if (result.affectedRows === 0) return res.status(500).json({ message: 'Update failed — user not found' });
    res.json({ message: 'Password changed. Please login again.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/profile', auth(), async (req, res) => {
  try {
    const { name, phone } = req.body;
    await db.query('UPDATE users SET name=?,phone=? WHERE id=?', [name, phone, req.user.id]);
    res.json({ message: 'Profile updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/users', auth(['owner','hr']), async (req, res) => {
  const [rows] = await db.query(`
    SELECT u.id,u.name,u.email,u.role,u.avatar,u.phone,u.created_at,
    COALESCE(ed.status,'active') as emp_status
    FROM users u LEFT JOIN employee_details ed ON u.id=ed.user_id
    ORDER BY u.created_at DESC
  `);
  res.json(rows);
});

// Owner can update any user — name, email, role, phone
router.put('/users/:id', auth(['owner']), async (req, res) => {
  try {
    const { name, email, role, phone } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'Name and email required' });
    await db.query('UPDATE users SET name=?,email=?,role=?,phone=? WHERE id=?',
      [name, email.trim().toLowerCase(), role, phone||null, req.params.id]);
    res.json({ message: 'User updated' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Email already in use' });
    res.status(500).json({ message: err.message });
  }
});

// Owner/HR reset any user's password — robust
router.put('/users/:id/reset-password', auth(['owner','hr']), async (req, res) => {
  try {
    const { new_password } = req.body;
    if (!new_password || String(new_password).length < 6)
      return res.status(400).json({ message: 'Min 6 characters' });
    const [[u]] = await db.query('SELECT id,role FROM users WHERE id=?', [req.params.id]);
    if (!u) return res.status(404).json({ message: 'User not found' });
    if (req.user.role !== 'owner' && u.role === 'owner')
      return res.status(403).json({ message: 'Only the owner can reset the owner password' });
    const hashed = await bcrypt.hash(String(new_password), 10);
    await db.query('UPDATE users SET password=? WHERE id=?', [hashed, req.params.id]);
    res.json({ message: 'Password reset successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/users/:id/role', auth(['owner']), async (req, res) => {
  await db.query('UPDATE users SET role=? WHERE id=?', [req.body.role, req.params.id]);
  res.json({ message: 'Role updated' });
});

// SERVICES MASTER
router.get('/services', auth(), async (req, res) => {
  const [rows] = await db.query('SELECT * FROM service_items WHERE is_active=1 ORDER BY name');
  res.json(rows);
});
router.post('/services', auth(['owner','hr']), async (req, res) => {
  try {
    const { name,description,hsn_sac_code,unit,default_rate,gst_rate,type } = req.body;
    const [r] = await db.query(
      'INSERT INTO service_items (name,description,hsn_sac_code,unit,default_rate,gst_rate,type) VALUES (?,?,?,?,?,?,?)',
      [name,description,hsn_sac_code,unit||'nos',default_rate||0,gst_rate||18,type||'service']
    );
    res.json({ message:'Service added', id:r.insertId });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
router.put('/services/:id', auth(['owner','hr']), async (req, res) => {
  try {
    const { name,description,hsn_sac_code,unit,default_rate,gst_rate,type,is_active } = req.body;
    await db.query(
      'UPDATE service_items SET name=?,description=?,hsn_sac_code=?,unit=?,default_rate=?,gst_rate=?,type=?,is_active=? WHERE id=?',
      [name,description,hsn_sac_code,unit,default_rate,gst_rate,type,is_active??1,req.params.id]
    );
    res.json({ message:'Updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
router.delete('/services/:id', auth(['owner','hr']), async (req, res) => {
  await db.query('UPDATE service_items SET is_active=0 WHERE id=?', [req.params.id]);
  res.json({ message:'Removed' });
});

module.exports = router;
