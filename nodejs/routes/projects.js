const router = require('express').Router();
const db     = require('../db/db');
const auth   = require('../middleware/auth');

router.get('/', auth(), async (req, res) => {
  try {
    const uid = req.user.id, role = req.user.role;
    let rows;
    if (role==='owner'||role==='hr') {
      [rows] = await db.query(`SELECT p.*,u.name as client_name FROM projects p LEFT JOIN users u ON p.client_id=u.id ORDER BY p.created_at DESC`);
    } else if (role==='client') {
      [rows] = await db.query('SELECT * FROM projects WHERE client_id=?',[uid]);
    } else {
      [rows] = await db.query(`SELECT DISTINCT p.*,u.name as client_name FROM projects p JOIN project_members pm ON p.id=pm.project_id LEFT JOIN users u ON p.client_id=u.id WHERE pm.user_id=? ORDER BY p.created_at DESC`,[uid]);
    }
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', auth(), async (req, res) => {
  try {
    const [[project]] = await db.query(`SELECT p.*,u.name as client_name FROM projects p LEFT JOIN users u ON p.client_id=u.id WHERE p.id=?`,[req.params.id]);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const [members]   = await db.query(`SELECT pm.*,u.name,u.avatar,u.role FROM project_members pm JOIN users u ON pm.user_id=u.id WHERE pm.project_id=?`,[req.params.id]);
    const [tasks]     = await db.query(`SELECT t.*,u.name as assigned_name FROM tasks t LEFT JOIN users u ON t.assigned_to=u.id WHERE t.project_id=? ORDER BY t.due_date ASC`,[req.params.id]);
    res.json({ ...project, members, tasks });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Helper: normalize empty string / undefined to null for nullable FK & date columns
const nz = (v) => (v === '' || v === undefined) ? null : v;

router.post('/', auth(['owner','hr']), async (req, res) => {
  try {
    const { name,description,client_id,start_date,due_date,members } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Project name is required' });
    const [r] = await db.query(
      'INSERT INTO projects (name,description,client_id,start_date,due_date,created_by) VALUES (?,?,?,?,?,?)',
      [name, nz(description), nz(client_id), nz(start_date), nz(due_date), req.user.id]
    );
    if (members?.length) {
      await db.query('INSERT INTO project_members (project_id,user_id) VALUES ?', [members.map(mid=>[r.insertId,mid])]);
    }
    res.json({ message:'Project created', id:r.insertId });
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW')
      return res.status(400).json({ message: 'Selected client no longer exists. Please choose another or leave blank.' });
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth(['owner','hr','team']), async (req, res) => {
  try {
    const { name,description,status,progress,due_date,start_date,client_id } = req.body;
    if (req.user.role === 'team') {
      // Team members can only update progress
      await db.query('UPDATE projects SET progress=? WHERE id=?', [progress ?? 0, req.params.id]);
    } else {
      if (!name?.trim()) return res.status(400).json({ message: 'Project name is required' });
      await db.query(
        'UPDATE projects SET name=?,description=?,status=?,progress=?,due_date=?,start_date=?,client_id=? WHERE id=?',
        [name, nz(description), status||'active', progress ?? 0, nz(due_date), nz(start_date), nz(client_id), req.params.id]
      );
    }
    res.json({ message:'Project updated' });
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW')
      return res.status(400).json({ message: 'Selected client no longer exists. Please choose another or leave blank.' });
    res.status(500).json({ message: err.message });
  }
});

// DELETE PROJECT — owner/hr only
router.delete('/:id', auth(['owner','hr']), async (req, res) => {
  try {
    await db.query('DELETE FROM project_members WHERE project_id=?', [req.params.id]);
    await db.query('UPDATE tasks SET project_id=NULL WHERE project_id=?', [req.params.id]);
    await db.query('DELETE FROM projects WHERE id=?', [req.params.id]);
    res.json({ message: 'Project deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ADD MEMBER TO PROJECT
router.post('/:id/members', auth(['owner','hr']), async (req, res) => {
  try {
    const { user_id, role } = req.body;
    await db.query('INSERT IGNORE INTO project_members (project_id,user_id,role) VALUES (?,?,?)',[req.params.id,user_id,role||'member']);
    res.json({ message:'Member added' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id/members/:uid', auth(['owner','hr']), async (req, res) => {
  await db.query('DELETE FROM project_members WHERE project_id=? AND user_id=?',[req.params.id,req.params.uid]);
  res.json({ message:'Member removed' });
});

module.exports = router;
