const router = require('express').Router();
const db     = require('../db/db');
const auth   = require('../middleware/auth');

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function calcGST(items, partyState, companyState = 'Gujarat') {
  const gst_type = partyState === companyState ? 'cgst_sgst' : 'igst';
  let subtotal = 0, discount_amount = 0, cgst = 0, sgst = 0, igst = 0;
  items.forEach(it => {
    const base    = it.quantity * it.unit_price;
    const disc    = (base * (it.discount_percent || 0)) / 100;
    const taxable = base - disc;
    subtotal      += base;
    discount_amount += disc;
    if (gst_type === 'cgst_sgst') {
      cgst += (taxable * (it.gst_rate / 2)) / 100;
      sgst += (taxable * (it.gst_rate / 2)) / 100;
    } else {
      igst += (taxable * it.gst_rate) / 100;
    }
  });
  const taxable_amount = subtotal - discount_amount;
  const total = taxable_amount + cgst + sgst + igst;
  return { subtotal, discount_amount, taxable_amount, cgst_amount: cgst, sgst_amount: sgst, igst_amount: igst, total, gst_type };
}

function nextNumber(prefix, count) {
  return `${prefix}-${new Date().getFullYear()}-${String(count).padStart(3,'0')}`;
}

// ─── COMPANY SETTINGS ────────────────────────────────────────────────────────

router.get('/settings', auth(['owner','hr']), async (req, res) => {
  const [[settings]] = await db.query('SELECT * FROM company_settings LIMIT 1');
  res.json(settings || {});
});

