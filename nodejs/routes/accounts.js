const router = require('express').Router();
const db     = require('../db/db');
const auth   = require('../middleware/auth');

router.get('/summary', auth(['owner','hr']), async (req, res) => {
  try {
    const month = req.query.month || new Date().getMonth()+1;
    const year  = req.query.year  || new Date().getFullYear();
    const [[income]]    = await db.query(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='income' AND MONTH(date)=? AND YEAR(date)=?`,[month,year]);
    const [[expenses]]  = await db.query(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='expense' AND MONTH(date)=? AND YEAR(date)=?`,[month,year]);
    const [[invoiced]]  = await db.query(`SELECT COALESCE(SUM(total),0) as total FROM invoices WHERE status IN ('sent','paid') AND MONTH(issue_date)=? AND YEAR(issue_date)=?`,[month,year]);
    const [[overdue]]   = await db.query(`SELECT COALESCE(SUM(total),0) as total,COUNT(*) as count FROM invoices WHERE status='overdue' OR (status='sent' AND due_date<CURDATE())`);
    const [trend]       = await db.query(`SELECT DATE_FORMAT(date,'%b %Y') as month,SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense FROM transactions WHERE date>=DATE_SUB(NOW(),INTERVAL 6 MONTH) GROUP BY DATE_FORMAT(date,'%Y-%m'),DATE_FORMAT(date,'%b %Y') ORDER BY MIN(date) ASC`);
    const [byCategory]  = await db.query(`SELECT category,SUM(amount) as total FROM expenses WHERE status='approved' AND MONTH(date)=? AND YEAR(date)=? GROUP BY category ORDER BY total DESC`,[month,year]);
    res.json({ income:income.total,expenses:expenses.total,profit:income.total-expenses.total,invoiced:invoiced.total,overdue_amount:overdue.total,overdue_count:overdue.count,trend,byCategory });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/invoices', auth(['owner','hr']), async (req, res) => {
  const [rows] = await db.query(`SELECT i.*,u.name as client_name,p.name as project_name FROM invoices i LEFT JOIN users u ON i.client_id=u.id LEFT JOIN projects p ON i.project_id=p.id ORDER BY i.created_at DESC`);
  res.json(rows);
});

router.post('/invoices', auth(['owner','hr']), async (req, res) => {
  try {
    const { client_id,project_id,issue_date,due_date,items,notes,tax_percent=18 } = req.body;
    const subtotal    = items.reduce((s,it)=>s+(it.quantity*it.unit_price),0);
    const tax_amount  = (subtotal*tax_percent)/100;
    const total       = subtotal+tax_amount;
    const [[{cnt}]]   = await db.query('SELECT COUNT(*)+1 as cnt FROM invoices');
    const invoice_number = `AWL-${new Date().getFullYear()}-${String(cnt).padStart(3,'0')}`;
    const [result] = await db.query(`INSERT INTO invoices (invoice_number,client_id,project_id,issue_date,due_date,subtotal,tax_percent,tax_amount,total,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,[invoice_number,client_id,project_id,issue_date,due_date,subtotal,tax_percent,tax_amount,total,notes,req.user.id]);
    for (const it of items) await db.query('INSERT INTO invoice_items (invoice_id,description,quantity,unit_price,amount) VALUES (?,?,?,?,?)',[result.insertId,it.description,it.quantity,it.unit_price,it.quantity*it.unit_price]);
    res.json({ message:'Invoice created',id:result.insertId,invoice_number });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/invoices/:id', auth(['owner','hr']), async (req, res) => {
  try {
    const { status,notes } = req.body;
    await db.query('UPDATE invoices SET status=?,notes=? WHERE id=?',[status,notes,req.params.id]);
    if (status==='paid') {
      const [[inv]] = await db.query('SELECT * FROM invoices WHERE id=?',[req.params.id]);
      await db.query(`INSERT INTO transactions (type,reference_type,reference_id,title,amount,date,payment_mode) VALUES ('income','invoice',?,?,?,CURDATE(),'bank_transfer')`,[inv.id,`Payment — ${inv.invoice_number}`,inv.total]);
    }
    res.json({ message:'Invoice updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/expenses', auth(['owner','hr']), async (req, res) => {
  const [rows] = await db.query(`SELECT e.*,u.name as paid_by_name,p.name as project_name FROM expenses e LEFT JOIN users u ON e.paid_by=u.id LEFT JOIN projects p ON e.project_id=p.id ORDER BY e.date DESC`);
  res.json(rows);
});

router.post('/expenses', auth(['owner','hr','team']), async (req, res) => {
  try {
    const { title,category,amount,date,project_id,notes } = req.body;
    const [r] = await db.query('INSERT INTO expenses (title,category,amount,date,paid_by,project_id,notes) VALUES (?,?,?,?,?,?,?)',[title,category,amount,date,req.user.id,project_id||null,notes]);
    res.json({ message:'Expense added',id:r.insertId });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/expenses/:id', auth(['owner','hr']), async (req, res) => {
  const { status } = req.body;
  await db.query('UPDATE expenses SET status=?,approved_by=? WHERE id=?',[status,req.user.id,req.params.id]);
  if (status==='approved') {
    const [[exp]] = await db.query('SELECT * FROM expenses WHERE id=?',[req.params.id]);
    await db.query(`INSERT INTO transactions (type,reference_type,reference_id,title,amount,date) VALUES ('expense','expense',?,?,?,?)`,[exp.id,exp.title,exp.amount,exp.date]);
  }
  res.json({ message:'Expense updated' });
});

router.get('/transactions', auth(['owner','hr']), async (req, res) => {
  const [rows] = await db.query('SELECT * FROM transactions ORDER BY date DESC LIMIT 50');
  res.json(rows);
});

module.exports = router;
