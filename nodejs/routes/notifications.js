const router = require('express').Router();
const db     = require('../db/db');
const auth   = require('../middleware/auth');

// GET MY NOTIFICATIONS
router.get('/', auth(), async (req, res) => {
  const [rows] = await db.query(
    `SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50`,
    [req.user.id]
  );
  res.json(rows);
});

// UNREAD COUNT
router.get('/unread-count', auth(), async (req, res) => {
  const [[{ count }]] = await db.query(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id=? AND is_read=0',
    [req.user.id]
  );
  res.json({ count });
});

// MARK AS READ
router.put('/:id/read', auth(), async (req, res) => {
  await db.query('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  res.json({ message: 'Marked as read' });
});

// MARK ALL READ
router.put('/read-all', auth(), async (req, res) => {
  await db.query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user.id]);
  res.json({ message: 'All marked as read' });
});

// CREATE NOTIFICATION (internal helper - also exported)
async function createNotification(user_id, title, message, type = 'general', action_url = null) {
  try {
    await db.query(
      'INSERT INTO notifications (user_id,title,message,type,action_url) VALUES (?,?,?,?,?)',
      [user_id, title, message, type, action_url]
    );
  } catch (e) { console.error('Notification error:', e.message); }
}

// SEND ANNOUNCEMENT (owner/hr only)
router.post('/announce', auth(['owner', 'hr']), async (req, res) => {
  try {
    const { title, body, target_role } = req.body;
    await db.query('INSERT INTO announcements (title,body,target_role,created_by) VALUES (?,?,?,?)',
      [title, body, target_role || 'all', req.user.id]);
    // Send to all target users
    let users;
    if (target_role === 'all') {
      [users] = await db.query('SELECT id FROM users');
    } else {
      [users] = await db.query('SELECT id FROM users WHERE role=?', [target_role]);
    }
    for (const u of users) {
      await createNotification(u.id, title, body, 'general');
    }
    res.json({ message: `Announcement sent to ${users.length} users` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET ANNOUNCEMENTS
router.get('/announcements', auth(), async (req, res) => {
  const [rows] = await db.query(
    `SELECT a.*,u.name as created_by_name FROM announcements a
     LEFT JOIN users u ON a.created_by=u.id
     WHERE a.is_active=1 AND (a.target_role='all' OR a.target_role=?)
     ORDER BY a.created_at DESC LIMIT 10`,
    [req.user.role]
  );
  res.json(rows);
});

// ADVANCE SALARY
router.get('/advance', auth(['owner', 'hr']), async (req, res) => {
  const [rows] = await db.query(
    `SELECT a.*,u.name,u.avatar FROM advance_salary a JOIN users u ON a.user_id=u.id ORDER BY a.created_at DESC`
  );
  res.json(rows);
});

router.post('/advance', auth(), async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const today = new Date().toISOString().split('T')[0];
    await db.query(
      'INSERT INTO advance_salary (user_id,amount,reason,requested_date) VALUES (?,?,?,?)',
      [req.user.id, amount, reason, today]
    );
    // Notify HR/Owner
    const [hrs] = await db.query(`SELECT id FROM users WHERE role IN ('owner','hr')`);
    for (const h of hrs) {
      await createNotification(h.id, 'Advance Salary Request', `${req.user.name} has requested advance salary of ₹${amount}`, 'payroll');
    }
    res.json({ message: 'Advance salary request submitted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/advance/:id', auth(['owner', 'hr']), async (req, res) => {
  try {
    const { status, recovery_month, recovery_year } = req.body;
    await db.query(
      'UPDATE advance_salary SET status=?,approved_by=?,recovery_month=?,recovery_year=? WHERE id=?',
      [status, req.user.id, recovery_month, recovery_year, req.params.id]
    );
    const [[adv]] = await db.query('SELECT * FROM advance_salary WHERE id=?', [req.params.id]);
    await createNotification(adv.user_id, `Advance Salary ${status}`,
      status === 'approved' ? `Your advance of ₹${adv.amount} has been approved.` : `Your advance request was rejected.`,
      'payroll');
    res.json({ message: `Advance ${status}` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
module.exports.createNotification = createNotification;
