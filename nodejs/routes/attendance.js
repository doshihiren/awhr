const router = require('express').Router();
const db     = require('../db/db');
const auth   = require('../middleware/auth');

// ─── Office hours (IST) ───────────────────────────────────────────────────────
const OFFICE_START_H  = 10;  // 10:00 AM
const OFFICE_END_H    = 19;  // 07:00 PM
const MIDDAY_H        = 13;  // 01:00 PM = end of first half, start of second half
const HALF_DAY_MINS   = 4.5 * 60; // < 4h30 worked = half day threshold

function getIST() {
  const now   = new Date();
  const istMs = now.getTime() + (5.5 * 60 * 60 * 1000);
  const ist   = new Date(istMs);
  const date  = ist.toISOString().split('T')[0];
  const time  = ist.toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
  return { date, time };
}

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Determine attendance status from check_in + check_out.
 *
 * Rules:
 *   - Both present, worked >= 4.5h               → 'present'
 *   - Checked in after midday (13:00)             → 'half_day_first'  (missed morning = first half leave)
 *   - Checked out before midday (13:00)           → 'half_day_second' (left before afternoon = second half leave)
 *   - Worked < 4.5h (but both halves have some)  → 'half_day_second' (default: early checkout)
 *   - No check_out yet                            → 'present' (still working)
 */
function computeStatus(check_in, check_out) {
  if (!check_in)                return 'absent';
  if (!check_out)               return 'present'; // still working — status decided at checkout

  const inMin  = timeToMinutes(check_in);
  const outMin = timeToMinutes(check_out);
  const worked = outMin - inMin;

  // Came in after midday → missed first half
  if (inMin >= MIDDAY_H * 60)  return 'half_day_first';

  // Left before midday → missed second half (early departure)
  if (outMin <= MIDDAY_H * 60) return 'half_day_second';

  // Worked full enough hours → present
  if (worked >= HALF_DAY_MINS) return 'present';

  // Worked less than threshold but straddled midday → second half short
  return 'half_day_second';
}

async function getDayStatus(date) {
  const [y, m, d] = date.split('-').map(Number);
  const dt  = new Date(Date.UTC(y, m-1, d));
  const dow = dt.getUTCDay();
  const dom = dt.getUTCDate();
  if (dow === 0) return 'holiday';
  if (dow === 6) {
    const [rules] = await db.query('SELECT * FROM attendance_rules WHERE is_active=1');
    if (rules.find(r => r.rule_type === 'all_sat')) return 'holiday';
    const week = Math.ceil(dom / 7);
    if (week === 2 && rules.find(r => r.rule_type === 'second_sat')) return 'holiday';
    if (week === 4 && rules.find(r => r.rule_type === 'fourth_sat')) return 'holiday';
  }
  const [hols] = await db.query('SELECT * FROM holidays WHERE date=?', [date]);
  if (hols.length) return 'holiday';
  return 'working';
}

