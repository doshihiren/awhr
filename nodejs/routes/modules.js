const express = require('express');
const db      = require('../db/db');
const auth    = require('../middleware/auth');

const leadsRouter    = express.Router();
const tasksRouter    = express.Router();
const projectsRouter = express.Router();

// ─── LEADS ───────────────────────────────────────────────────────────────────

leadsRouter.get('/', auth(['owner','hr','team']), async (req, res) => {
  const [rows] = await db.query(`SELECT l.*,u.name as assigned_name FROM leads l LEFT JOIN users u ON l.assigned_to=u.id ORDER BY l.updated_at DESC`);
  res.json(rows);
});

leadsRouter.post('/', auth(['owner','hr','team']), async (req, res) => {
  try {
    const { name,company,email,phone,value,stage,assigned_to,notes } = req.body;
    const [r] = await db.query('INSERT INTO leads (name,company,email,phone,value,stage,assigned_to,notes) VALUES (?,?,?,?,?,?,?,?)',[name,company,email,phone,value||0,stage||'New Lead',assigned_to||req.user.id,notes]);
    res.json({ message:'Lead created', id:r.insertId });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

leadsRouter.put('/:id', auth(['owner','hr','team']), async (req, res) => {
  try {
    const { name,company,email,phone,value,stage,assigned_to,notes } = req.body;
    await db.query('UPDATE leads SET name=?,company=?,email=?,phone=?,value=?,stage=?,assigned_to=?,notes=? WHERE id=?',[name,company,email,phone,value,stage,assigned_to,notes,req.params.id]);
    await db.query('INSERT INTO lead_activities (lead_id,user_id,activity) VALUES (?,?,?)',[req.params.id,req.user.id,`Stage updated to ${stage}`]);
    res.json({ message:'Lead updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

leadsRouter.delete('/:id', auth(['owner','hr']), async (req, res) => {
  await db.query('DELETE FROM leads WHERE id=?',[req.params.id]);
  res.json({ message:'Lead deleted' });
});

// ─── TASKS ───────────────────────────────────────────────────────────────────

tasksRouter.get('/', auth(), async (req, res) => {
  const uid  = req.user.id;
  const role = req.user.role;
  let query  = `SELECT t.*,p.name as project_name,u.name as assigned_name,u.avatar FROM tasks t LEFT JOIN projects p ON t.project_id=p.id LEFT JOIN users u ON t.assigned_to=u.id`;
  const params = [];
  if (role==='team') { query+=' WHERE t.assigned_to=?'; params.push(uid); }
  query+=' ORDER BY t.due_date ASC';
  const [rows] = await db.query(query,params);
  res.json(rows);
});

tasksRouter.post('/', auth(['owner','hr','team']), async (req, res) => {
  try {
    const { title,description,project_id,assigned_to,priority,due_date } = req.body;
    const [r] = await db.query('INSERT INTO tasks (title,description,project_id,assigned_to,assigned_by,priority,due_date) VALUES (?,?,?,?,?,?,?)',[title,description,project_id,assigned_to,req.user.id,priority||'medium',due_date]);
    res.json({ message:'Task created', id:r.insertId });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

tasksRouter.put('/:id', auth(), async (req, res) => {
  try {
    const { title,status,priority,due_date,description } = req.body;
    await db.query('UPDATE tasks SET title=?,status=?,priority=?,due_date=?,description=? WHERE id=?',[title,status,priority,due_date,description,req.params.id]);
    res.json({ message:'Task updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

tasksRouter.delete('/:id', auth(['owner','hr']), async (req, res) => {
  await db.query('DELETE FROM tasks WHERE id=?',[req.params.id]);
  res.json({ message:'Task deleted' });
});

// ─── PROJECTS ────────────────────────────────────────────────────────────────

projectsRouter.get('/', auth(), async (req, res) => {
  const uid  = req.user.id;
  const role = req.user.role;
  let rows;
  if (role==='owner'||role==='hr') {
    [rows] = await db.query(`SELECT p.*,u.name as client_name FROM projects p LEFT JOIN users u ON p.client_id=u.id ORDER BY p.created_at DESC`);
  } else if (role==='client') {
    [rows] = await db.query('SELECT * FROM projects WHERE client_id=?',[uid]);
  } else {
    [rows] = await db.query(`SELECT p.*,u.name as client_name FROM projects p JOIN project_members pm ON p.id=pm.project_id LEFT JOIN users u ON p.client_id=u.id WHERE pm.user_id=?`,[uid]);
  }
  res.json(rows);
});

projectsRouter.post('/', auth(['owner','hr']), async (req, res) => {
  try {
    const { name,description,client_id,start_date,due_date,members } = req.body;
    const [r] = await db.query('INSERT INTO projects (name,description,client_id,start_date,due_date,created_by) VALUES (?,?,?,?,?,?)',[name,description,client_id,start_date,due_date,req.user.id]);
    if (members?.length) await db.query('INSERT INTO project_members (project_id,user_id) VALUES ?',[members.map(mid=>[r.insertId,mid])]);
    res.json({ message:'Project created', id:r.insertId });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

projectsRouter.put('/:id', auth(['owner','hr']), async (req, res) => {
  try {
    const { name,description,status,progress,due_date } = req.body;
    await db.query('UPDATE projects SET name=?,description=?,status=?,progress=?,due_date=? WHERE id=?',[name,description,status,progress,due_date,req.params.id]);
    res.json({ message:'Project updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = { leadsRouter, tasksRouter, projectsRouter };
