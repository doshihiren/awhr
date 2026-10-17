const router = require('express').Router();
const db     = require('../db/db');
const auth   = require('../middleware/auth');

async function notify(user_id, title, message, type='task', action_url=null) {
  try {
    await db.query('INSERT INTO notifications (user_id,title,message,type,action_url) VALUES (?,?,?,?,?)',
      [user_id, title, message, type, action_url]);
  } catch (e) {}
}

// GET ALL TASKS
router.get('/', auth(), async (req, res) => {
  try {
    const uid  = req.user.id;
    const role = req.user.role;
    let query = `SELECT t.*,p.name as project_name,
      u.name as assigned_name, u.avatar as assigned_avatar,
      g.name as given_by_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id=p.id
      LEFT JOIN users u ON t.assigned_to=u.id
      LEFT JOIN users g ON t.assigned_by=g.id`;
    const params = [];
    if (role === 'team') { query += ' WHERE t.assigned_to=? OR t.assigned_by=?'; params.push(uid, uid); }
    query += ' ORDER BY FIELD(t.status,"in_progress","review","todo","done"), t.due_date ASC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET SINGLE TASK
router.get('/:id', auth(), async (req, res) => {
  try {
    const [[task]] = await db.query(`
      SELECT t.*,p.name as project_name,
        u.name as assigned_name, u.avatar as assigned_avatar,
        g.name as given_by_name, g.id as given_by_id
      FROM tasks t
      LEFT JOIN projects p ON t.project_id=p.id
      LEFT JOIN users u ON t.assigned_to=u.id
      LEFT JOIN users g ON t.assigned_by=g.id
      WHERE t.id=?`, [req.params.id]);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// CREATE TASK — notifies assignee, auto-tags them onto the project
router.post('/', auth(['owner','hr','team']), async (req, res) => {
  try {
    const { title, description, project_id, assigned_to, priority, due_date, due_time, estimated_hours } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });
    const [r] = await db.query(
      `INSERT INTO tasks (title,description,project_id,assigned_to,assigned_by,priority,due_date,due_time,estimated_hours,status)
       VALUES (?,?,?,?,?,?,?,?,?,'todo')`,
      [title, description||null, project_id||null, assigned_to||null, req.user.id, priority || 'medium', due_date||null, due_time || null, estimated_hours || null]
    );
    // Auto-tag the assignee as a project member so the project shows up in their list
    if (project_id && assigned_to) {
      await db.query('INSERT IGNORE INTO project_members (project_id,user_id,role) VALUES (?,?,?)', [project_id, assigned_to, 'member']).catch(()=>{});
    }
    if (assigned_to) {
      await notify(assigned_to, 'New Task Assigned', `${req.user.name} assigned you: "${title}"`, 'task', '/tasks');
    }
    res.json({ message: 'Task created', id: r.insertId });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// UPDATE TASK (basic fields - TL/HR/Owner)
router.put('/:id', auth(['owner','hr','team']), async (req, res) => {
  try {
    const { title, description, priority, due_date, due_time, estimated_hours, assigned_to, project_id } = req.body;
    await db.query(
      `UPDATE tasks SET title=?,description=?,priority=?,due_date=?,due_time=?,estimated_hours=?,assigned_to=?,project_id=? WHERE id=?`,
      [title, description||null, priority, due_date||null, due_time || null, estimated_hours || null, assigned_to||null, project_id||null, req.params.id]
    );
    res.json({ message: 'Task updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// START TASK — todo -> in_progress (employee starts work)
router.post('/:id/start', auth(), async (req, res) => {
  try {
    const [[task]] = await db.query('SELECT * FROM tasks WHERE id=?', [req.params.id]);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.assigned_to !== req.user.id && !['owner','hr'].includes(req.user.role))
      return res.status(403).json({ message: 'Only the assignee can start this task' });
    await db.query(`UPDATE tasks SET status='in_progress' WHERE id=?`, [req.params.id]);
    if (task.assigned_by) await notify(task.assigned_by, 'Task Started', `"${task.title}" is now In Progress`, 'task', '/tasks');
    res.json({ message: 'Task started' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// MARK AS DONE (employee marks their own work done) -> review
router.post('/:id/mark-done', auth(), async (req, res) => {
  try {
    const { completion_note, actual_hours } = req.body;
    const [[task]] = await db.query('SELECT * FROM tasks WHERE id=?', [req.params.id]);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.assigned_to !== req.user.id && !['owner','hr'].includes(req.user.role))
      return res.status(403).json({ message: 'You can only mark your own tasks as done' });
    await db.query(
      `UPDATE tasks SET status='review', completion_note=?, actual_hours=?,
       marked_done_at=NOW(), marked_done_by=? WHERE id=?`,
      [completion_note||null, actual_hours || null, req.user.id, req.params.id]
    );
    await db.query('INSERT INTO task_comments (task_id,user_id,comment) VALUES (?,?,?)',
      [req.params.id, req.user.id, `Marked as done. ${completion_note || ''}`]);
    if (task.assigned_by) await notify(task.assigned_by, 'Task Awaiting Review', `${req.user.name} marked "${task.title}" as done — please review`, 'task', '/tasks');
    res.json({ message: 'Task marked as done — awaiting review' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// CLOSE/COMPLETE TASK (only task giver, TL, HR, Owner) -> done
router.post('/:id/close', auth(['owner','hr','team']), async (req, res) => {
  try {
    const [[task]] = await db.query('SELECT * FROM tasks WHERE id=?', [req.params.id]);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.assigned_by !== req.user.id && !['owner','hr'].includes(req.user.role))
      return res.status(403).json({ message: 'Only the task giver can close this task' });
    const { close_note } = req.body;
    await db.query(`UPDATE tasks SET status='done', closed_at=NOW(), closed_by=? WHERE id=?`, [req.user.id, req.params.id]);
    if (close_note) {
      await db.query('INSERT INTO task_comments (task_id,user_id,comment) VALUES (?,?,?)',
        [req.params.id, req.user.id, `Task closed: ${close_note}`]);
    }
    if (task.assigned_to) await notify(task.assigned_to, 'Task Completed ✅', `"${task.title}" has been approved and closed`, 'task', '/tasks');
    res.json({ message: 'Task closed and completed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// REOPEN TASK — back to in_progress
router.post('/:id/reopen', auth(['owner','hr','team']), async (req, res) => {
  try {
    const [[task]] = await db.query('SELECT * FROM tasks WHERE id=?', [req.params.id]);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.assigned_by !== req.user.id && !['owner','hr'].includes(req.user.role))
      return res.status(403).json({ message: 'Only task giver can reopen' });
    const { reason } = req.body;
    await db.query(`UPDATE tasks SET status='in_progress', closed_at=NULL, closed_by=NULL WHERE id=?`, [req.params.id]);
    await db.query('INSERT INTO task_comments (task_id,user_id,comment) VALUES (?,?,?)',
      [req.params.id, req.user.id, `Reopened: ${reason || 'Needs more work'}`]);
    if (task.assigned_to) await notify(task.assigned_to, 'Task Reopened', `"${task.title}" needs more work: ${reason||''}`, 'task', '/tasks');
    res.json({ message: 'Task reopened' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// COMMENTS
router.get('/:id/comments', auth(), async (req, res) => {
  const [rows] = await db.query(
    `SELECT c.*,u.name,u.avatar FROM task_comments c JOIN users u ON c.user_id=u.id
     WHERE c.task_id=? ORDER BY c.created_at ASC`, [req.params.id]
  );
  res.json(rows);
});

router.post('/:id/comments', auth(), async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment?.trim()) return res.status(400).json({ message: 'Comment cannot be empty' });
    const [[task]] = await db.query('SELECT * FROM tasks WHERE id=?', [req.params.id]);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    await db.query('INSERT INTO task_comments (task_id,user_id,comment) VALUES (?,?,?)',
      [req.params.id, req.user.id, comment]);
    // Notify the other party (assigner if commenter is assignee, assignee if commenter is assigner)
    const notifyTargets = new Set();
    if (task.assigned_by && task.assigned_by !== req.user.id) notifyTargets.add(task.assigned_by);
    if (task.assigned_to && task.assigned_to !== req.user.id) notifyTargets.add(task.assigned_to);
    for (const targetId of notifyTargets) {
      await notify(targetId, 'New Comment', `${req.user.name} commented on "${task.title}"`, 'task', '/tasks');
    }
    res.json({ message: 'Comment added' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE TASK — owner, hr, or the person who created/assigned the task
router.delete('/:id', auth(), async (req, res) => {
  try {
    const [[task]] = await db.query('SELECT * FROM tasks WHERE id=?', [req.params.id]);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const canDelete = ['owner','hr'].includes(req.user.role) || task.assigned_by === req.user.id;
    if (!canDelete) return res.status(403).json({ message: 'You can only delete tasks you created' });
    await db.query('DELETE FROM task_comments WHERE task_id=?', [req.params.id]);
    await db.query('DELETE FROM tasks WHERE id=?', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
