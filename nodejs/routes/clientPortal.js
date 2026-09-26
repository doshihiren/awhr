const router = require('express').Router();
const db     = require('../db/db');
const auth   = require('../middleware/auth');

// CLIENT DASHBOARD - projects + invoices + messages
router.get('/dashboard', auth(['client']), async (req, res) => {
  try {
    const uid = req.user.id;
    const [projects] = await db.query(
      `SELECT p.*,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id=p.id) as total_tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id=p.id AND t.status='done') as done_tasks
       FROM projects p WHERE p.client_id=? ORDER BY p.created_at DESC`, [uid]);

    const [invoices] = await db.query(
      `SELECT invoice_number,issue_date,due_date,total,amount_paid,balance_due,status,gst_type
       FROM invoices WHERE party_id=(SELECT id FROM parties WHERE user_id=? LIMIT 1)
       ORDER BY created_at DESC LIMIT 10`, [uid]);

    const [messages] = await db.query(
      `SELECT cm.*,u.name as sender_name FROM client_messages cm
       JOIN users u ON cm.sender_id=u.id
       WHERE cm.client_id=? ORDER BY cm.created_at DESC LIMIT 20`, [uid]);

    const [[{ unread }]] = await db.query(
      `SELECT COUNT(*) as unread FROM client_messages WHERE client_id=? AND is_from_client=0 AND is_read=0`, [uid]);

    res.json({ projects, invoices, messages, unread });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// CLIENT PROJECT DETAIL
router.get('/projects/:id', auth(['client']), async (req, res) => {
  try {
    const [[project]] = await db.query(
      'SELECT * FROM projects WHERE id=? AND client_id=?', [req.params.id, req.user.id]);
    if (!project) return res.status(404).json({ message: 'Not found' });

    const [tasks] = await db.query(
      `SELECT t.title,t.status,t.priority,t.due_date,u.name as assigned_to
       FROM tasks t LEFT JOIN users u ON t.assigned_to=u.id
       WHERE t.project_id=? ORDER BY t.due_date ASC`, [req.params.id]);

    const [members] = await db.query(
      `SELECT u.name,u.avatar,pm.role FROM project_members pm
       JOIN users u ON pm.user_id=u.id WHERE pm.project_id=?`, [req.params.id]);

    res.json({ ...project, tasks, members });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// CLIENT MESSAGES - send
router.post('/messages', auth(['client']), async (req, res) => {
  try {
    const { project_id, message } = req.body;
    await db.query(
      'INSERT INTO client_messages (client_id,project_id,sender_id,message,is_from_client) VALUES (?,?,?,?,1)',
      [req.user.id, project_id || null, req.user.id, message]
    );
    // Notify owner/HR
    const [staff] = await db.query(`SELECT id FROM users WHERE role IN ('owner','hr') LIMIT 3`);
    const { createNotification } = require('./notifications');
    for (const s of staff) {
      await createNotification(s.id, `Message from ${req.user.name}`, message.slice(0,100), 'general');
    }
    res.json({ message: 'Message sent' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// REPLY TO CLIENT (owner/hr)
router.post('/messages/reply', auth(['owner', 'hr']), async (req, res) => {
  try {
    const { client_id, project_id, message } = req.body;
    await db.query(
      'INSERT INTO client_messages (client_id,project_id,sender_id,message,is_from_client) VALUES (?,?,?,?,0)',
      [client_id, project_id || null, req.user.id, message]
    );
    res.json({ message: 'Reply sent' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET ALL CLIENT MESSAGES (for owner/hr)
router.get('/messages/all', auth(['owner', 'hr']), async (req, res) => {
  const [rows] = await db.query(
    `SELECT cm.*,u.name as sender_name,c.name as client_name,p.name as project_name
     FROM client_messages cm
     JOIN users u ON cm.sender_id=u.id
     JOIN users c ON cm.client_id=c.id
     LEFT JOIN projects p ON cm.project_id=p.id
     ORDER BY cm.created_at DESC LIMIT 50`
  );
  res.json(rows);
});

// CLIENT INVOICE VIEW (read-only)
router.get('/invoices', auth(['client']), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT i.*,p.name as party_name FROM invoices i
       LEFT JOIN parties p ON i.party_id=p.id
       WHERE p.user_id=? ORDER BY i.created_at DESC`, [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