// ─── CHECK IN ────────────────────────────────────────────────────────────────
router.post('/checkin', auth(), async (req, res) => {
  try {
    const uid = req.user.id;
    const { date, time } = getIST();
    const dayStatus = await getDayStatus(date);
    if (dayStatus === 'holiday') return res.status(400).json({ message: 'Today is a holiday!' });

    // Determine initial status based on check_in time
    const inMin = timeToMinutes(time);
    const initialStatus = inMin >= MIDDAY_H * 60 ? 'half_day_first' : 'present';

    await db.query(
      `INSERT INTO attendance (user_id,date,check_in,status,method) VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE check_in=?,status=?,method=?`,
      [uid, date, time, initialStatus, req.body.method||'self',
       time, initialStatus, req.body.method||'self']
    );
    const note = initialStatus === 'half_day_first'
      ? ' (late arrival — First Half marked as leave)'
      : '';
    res.json({ message: `Checked in at ${time.slice(0,5)}${note}`, time, date, status: initialStatus });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── CHECK OUT — once per day, auto-computes half-day type ───────────────────
router.post('/checkout', auth(), async (req, res) => {
  try {
    const uid = req.user.id;
    const { date, time } = getIST();
    const [[record]] = await db.query('SELECT * FROM attendance WHERE user_id=? AND date=?', [uid, date]);
    if (!record?.check_in) return res.status(400).json({ message: 'Please check in first' });
    if (record.check_out)  return res.status(400).json({ message: `Already checked out at ${record.check_out.slice(0,5)}. Check-out is once per day.` });

    const finalStatus = computeStatus(record.check_in, time);
    await db.query('UPDATE attendance SET check_out=?,status=? WHERE user_id=? AND date=?',
      [time, finalStatus, uid, date]);

    const msgs = {
      present:          'Checked out successfully ✅',
      half_day_first:   'Checked out — First Half leave (late arrival)',
      half_day_second:  'Checked out — Second Half leave (early departure, worked < 4.5h)',
      half_day:         'Checked out — Half Day',
    };
    res.json({ message: msgs[finalStatus] || 'Checked out', time, status: finalStatus });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── TODAY STATUS ────────────────────────────────────────────────────────────
router.get('/today', auth(), async (req, res) => {
  try {
    const uid = req.user.id;
    const { date } = getIST();
    const [[record]] = await db.query('SELECT * FROM attendance WHERE user_id=? AND date=?', [uid, date]);
    const dayStatus  = await getDayStatus(date);
    const [holidays] = await db.query('SELECT * FROM holidays WHERE date=?', [date]);
    res.json({ record: record || null, dayStatus, holiday: holidays[0] || null, today: date });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── MY ATTENDANCE ───────────────────────────────────────────────────────────
router.get('/my/:month/:year', auth(), async (req, res) => {
  try {
    const { month, year } = req.params;
    const [rows]  = await db.query(
      'SELECT * FROM attendance WHERE user_id=? AND MONTH(date)=? AND YEAR(date)=? ORDER BY date',
      [req.user.id, month, year]
    );
    const [hols]  = await db.query('SELECT * FROM holidays WHERE MONTH(date)=? AND YEAR(date)=?', [month, year]);
    const [rules] = await db.query('SELECT * FROM attendance_rules WHERE is_active=1');
    res.json({ attendance: rows, holidays: hols, rules });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── ALL ATTENDANCE — HR/Owner ────────────────────────────────────────────────
router.get('/all', auth(['owner','hr']), async (req, res) => {
  try {
    const date = req.query.date || getIST().date;
    const [rows] = await db.query(`
      SELECT u.id,u.name,u.avatar,u.role,
             a.date,a.check_in,a.check_out,a.status,a.method
      FROM users u
      LEFT JOIN attendance a ON u.id=a.user_id AND a.date=?
      WHERE u.role IN ('hr','team')
      ORDER BY u.name
    `, [date]);
    const dayStatus = await getDayStatus(date);
    const todayIST  = getIST().date;
    const processed = rows.map(r => ({
      ...r,
      status: r.status || (date <= todayIST && dayStatus === 'working' ? 'absent' : null)
    }));
    res.json({ attendance: processed, dayStatus, date });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── MANUAL ENTRY — HR/Owner ──────────────────────────────────────────────────
router.post('/manual-entry', auth(['owner','hr']), async (req, res) => {
  try {
    const { user_id, date, check_in, check_out, status } = req.body;
    const { date: todayIST, time: nowIST } = getIST();
    if (date > todayIST) return res.status(400).json({ message: 'Cannot enter attendance for future dates' });

    // Block future check_in time for today
    if (date === todayIST && check_in && check_in.slice(0,5) > nowIST.slice(0,5)) {
      return res.status(400).json({
        message: `Check-In time (${check_in.slice(0,5)}) cannot be in the future. Current IST time: ${nowIST.slice(0,5)}.`
      });
    }

    // For TODAY: if HR provides only check_in (no check_out), preserve existing check_out
    // so the employee can still clock out themselves later.
    let effectiveCheckOut = check_out || null;
    if (date === todayIST && check_in && !check_out) {
      const [[existing]] = await db.query('SELECT check_out FROM attendance WHERE user_id=? AND date=?', [user_id, date]);
      effectiveCheckOut = existing?.check_out || null;
    }

    // Compute status: use explicit status if provided, else auto-compute from times
    let finalStatus;
    if (status && status !== 'present') {
      // HR manually selected a specific status (absent, leave, half_day_first, half_day_second)
      finalStatus = status;
    } else if (check_in && effectiveCheckOut) {
      finalStatus = computeStatus(check_in, effectiveCheckOut);
    } else if (check_in) {
      // Only check_in — still working today, or historical check_in without checkout
      const inMin = timeToMinutes(check_in);
      finalStatus = inMin >= MIDDAY_H * 60 ? 'half_day_first' : 'present';
    } else {
      finalStatus = status || 'absent';
    }

    await db.query(
      `INSERT INTO attendance (user_id,date,check_in,check_out,status,method)
       VALUES (?,?,?,?,?,'manual')
       ON DUPLICATE KEY UPDATE check_in=?,check_out=?,status=?,method='manual'`,
      [user_id, date, check_in||null, effectiveCheckOut, finalStatus,
       check_in||null, effectiveCheckOut, finalStatus]
    );

    const msg = (date === todayIST && !effectiveCheckOut)
      ? `Check-In updated to ${check_in?.slice(0,5)}. Employee can check out normally at end of day.`
      : `Attendance saved — Status: ${finalStatus.replace(/_/g,' ')}`;
    res.json({ message: msg, status: finalStatus });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── BULK CSV UPLOAD ──────────────────────────────────────────────────────────
router.post('/bulk-upload', auth(['owner','hr']), async (req, res) => {
  try {
    const { records } = req.body;
    const todayIST = getIST().date;
    let inserted = 0, skipped = 0;
    for (const r of records) {
      if (r.date > todayIST) { skipped++; continue; }
      let finalStatus = r.status || 'present';
      if (r.check_in && r.check_out && !r.status) finalStatus = computeStatus(r.check_in, r.check_out);
      try {
        await db.query(
          `INSERT INTO attendance (user_id,date,check_in,check_out,status,method)
           VALUES (?,?,?,?,?,'csv_upload')
           ON DUPLICATE KEY UPDATE check_in=?,check_out=?,status=?,method='csv_upload'`,
          [r.user_id,r.date,r.check_in||null,r.check_out||null,finalStatus,
           r.check_in||null,r.check_out||null,finalStatus]
        );
        inserted++;
      } catch (e) {}
    }
    res.json({ message: `${inserted} records imported`, skipped });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── AUTO MARK ABSENT ─────────────────────────────────────────────────────────
router.post('/mark-absent', auth(['owner','hr']), async (req, res) => {
  try {
    const todayIST  = getIST().date;
    const dayStatus = await getDayStatus(todayIST);
    if (dayStatus === 'holiday') return res.json({ message: 'Holiday — no marking needed' });
    const [users] = await db.query(`
      SELECT u.id FROM users u WHERE u.role IN ('hr','team')
      AND u.id NOT IN (SELECT user_id FROM attendance WHERE date=?)
      AND u.id NOT IN (SELECT user_id FROM leave_requests WHERE ? BETWEEN from_date AND to_date AND status='approved')
    `, [todayIST, todayIST]);
    for (const u of users) {
      await db.query(
        `INSERT INTO attendance (user_id,date,status,method) VALUES (?,?,'absent','auto')
         ON DUPLICATE KEY UPDATE status='absent'`,
        [u.id, todayIST]
      );
    }
    res.json({ message: `${users.length} employees marked absent`, date: todayIST });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── HOLIDAYS ─────────────────────────────────────────────────────────────────
router.get('/holidays', auth(), async (req, res) => {
  const year = req.query.year || getIST().date.split('-')[0];
  const [rows] = await db.query('SELECT * FROM holidays WHERE YEAR(date)=? ORDER BY date', [year]);
  res.json(rows);
});
router.post('/holidays', auth(['owner','hr']), async (req, res) => {
  try {
    const { name, date, type } = req.body;
    await db.query('INSERT INTO holidays (name,date,type) VALUES (?,?,?)', [name, date, type||'national']);
    res.json({ message: 'Holiday added' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
router.put('/holidays/:id', auth(['owner','hr']), async (req, res) => {
  try {
    const { name, date, type } = req.body;
    await db.query('UPDATE holidays SET name=?,date=?,type=? WHERE id=?', [name, date, type, req.params.id]);
    res.json({ message: 'Holiday updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
router.delete('/holidays/:id', auth(['owner','hr']), async (req, res) => {
  await db.query('DELETE FROM holidays WHERE id=?', [req.params.id]);
  res.json({ message: 'Holiday deleted' });
});
router.get('/rules', auth(['owner','hr']), async (req, res) => {
  const [rows] = await db.query('SELECT * FROM attendance_rules');
  res.json(rows);
});
router.put('/rules/:id', auth(['owner','hr']), async (req, res) => {
  await db.query('UPDATE attendance_rules SET is_active=? WHERE id=?', [req.body.is_active, req.params.id]);
  res.json({ message: 'Rule updated' });
});

module.exports = router;
module.exports.getIST = getIST;