router.put('/settings', auth(['owner']), async (req, res) => {
  try {
    const { company_name,gstin,pan,address,city,state,state_code,pincode,phone,email,bank_name,bank_account,bank_ifsc,bank_branch } = req.body;
    await db.query(
      `INSERT INTO company_settings (id,company_name,gstin,pan,address,city,state,state_code,pincode,phone,email,bank_name,bank_account,bank_ifsc,bank_branch)
       VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE company_name=?,gstin=?,pan=?,address=?,city=?,state=?,state_code=?,pincode=?,phone=?,email=?,bank_name=?,bank_account=?,bank_ifsc=?,bank_branch=?`,
      [company_name,gstin,pan,address,city,state,state_code,pincode,phone,email,bank_name,bank_account,bank_ifsc,bank_branch,
       company_name,gstin,pan,address,city,state,state_code,pincode,phone,email,bank_name,bank_account,bank_ifsc,bank_branch]
    );
    res.json({ message: 'Settings saved' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── PARTIES ─────────────────────────────────────────────────────────────────

router.get('/parties', auth(['owner','hr']), async (req, res) => {
  const [rows] = await db.query('SELECT * FROM parties ORDER BY name');
  res.json(rows);
});

router.post('/parties', auth(['owner','hr']), async (req, res) => {
  try {
    const { name,gstin,pan,email,phone,address,city,state,state_code,pincode,type } = req.body;
    const [r] = await db.query(
      'INSERT INTO parties (name,gstin,pan,email,phone,address,city,state,state_code,pincode,type) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [name,gstin,pan,email,phone,address,city,state,state_code,pincode,type||'client']
    );
    res.json({ message:'Party added', id:r.insertId });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/parties/:id', auth(['owner','hr']), async (req, res) => {
  try {
    const { name,gstin,pan,email,phone,address,city,state,state_code,pincode,type } = req.body;
    await db.query(
      'UPDATE parties SET name=?,gstin=?,pan=?,email=?,phone=?,address=?,city=?,state=?,state_code=?,pincode=?,type=? WHERE id=?',
      [name,gstin,pan,email,phone,address,city,state,state_code,pincode,type,req.params.id]
    );
    res.json({ message:'Party updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// FETCH PARTY FROM GST NUMBER (GST API)
router.get('/parties/gst/:gstin', auth(['owner','hr']), async (req, res) => {
  try {
    const gstin = req.params.gstin;
    const stateCode = gstin.slice(0,2);
    const stateCodes = {'01':'Jammu & Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh','05':'Uttarakhand','06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh','10':'Bihar','11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur','15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam','19':'West Bengal','20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh','24':'Gujarat','25':'Daman & Diu','26':'Dadra & Nagar Haveli','27':'Maharashtra','28':'Andhra Pradesh','29':'Karnataka','30':'Goa','31':'Lakshadweep','32':'Kerala','33':'Tamil Nadu','34':'Puducherry','35':'Andaman & Nicobar','36':'Telangana','37':'Andhra Pradesh (New)'};
    const state = stateCodes[stateCode] || 'Unknown';
    const pan   = gstin.slice(2,12);
    res.json({ gstin, pan, state, state_code: stateCode, message: 'Basic details extracted from GSTIN' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── HSN CODES ───────────────────────────────────────────────────────────────

router.get('/hsn', auth(['owner','hr']), async (req, res) => {
  const [rows] = await db.query('SELECT * FROM hsn_codes ORDER BY code');
  res.json(rows);
});

router.post('/hsn', auth(['owner']), async (req, res) => {
  const { code,description,gst_rate,type } = req.body;
  await db.query('INSERT INTO hsn_codes (code,description,gst_rate,type) VALUES (?,?,?,?)',[code,description,gst_rate,type||'SAC']);
  res.json({ message:'HSN/SAC added' });
});

// ─── QUOTATIONS ──────────────────────────────────────────────────────────────

router.get('/quotations', auth(['owner','hr']), async (req, res) => {
  const [rows] = await db.query(`SELECT q.*,p.name as party_name,p.state as party_state FROM quotations q LEFT JOIN parties p ON q.party_id=p.id ORDER BY q.created_at DESC`);
  res.json(rows);
});

router.get('/quotations/:id', auth(['owner','hr']), async (req, res) => {
  const [[q]]    = await db.query(`SELECT q.*,p.*,p.name as party_name FROM quotations q LEFT JOIN parties p ON q.party_id=p.id WHERE q.id=?`,[req.params.id]);
  const [items]  = await db.query(`SELECT * FROM document_items WHERE document_type='quotation' AND document_id=?`,[req.params.id]);
  const [[comp]] = await db.query('SELECT * FROM company_settings LIMIT 1');
  res.json({ ...q, items, company: comp });
});

router.post('/quotations', auth(['owner','hr']), async (req, res) => {
  try {
    const { party_id,project_id,issue_date,valid_until,items,notes,terms,tds_percent=0 } = req.body;
    const [[party]]  = await db.query('SELECT * FROM parties WHERE id=?',[party_id]);
    const [[comp]]   = await db.query('SELECT * FROM company_settings LIMIT 1');
    const calc       = calcGST(items, party?.state, comp?.state || 'Gujarat');
    const tds_amount = (calc.taxable_amount * tds_percent) / 100;
    const total      = calc.total - tds_amount;
    const [[{cnt}]]  = await db.query('SELECT COUNT(*)+1 as cnt FROM quotations');
    const quote_number = nextNumber('QT', cnt);
    const [r] = await db.query(
      `INSERT INTO quotations (quote_number,party_id,project_id,issue_date,valid_until,subtotal,discount_amount,taxable_amount,cgst_amount,sgst_amount,igst_amount,tds_amount,total,gst_type,notes,terms,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [quote_number,party_id,project_id,issue_date,valid_until,calc.subtotal,calc.discount_amount,calc.taxable_amount,calc.cgst_amount,calc.sgst_amount,calc.igst_amount,tds_amount,total,calc.gst_type,notes,terms,req.user.id]
    );
    for (const it of items) {
      const base = it.quantity * it.unit_price;
      const disc = (base * (it.discount_percent||0))/100;
      await db.query(
        `INSERT INTO document_items (document_type,document_id,description,hsn_sac_code,quantity,unit,unit_price,discount_percent,amount,gst_rate,cgst_rate,sgst_rate,igst_rate)
         VALUES ('quotation',?,?,?,?,?,?,?,?,?,?,?,?)`,
        [r.insertId,it.description,it.hsn_sac_code,it.quantity,it.unit||'nos',it.unit_price,it.discount_percent||0,base-disc,it.gst_rate||18,it.gst_rate/2||9,it.gst_rate/2||9,it.gst_rate||18]
      );
    }
    res.json({ message:'Quotation created', id:r.insertId, quote_number });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/quotations/:id', auth(['owner','hr']), async (req, res) => {
  const { status } = req.body;
  await db.query('UPDATE quotations SET status=? WHERE id=?',[status,req.params.id]);
  res.json({ message:'Quotation updated' });
});

// CONVERT QUOTE TO PROFORMA
router.post('/quotations/:id/convert-to-pi', auth(['owner','hr']), async (req, res) => {
  try {
    const [[q]]    = await db.query('SELECT * FROM quotations WHERE id=?',[req.params.id]);
    const [items]  = await db.query(`SELECT * FROM document_items WHERE document_type='quotation' AND document_id=?`,[req.params.id]);
    const [[{cnt}]]= await db.query('SELECT COUNT(*)+1 as cnt FROM proforma_invoices');
    const pi_number= nextNumber('PI', cnt);
    const [r] = await db.query(
      `INSERT INTO proforma_invoices (pi_number,quote_id,party_id,project_id,issue_date,due_date,subtotal,discount_amount,taxable_amount,cgst_amount,sgst_amount,igst_amount,tds_amount,total,gst_type,notes,terms,created_by)
       VALUES (?,?,?,?,CURDATE(),DATE_ADD(CURDATE(),INTERVAL 30 DAY),?,?,?,?,?,?,?,?,?,?,?,?)`,
      [pi_number,q.id,q.party_id,q.project_id,q.subtotal,q.discount_amount,q.taxable_amount,q.cgst_amount,q.sgst_amount,q.igst_amount,q.tds_amount,q.total,q.gst_type,q.notes,q.terms,req.user.id]
    );
    for (const it of items) {
      await db.query(
        `INSERT INTO document_items (document_type,document_id,description,hsn_sac_code,quantity,unit,unit_price,discount_percent,amount,gst_rate,cgst_rate,sgst_rate,igst_rate)
         VALUES ('proforma',?,?,?,?,?,?,?,?,?,?,?,?)`,
        [r.insertId,it.description,it.hsn_sac_code,it.quantity,it.unit,it.unit_price,it.discount_percent,it.amount,it.gst_rate,it.cgst_rate,it.sgst_rate,it.igst_rate]
      );
    }
    await db.query(`UPDATE quotations SET status='converted' WHERE id=?`,[q.id]);
    res.json({ message:'Converted to Proforma Invoice', pi_id:r.insertId, pi_number });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── PROFORMA INVOICES ───────────────────────────────────────────────────────

router.get('/proforma', auth(['owner','hr']), async (req, res) => {
  const [rows] = await db.query(`SELECT pi.*,p.name as party_name FROM proforma_invoices pi LEFT JOIN parties p ON pi.party_id=p.id ORDER BY pi.created_at DESC`);
  res.json(rows);
});

router.get('/proforma/:id', auth(['owner','hr']), async (req, res) => {
  const [[pi]]   = await db.query(`SELECT pi.*,p.name as party_name,p.gstin,p.address,p.state FROM proforma_invoices pi LEFT JOIN parties p ON pi.party_id=p.id WHERE pi.id=?`,[req.params.id]);
  const [items]  = await db.query(`SELECT * FROM document_items WHERE document_type='proforma' AND document_id=?`,[req.params.id]);
  const [[comp]] = await db.query('SELECT * FROM company_settings LIMIT 1');
  res.json({ ...pi, items, company: comp });
});

router.post('/proforma', auth(['owner','hr']), async (req, res) => {
  try {
    const { party_id,project_id,issue_date,due_date,items,notes,terms,is_recurring=0,recurring_interval,next_renewal_date,tds_percent=0 } = req.body;
    const [[party]]  = await db.query('SELECT * FROM parties WHERE id=?',[party_id]);
    const [[comp]]   = await db.query('SELECT * FROM company_settings LIMIT 1');
    const calc       = calcGST(items, party?.state, comp?.state||'Gujarat');
    const tds_amount = (calc.taxable_amount * tds_percent)/100;
    const total      = calc.total - tds_amount;
    const [[{cnt}]]  = await db.query('SELECT COUNT(*)+1 as cnt FROM proforma_invoices');
    const pi_number  = nextNumber('PI', cnt);
    const [r] = await db.query(
      `INSERT INTO proforma_invoices (pi_number,party_id,project_id,issue_date,due_date,subtotal,discount_amount,taxable_amount,cgst_amount,sgst_amount,igst_amount,tds_amount,total,gst_type,is_recurring,recurring_interval,next_renewal_date,notes,terms,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [pi_number,party_id,project_id,issue_date,due_date,calc.subtotal,calc.discount_amount,calc.taxable_amount,calc.cgst_amount,calc.sgst_amount,calc.igst_amount,tds_amount,total,calc.gst_type,is_recurring,recurring_interval||null,next_renewal_date||null,notes,terms,req.user.id]
    );
    for (const it of items) {
      const base = it.quantity * it.unit_price;
      const disc = (base*(it.discount_percent||0))/100;
      await db.query(
        `INSERT INTO document_items (document_type,document_id,description,hsn_sac_code,quantity,unit,unit_price,discount_percent,amount,gst_rate,cgst_rate,sgst_rate,igst_rate)
         VALUES ('proforma',?,?,?,?,?,?,?,?,?,?,?,?)`,
        [r.insertId,it.description,it.hsn_sac_code,it.quantity,it.unit||'nos',it.unit_price,it.discount_percent||0,base-disc,it.gst_rate||18,it.gst_rate/2||9,it.gst_rate/2||9,it.gst_rate||18]
      );
    }
    res.json({ message:'Proforma created', id:r.insertId, pi_number });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// CONVERT PI TO INVOICE
router.post('/proforma/:id/convert-to-invoice', auth(['owner','hr']), async (req, res) => {
  try {
    const [[pi]]   = await db.query('SELECT * FROM proforma_invoices WHERE id=?',[req.params.id]);
    const [items]  = await db.query(`SELECT * FROM document_items WHERE document_type='proforma' AND document_id=?`,[req.params.id]);
    const [[{cnt}]]= await db.query('SELECT COUNT(*)+1 as cnt FROM invoices');
    const inv_num  = nextNumber('INV', cnt);
    const due      = new Date(); due.setDate(due.getDate()+30);
    const [r] = await db.query(
      `INSERT INTO invoices (invoice_number,pi_id,party_id,project_id,issue_date,due_date,subtotal,discount_amount,taxable_amount,cgst_amount,sgst_amount,igst_amount,tds_amount,total,balance_due,gst_type,notes,terms,created_by)
       VALUES (?,?,?,?,CURDATE(),?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [inv_num,pi.id,pi.party_id,pi.project_id,due.toISOString().split('T')[0],pi.subtotal,pi.discount_amount,pi.taxable_amount,pi.cgst_amount,pi.sgst_amount,pi.igst_amount,pi.tds_amount,pi.total,pi.total,pi.gst_type,pi.notes,pi.terms,req.user.id]
    );
    for (const it of items) {
      await db.query(
        `INSERT INTO document_items (document_type,document_id,description,hsn_sac_code,quantity,unit,unit_price,discount_percent,amount,gst_rate,cgst_rate,sgst_rate,igst_rate)
         VALUES ('invoice',?,?,?,?,?,?,?,?,?,?,?,?)`,
        [r.insertId,it.description,it.hsn_sac_code,it.quantity,it.unit,it.unit_price,it.discount_percent,it.amount,it.gst_rate,it.cgst_rate,it.sgst_rate,it.igst_rate]
      );
    }
    await db.query(`UPDATE proforma_invoices SET status='converted' WHERE id=?`,[pi.id]);
    // Handle recurring - generate next PI
    if (pi.is_recurring && pi.next_renewal_date) {
      const nextDate = new Date(pi.next_renewal_date);
      if (pi.recurring_interval==='monthly') nextDate.setMonth(nextDate.getMonth()+1);
      else if (pi.recurring_interval==='quarterly') nextDate.setMonth(nextDate.getMonth()+3);
      else if (pi.recurring_interval==='half_yearly') nextDate.setMonth(nextDate.getMonth()+6);
      else if (pi.recurring_interval==='yearly') nextDate.setFullYear(nextDate.getFullYear()+1);
      await db.query(`UPDATE proforma_invoices SET next_renewal_date=?,status='sent' WHERE id=?`,[nextDate.toISOString().split('T')[0],pi.id]);
    }
    res.json({ message:'Invoice created', id:r.insertId, invoice_number:inv_num });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── INVOICES ────────────────────────────────────────────────────────────────

router.get('/invoices', auth(['owner','hr']), async (req, res) => {
  const [rows] = await db.query(`SELECT i.*,p.name as party_name,p.state as party_state FROM invoices i LEFT JOIN parties p ON i.party_id=p.id ORDER BY i.created_at DESC`);
  res.json(rows);
});

router.get('/invoices/:id', auth(['owner','hr']), async (req, res) => {
  const [[inv]]  = await db.query(`SELECT i.*,p.name as party_name,p.gstin as party_gstin,p.address as party_address,p.city as party_city,p.state as party_state,p.pincode as party_pincode FROM invoices i LEFT JOIN parties p ON i.party_id=p.id WHERE i.id=?`,[req.params.id]);
  const [items]  = await db.query(`SELECT * FROM document_items WHERE document_type='invoice' AND document_id=?`,[req.params.id]);
  const [[comp]] = await db.query('SELECT * FROM company_settings LIMIT 1');
  const [payments]= await db.query('SELECT * FROM payment_receipts WHERE invoice_id=?',[req.params.id]);
  res.json({ ...inv, items, company: comp, payments });
});

router.post('/invoices', auth(['owner','hr']), async (req, res) => {
  try {
    const { party_id,project_id,issue_date,due_date,items,notes,terms,tds_percent=0 } = req.body;
    const [[party]]  = await db.query('SELECT * FROM parties WHERE id=?',[party_id]);
    const [[comp]]   = await db.query('SELECT * FROM company_settings LIMIT 1');
    const calc       = calcGST(items, party?.state, comp?.state||'Gujarat');
    const tds_amount = (calc.taxable_amount * tds_percent)/100;
    const total      = calc.total - tds_amount;
    const [[{cnt}]]  = await db.query('SELECT COUNT(*)+1 as cnt FROM invoices');
    const inv_num    = nextNumber('INV', cnt);
    const [r] = await db.query(
      `INSERT INTO invoices (invoice_number,party_id,project_id,issue_date,due_date,subtotal,discount_amount,taxable_amount,cgst_amount,sgst_amount,igst_amount,tds_percent,tds_amount,total,balance_due,gst_type,notes,terms,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [inv_num,party_id,project_id,issue_date,due_date,calc.subtotal,calc.discount_amount,calc.taxable_amount,calc.cgst_amount,calc.sgst_amount,calc.igst_amount,tds_percent,tds_amount,total,total,calc.gst_type,notes,terms,req.user.id]
    );
    for (const it of items) {
      const base = it.quantity * it.unit_price;
      const disc = (base*(it.discount_percent||0))/100;
      await db.query(
        `INSERT INTO document_items (document_type,document_id,description,hsn_sac_code,quantity,unit,unit_price,discount_percent,amount,gst_rate,cgst_rate,sgst_rate,igst_rate)
         VALUES ('invoice',?,?,?,?,?,?,?,?,?,?,?,?)`,
        [r.insertId,it.description,it.hsn_sac_code,it.quantity,it.unit||'nos',it.unit_price,it.discount_percent||0,base-disc,it.gst_rate||18,it.gst_rate/2||9,it.gst_rate/2||9,it.gst_rate||18]
      );
    }
    res.json({ message:'Invoice created', id:r.insertId, invoice_number:inv_num });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// RECORD PAYMENT
router.post('/invoices/:id/payment', auth(['owner','hr']), async (req, res) => {
  try {
    const { amount, payment_date, payment_mode, reference_number, notes } = req.body;
    const [[inv]] = await db.query('SELECT * FROM invoices WHERE id=?',[req.params.id]);
    const paid    = parseFloat(inv.amount_paid) + parseFloat(amount);
    const balance = parseFloat(inv.total) - paid;
    const status  = balance <= 0 ? 'paid' : 'partial';
    await db.query('INSERT INTO payment_receipts (invoice_id,amount,payment_date,payment_mode,reference_number,notes) VALUES (?,?,?,?,?,?)',
      [req.params.id,amount,payment_date,payment_mode,reference_number,notes]);
    await db.query('UPDATE invoices SET amount_paid=?,balance_due=?,status=?,payment_mode=?,payment_date=? WHERE id=?',
      [paid,balance,status,payment_mode,payment_date,req.params.id]);
    await db.query(`INSERT INTO transactions (type,reference_type,reference_id,title,amount,date,payment_mode) VALUES ('income','invoice',?,?,?,?,?)`,
      [req.params.id,`Payment — ${inv.invoice_number}`,amount,payment_date,payment_mode]);
    res.json({ message:'Payment recorded', status, balance });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── GST FILING ──────────────────────────────────────────────────────────────

router.get('/gst-summary', auth(['owner','hr']), async (req, res) => {
  try {
    const month = req.query.month || new Date().getMonth()+1;
    const year  = req.query.year  || new Date().getFullYear();
    const [invoices] = await db.query(
      `SELECT i.*,p.name as party_name,p.gstin as party_gstin,p.state as party_state
       FROM invoices i LEFT JOIN parties p ON i.party_id=p.id
       WHERE MONTH(i.issue_date)=? AND YEAR(i.issue_date)=? AND i.status NOT IN ('draft','cancelled')`,
      [month,year]
    );
    const totals = invoices.reduce((acc,inv)=>({
      total_sales:    acc.total_sales    + parseFloat(inv.total),
      total_taxable:  acc.total_taxable  + parseFloat(inv.taxable_amount),
      total_cgst:     acc.total_cgst     + parseFloat(inv.cgst_amount),
      total_sgst:     acc.total_sgst     + parseFloat(inv.sgst_amount),
      total_igst:     acc.total_igst     + parseFloat(inv.igst_amount),
      total_gst:      acc.total_gst      + parseFloat(inv.cgst_amount)+parseFloat(inv.sgst_amount)+parseFloat(inv.igst_amount),
    }),{total_sales:0,total_taxable:0,total_cgst:0,total_sgst:0,total_igst:0,total_gst:0});
    res.json({ month, year, invoices, ...totals });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// RECURRING - get all due
router.get('/recurring-due', auth(['owner','hr']), async (req, res) => {
  const [rows] = await db.query(
    `SELECT pi.*,p.name as party_name FROM proforma_invoices pi
     LEFT JOIN parties p ON pi.party_id=p.id
     WHERE pi.is_recurring=1 AND pi.status='sent' AND pi.next_renewal_date<=CURDATE()
     ORDER BY pi.next_renewal_date ASC`
  );
  res.json(rows);
});

module.exports = router;
