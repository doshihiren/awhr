const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db/db');

router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    email = email.trim().toLowerCase();
    password = String(password); // do NOT trim password — spaces could be intentional, but we also never trim on set, so they must match exactly
    const [rows] = await db.query('SELECT * FROM users WHERE email=?', [email]);
    if (!rows.length) return res.status(400).json({ message: 'Invalid credentials' });
    const user  = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign(
      { id:user.id, name:user.name, email:user.email, role:user.role, avatar:user.avatar },
      process.env.JWT_SECRET,
      { expiresIn: '6d' }
    );
    res.json({ token, user:{ id:user.id, name:user.name, email:user.email, role:user.role, avatar:user.avatar } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/me', require('../middleware/auth')(), async (req, res) => {
  const [rows] = await db.query('SELECT id,name,email,role,avatar FROM users WHERE id=?', [req.user.id]);
  if (!rows.length) return res.status(404).json({ message: 'User not found' });
  res.json(rows[0]);
});

// Self-service change password
router.put('/change-password', require('../middleware/auth')(), async (req, res) => {
  try {
    let { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ message: 'Both fields required' });
    new_password = String(new_password);
    if (new_password.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const [[user]] = await db.query('SELECT * FROM users WHERE id=?', [req.user.id]);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const valid = await bcrypt.compare(String(current_password), user.password);
    if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(new_password, 10);
    const [result] = await db.query('UPDATE users SET password=? WHERE id=?', [hashed, req.user.id]);
    if (result.affectedRows === 0) return res.status(500).json({ message: 'Password update failed — user not found' });

    res.json({ message: 'Password changed successfully. Please login again.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
