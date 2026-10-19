const router = require('express').Router();
const db     = require('../db/db');
const auth   = require('../middleware/auth');

// FULL BUSINESS DASHBOARD
router.get('/dashboard', auth(['owner','hr']), async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth()+1;
    const year  = parseInt(req.query.year)  || new Date().getFullYear();
    const isOwner = req.user.role === 'owner';

    const [[rev]]       = await db.query(`SELECT COALESCE(SUM(total),0) as total FROM invoices WHERE status IN ('sent','partial','paid') AND MONTH(issue_date)=? AND YEAR(issue_date)=?`,[month,year]);
    const [[collected]] = await db.query(`SELECT COALESCE(SUM(amount_paid),0) as total FROM invoices WHERE MONTH(issue_date)=? AND YEAR(issue_date)=?`,[month,year]);
    const [[outstanding]]= await db.query(`SELECT COALESCE(SUM(balance_due),0) as total FROM invoices WHERE status NOT IN ('paid','cancelled','draft')`);
    const [[exp]]       = await db.query(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE status='approved' AND MONTH(date)=? AND YEAR(date)=?`,[month,year]);
    const [[payroll]]   = await db.query(`SELECT COALESCE(SUM(net_pay),0) as total FROM payslips WHERE month=? AND year=?`,[month,year]);
    const [[gst]]       = await db.query(`SELECT COALESCE(SUM(cgst_amount+sgst_amount+igst_amount),0) as total FROM invoices WHERE MONTH(issue_date)=? AND YEAR(issue_date)=? AND status!='cancelled'`,[month,year]);
    const [trend]       = await db.query(`SELECT DATE_FORMAT(issue_date,'%b %Y') as month,SUM(total) as revenue,COUNT(*) as invoice_count FROM invoices WHERE status!='cancelled' AND issue_date>=DATE_SUB(NOW(),INTERVAL 6 MONTH) GROUP BY DATE_FORMAT(issue_date,'%Y-%m'),DATE_FORMAT(issue_date,'%b %Y') ORDER BY MIN(issue_date) ASC`);
    const [topClients]  = await db.query(`SELECT p.name,COALESCE(SUM(i.total),0) as total_billed,COALESCE(SUM(i.amount_paid),0) as total_paid,COALESCE(SUM(i.balance_due),0) as balance_due,COUNT(i.id) as invoice_count FROM parties p LEFT JOIN invoices i ON p.id=i.party_id WHERE p.type='client' GROUP BY p.id,p.name ORDER BY total_billed DESC LIMIT 5`);
    const [expBreakdown]= await db.query(`SELECT category,SUM(amount) as total FROM expenses WHERE status='approved' AND MONTH(date)=? AND YEAR(date)=? GROUP BY category ORDER BY total DESC`,[month,year]);
    const [overdue]     = await db.query(`SELECT i.*,p.name as party_name FROM invoices i LEFT JOIN parties p ON i.party_id=p.id WHERE (i.status='sent' OR i.status='partial') AND i.due_date<CURDATE() ORDER BY i.due_date ASC LIMIT 10`);
    const [recentTxns]  = await db.query(`SELECT * FROM transactions ORDER BY date DESC LIMIT 10`);
    const [banks]       = await db.query('SELECT * FROM bank_accounts WHERE is_active=1');
    const [[pipeline]]  = await db.query(`SELECT COALESCE(SUM(value),0) as total FROM leads WHERE stage NOT IN ('Won','Lost')`);
    const [[activeProjects]] = await db.query(`SELECT COUNT(*) as count FROM projects WHERE status='active'`);
    const [[teamSize]]  = await db.query(`SELECT COUNT(*) as count FROM users WHERE role IN ('hr','team')`);

    const totalExp = parseFloat(exp.total) + parseFloat(payroll.total);
    const profit   = parseFloat(collected.total) - totalExp;

    // HR sees limited data (no amounts if not owner)
    const response = {
      month, year, activeProjects: activeProjects.count, teamSize: teamSize.count,
      trend, topClients, expBreakdown, overdue, recentTxns, banks,
      // Amounts only for owner
      ...(isOwner ? {
        revenue: rev.total, collected: collected.total, outstanding: outstanding.total,
        expenses: totalExp, payroll: payroll.total, gst_collected: gst.total,
        profit, profit_margin: collected.total > 0 ? ((profit/collected.total)*100).toFixed(1) : 0,
        pipeline: pipeline.total,
      } : {
        revenue: null, collected: null, outstanding: null,
        expenses: null, payroll: null, gst_collected: null,
        profit: null, profit_margin: null, pipeline: null,
      })
    };
    res.json(response);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PARTY LEDGER
router.get('/ledger/:partyId', auth(['owner','hr']), async (req, res) => {
  try {
    const pid = req.params.partyId;
    const [[party]]  = await db.query('SELECT * FROM parties WHERE id=?', [pid]);
    const [invoices] = await db.query(`SELECT id,'invoice' as type,invoice_number as doc_num,issue_date as date,total as debit,0 as credit FROM invoices WHERE party_id=? AND status!='cancelled' ORDER BY issue_date ASC`,[pid]);
    const [payments] = await db.query(`SELECT pr.id,'payment' as type,i.invoice_number as doc_num,pr.payment_date as date,0 as debit,pr.amount as credit FROM payment_receipts pr JOIN invoices i ON pr.invoice_id=i.id WHERE i.party_id=? ORDER BY pr.payment_date ASC`,[pid]);
    const entries = [...invoices,...payments].sort((a,b)=>new Date(a.date)-new Date(b.date));
    let balance = 0;
    const ledger = entries.map(e => { balance += parseFloat(e.debit)-parseFloat(e.credit); return {...e, balance}; });
    const totalDebit  = ledger.reduce((s,e)=>s+parseFloat(e.debit),0);
    const totalCredit = ledger.reduce((s,e)=>s+parseFloat(e.credit),0);
    res.json({ party, ledger, totalDebit, totalCredit, closingBalance: totalDebit-totalCredit });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/parties-summary', auth(['owner','hr']), async (req, res) => {
  try {
    const [parties] = await db.query(`SELECT p.*,COALESCE(SUM(i.total),0) as total_billed,COALESCE(SUM(i.amount_paid),0) as total_paid,COALESCE(SUM(i.balance_due),0) as balance_due,COUNT(i.id) as invoice_count FROM parties p LEFT JOIN invoices i ON p.id=i.party_id AND i.status!='cancelled' GROUP BY p.id ORDER BY total_billed DESC`);
    res.json(parties);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// BANK ACCOUNTS - with edit/delete
router.get('/banks', auth(['owner','hr']), async (req, res) => {
  const [rows] = await db.query('SELECT * FROM bank_accounts ORDER BY created_at');
  res.json(rows);
});

router.post('/banks', auth(['owner']), async (req, res) => {
  try {
    const { account_name, bank_name, account_number, ifsc, account_type, opening_balance } = req.body;
    const ob = parseFloat(opening_balance) || 0;
    const [r] = await db.query(
      'INSERT INTO bank_accounts (account_name,bank_name,account_number,ifsc,account_type,opening_balance,current_balance) VALUES (?,?,?,?,?,?,?)',
      [account_name, bank_name, account_number, ifsc, account_type||'current', ob, ob]
    );
    res.json({ message: 'Bank account added', id: r.insertId });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/banks/:id', auth(['owner']), async (req, res) => {
  try {
    const { account_name, bank_name, account_number, ifsc, account_type, current_balance } = req.body;
    await db.query(
      'UPDATE bank_accounts SET account_name=?,bank_name=?,account_number=?,ifsc=?,account_type=?,current_balance=? WHERE id=?',
      [account_name, bank_name, account_number, ifsc, account_type, current_balance, req.params.id]
    );
    res.json({ message: 'Bank account updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/banks/:id', auth(['owner']), async (req, res) => {
  await db.query('UPDATE bank_accounts SET is_active=0 WHERE id=?', [req.params.id]);
  res.json({ message: 'Bank account removed' });
});

// BANK STATEMENT
router.get('/bank-statement/:bankId', auth(['owner','hr']), async (req, res) => {
  const [rows] = await db.query('SELECT * FROM bank_statement_entries WHERE bank_account_id=? ORDER BY date DESC', [req.params.bankId]);
  res.json(rows);
});

router.post('/bank-statement/:bankId', auth(['owner','hr']), async (req, res) => {
  try {
    const { entries } = req.body;
    let inserted = 0;
    for (const e of entries) {
      await db.query(
        'INSERT INTO bank_statement_entries (bank_account_id,date,description,reference,debit,credit,balance) VALUES (?,?,?,?,?,?,?)',
        [req.params.bankId, e.date, e.description, e.reference||'', e.debit||0, e.credit||0, e.balance||0]
      );
      inserted++;
    }
    const lastEntry = entries[entries.length-1];
    if (lastEntry?.balance) await db.query('UPDATE bank_accounts SET current_balance=? WHERE id=?',[lastEntry.balance, req.params.bankId]);
    res.json({ message: `${inserted} entries imported` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/bank-statement/map/:entryId', auth(['owner','hr']), async (req, res) => {
  try {
    const { mapped_to, mapped_id } = req.body;
    await db.query('UPDATE bank_statement_entries SET mapped_to=?,mapped_id=?,is_mapped=1 WHERE id=?',[mapped_to, mapped_id, req.params.entryId]);
    res.json({ message: 'Entry mapped' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// CC STATEMENTS
router.get('/cc-cards', auth(['owner','hr']), async (req, res) => {
  const [rows] = await db.query('SELECT * FROM credit_cards WHERE is_active=1');
  res.json(rows);
});

router.post('/cc-cards', auth(['owner']), async (req, res) => {
  try {
    const { card_name, bank_name, last_4, credit_limit, billing_date, due_date } = req.body;
    await db.query('INSERT INTO credit_cards (card_name,bank_name,last_4,credit_limit,billing_date,due_date) VALUES (?,?,?,?,?,?)',
      [card_name, bank_name, last_4, credit_limit||0, billing_date||1, due_date||20]);
    res.json({ message: 'Card added' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/cc-cards/:id', auth(['owner']), async (req, res) => {
  const { card_name, bank_name, last_4, credit_limit } = req.body;
  await db.query('UPDATE credit_cards SET card_name=?,bank_name=?,last_4=?,credit_limit=? WHERE id=?',
    [card_name, bank_name, last_4, credit_limit, req.params.id]);
  res.json({ message: 'Card updated' });
});

router.delete('/cc-cards/:id', auth(['owner']), async (req, res) => {
  await db.query('UPDATE credit_cards SET is_active=0 WHERE id=?', [req.params.id]);
  res.json({ message: 'Card removed' });
});

router.get('/cc-statement/:cardId', auth(['owner','hr']), async (req, res) => {
  const [rows] = await db.query('SELECT * FROM cc_statements WHERE card_name=(SELECT card_name FROM credit_cards WHERE id=?) ORDER BY date DESC', [req.params.cardId]);
  res.json(rows);
});

router.post('/cc-statement/:cardId', auth(['owner','hr']), async (req, res) => {
  try {
    const { entries, card_name } = req.body;
    let inserted = 0;
    for (const e of entries) {
      await db.query('INSERT INTO cc_statements (card_name,date,description,reference,amount,transaction_type) VALUES (?,?,?,?,?,?)',
        [card_name, e.date, e.description, e.reference||'', e.amount||0, e.type||'debit']);
      inserted++;
    }
    res.json({ message: `${inserted} CC entries imported` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// SALARY SLIPS
router.get('/salary-slips', auth(['owner']), async (req, res) => {
  const m = req.query.month || new Date().getMonth()+1;
  const y = req.query.year  || new Date().getFullYear();
  const [rows] = await db.query(
    `SELECT ss.*,u.name,u.avatar,e.department,e.designation FROM salary_slips ss
     JOIN users u ON ss.user_id=u.id JOIN employees e ON e.user_id=u.id
     WHERE ss.month=? AND ss.year=? ORDER BY u.name`, [m,y]
  );
  res.json(rows);
});

router.get('/salary-slips/:userId/:month/:year', auth(['owner']), async (req, res) => {
  try {
    const { userId, month, year } = req.params;
    if (req.user.role==='team' && req.user.id!==parseInt(userId))
      return res.status(403).json({ message:'Forbidden' });
    const [[slip]] = await db.query(
      `SELECT ss.*,u.name,u.email,u.avatar,e.department,e.designation,e.date_of_joining,
       ed.bank_name,ed.bank_account_number,ed.pan_number,ed.aadhar_number
       FROM salary_slips ss JOIN users u ON ss.user_id=u.id
       JOIN employees e ON e.user_id=u.id
       LEFT JOIN employee_details ed ON ed.user_id=u.id
       WHERE ss.user_id=? AND ss.month=? AND ss.year=?`, [userId,month,year]
    );
    const [[comp]] = await db.query('SELECT * FROM company_settings LIMIT 1');
    res.json({ slip, company: comp });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/salary-slips/generate', auth(['owner']), async (req, res) => {
  try {
    const { month, year } = req.body;
    const [emps] = await db.query(`SELECT u.id,e.basic_salary,e.hra,e.other_allowance,ed.is_on_probation,ed.probation_end_date FROM users u JOIN employees e ON u.id=e.user_id LEFT JOIN employee_details ed ON ed.user_id=u.id WHERE u.role IN ('hr','team')`);
    for (const e of emps) {
      const gross = parseFloat(e.basic_salary)+parseFloat(e.hra)+parseFloat(e.other_allowance);
      const pt    = gross > 12000 ? 200 : 0;
      const [[lop]] = await db.query(`SELECT COUNT(*) as days FROM attendance WHERE user_id=? AND MONTH(date)=? AND YEAR(date)=? AND status='absent'`,[e.id,month,year]);
      const lop_days = e.is_on_probation ? (lop.days||0) : 0;
      const per_day  = gross / 26;
      const lop_ded  = lop_days * per_day;
      const total_ded = pt + lop_ded;
      const net = gross - total_ded;
      await db.query(
        `INSERT INTO salary_slips (user_id,month,year,basic,hra,other_allowance,gross_salary,pt_deduction,lop_days,lop_deduction,total_deduction,net_salary,status,generated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'generated',NOW()) ON DUPLICATE KEY UPDATE gross_salary=?,pt_deduction=?,lop_days=?,lop_deduction=?,total_deduction=?,net_salary=?,status='generated',generated_at=NOW()`,
        [e.id,month,year,e.basic_salary,e.hra,e.other_allowance,gross,pt,lop_days,lop_ded,total_ded,net,gross,pt,lop_days,lop_ded,total_ded,net]
      );
    }
    res.json({ message:`Salary slips generated` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/expense-summary', auth(['owner','hr']), async (req, res) => {
  try {
    const m = req.query.month || new Date().getMonth()+1;
    const y = req.query.year  || new Date().getFullYear();
    const [rows] = await db.query(`SELECT category,SUM(amount) as total,COUNT(*) as count FROM expenses WHERE status='approved' AND MONTH(date)=? AND YEAR(date)=? GROUP BY category`,[m,y]);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
