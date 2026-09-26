const router = require('express').Router();
const db     = require('../db/db');
const auth   = require('../middleware/auth');

router.get('/owner', auth(['owner']), async (req, res) => {
  try {
    const [[{ total_employees }]] = await db.query('SELECT COUNT(*) as total_employees FROM users WHERE role IN ("hr","team")');
    const [[{ active_projects }]] = await db.query('SELECT COUNT(*) as active_projects FROM projects WHERE status="active"');
    const [[{ open_leads }]]      = await db.query('SELECT COUNT(*) as open_leads FROM leads WHERE stage NOT IN ("Won","Lost")');
    const [[{ pipeline_value }]]  = await db.query('SELECT COALESCE(SUM(value),0) as pipeline_value FROM leads WHERE stage NOT IN ("Won","Lost")');
    const [[{ monthly_payroll }]] = await db.query('SELECT COALESCE(SUM(net_salary),0) as monthly_payroll FROM payroll WHERE month=MONTH(NOW()) AND year=YEAR(NOW())');
    const [projects]   = await db.query('SELECT p.*,u.name as client_name FROM projects p LEFT JOIN users u ON p.client_id=u.id ORDER BY p.created_at DESC LIMIT 5');
    const [leads]      = await db.query('SELECT l.*,u.name as assigned_name FROM leads l LEFT JOIN users u ON l.assigned_to=u.id ORDER BY l.updated_at DESC LIMIT 5');
    const [attendance] = await db.query(`SELECT u.id,u.name,u.avatar,u.role,a.status,a.check_in FROM users u LEFT JOIN attendance a ON u.id=a.user_id AND a.date=CURDATE() WHERE u.role IN ('hr','team') ORDER BY u.name`);
    const [activity]   = await db.query(`SELECT 'lead' as type,CONCAT(name,' → ',stage) as text,updated_at as time FROM leads UNION ALL SELECT 'task',CONCAT(title,' done'),created_at FROM tasks WHERE status='done' ORDER BY time DESC LIMIT 8`);
    res.json({ stats:{ total_employees,active_projects,open_leads,pipeline_value,monthly_payroll }, projects,leads,attendance,activity });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/hr', auth(['owner','hr']), async (req, res) => {
  try {
    const [[{ total }]]         = await db.query('SELECT COUNT(*) as total FROM users WHERE role IN ("hr","team")');
    const [[{ present }]]       = await db.query('SELECT COUNT(*) as present FROM attendance WHERE date=CURDATE() AND status="present"');
    const [[{ total_payroll }]] = await db.query('SELECT COALESCE(SUM(net_salary),0) as total_payroll FROM payroll WHERE month=MONTH(NOW()) AND year=YEAR(NOW())');
    const [payroll]          = await db.query(`SELECT p.*,u.name,u.avatar,e.department FROM payroll p JOIN users u ON p.user_id=u.id JOIN employees e ON e.user_id=u.id WHERE p.month=MONTH(NOW()) AND p.year=YEAR(NOW())`);
    const [leave_requests]   = await db.query(`SELECT l.*,u.name,u.avatar FROM leave_requests l JOIN users u ON l.user_id=u.id WHERE l.status='pending' ORDER BY l.created_at DESC`);
    const [today_attendance] = await db.query(`SELECT u.id,u.name,u.avatar,u.role,a.status,a.check_in,a.method FROM users u LEFT JOIN attendance a ON u.id=a.user_id AND a.date=CURDATE() WHERE u.role IN ('hr','team')`);
    const [leave_balances]   = await db.query(`SELECT u.name,u.avatar,e.leave_balance FROM employees e JOIN users u ON e.user_id=u.id`);
    res.json({ stats:{total,present,total_payroll}, payroll,leave_requests,today_attendance,leave_balances });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/team', auth(['owner','hr','team']), async (req, res) => {
  try {
    const uid = req.user.id;
    const [tasks]      = await db.query(`SELECT t.*,p.name as project_name FROM tasks t LEFT JOIN projects p ON t.project_id=p.id WHERE t.assigned_to=? ORDER BY t.due_date ASC`,[uid]);
    const [projects]   = await db.query(`SELECT p.* FROM projects p JOIN project_members pm ON p.id=pm.project_id WHERE pm.user_id=?`,[uid]);
    const [[emp]]      = await db.query('SELECT * FROM employees WHERE user_id=?',[uid]);
    const [attendance] = await db.query(`SELECT date,status,check_in,check_out FROM attendance WHERE user_id=? AND MONTH(date)=MONTH(NOW()) ORDER BY date`,[uid]);
    const [[today]]    = await db.query('SELECT * FROM attendance WHERE user_id=? AND date=CURDATE()',[uid]);
    res.json({ tasks,projects,employee:emp,attendance,today_attendance:today||null });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
