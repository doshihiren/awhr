const router = require('express').Router();
const db     = require('../db/db');
const auth   = require('../middleware/auth');

// ─── Office rules (IST) ───────────────────────────────────────────────────────
const OFFICE_START_H  = 10;  // 10:00 AM
const OFFICE_END_H    = 19;  // 07:00 PM
const MIDDAY_H        = 13;  // 01:00 PM = end of first half, start of second half
const LATE_AFTER      = process.env.ATT_LATE_AFTER || '10:15';          // check-in after this = late mark
const FULL_DAY_MINS   = Number(process.env.ATT_FULL_DAY_HOURS || 6) * 60; // net hours below this = half day
const RULES = { office_start: '10:00', office_end: '19:00', late_after: LATE_AFTER, full_day_minutes: FULL_DAY_MINS };

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
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
}

const isLate = check_in => !!check_in && String(check_in).slice(0, 5) > LATE_AFTER;

/**
 * Net working minutes = (check-out − check-in) − lunch break.
 * Still working (no check-out) → counted up to `now`. Out for lunch and never came back → work ends at lunch-out.
 */
function workedMinutes({ check_in, check_out, lunch_out, lunch_in }, now = null) {
  if (!check_in) return 0;
  const start = timeToMinutes(check_in);
  let end = check_out ? timeToMinutes(check_out) : now ? timeToMinutes(now) : start;
  let lunch = 0;
  if (lunch_out) {
    const lo = timeToMinutes(lunch_out);
    if (lunch_in) lunch = Math.max(0, timeToMinutes(lunch_in) - lo);
    else end = Math.min(end, lo);               // on lunch now, or left during lunch
  }
  return Math.max(0, end - start - lunch);
}

const fmtMins = m => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;

/**
 * Status once the day is finished:
 *   - net worked ≥ 6h                  → 'present'
 *   - less than 6h, came after 1 PM    → 'half_day_first'  (missed the morning)
 *   - less than 6h otherwise           → 'half_day_second' (left early / short hours)
 * No check-out yet → 'present' (decided at check-out). Late mark is separate (check-in after 10:15).
 */
function computeStatus(check_in, check_out, lunch_out = null, lunch_in = null) {
  if (!check_in)  return 'absent';
  if (!check_out) return 'present';
  if (workedMinutes({ check_in, check_out, lunch_out, lunch_in }) >= FULL_DAY_MINS) return 'present';
  return timeToMinutes(check_in) >= MIDDAY_H * 60 ? 'half_day_first' : 'half_day_second';
}

// Extra fields every screen uses: late mark, net minutes, whether hours are short.
function decorate(r, today = null, now = null) {
  if (!r) return r;
  const live = !r.check_out && r.date && String(r.date).slice(0, 10) === today ? now : null;
  const worked = workedMinutes(r, live);
  return {
    ...r,
    late: isLate(r.check_in),
    worked_minutes: worked,
    hours_short: !!(r.check_in && r.check_out && worked < FULL_DAY_MINS),
    missed_checkout: !!(r.check_in && !r.check_out && r.date && String(r.date).slice(0, 10) < (today || '')),
    on_lunch: !!(r.lunch_out && !r.lunch_in && !r.check_out),
  };
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

async function notify(uid, title, message) {
  try {
    await db.query('INSERT INTO notifications (user_id,title,message,type,action_url) VALUES (?,?,?,?,?)',
      [uid, title, message, 'attendance', '/my-attendance']);
  } catch (e) { /* notifications are best-effort */ }
}

// ─── Shared attendance actions (used by the dashboard buttons and the face kiosk) ──
class AttendanceError extends Error {}

async function todayRecord(uid) {
  const { date } = getIST();
  const [[record]] = await db.query('SELECT * FROM attendance WHERE user_id=? AND date=?', [uid, date]);
  return record;
}

async function doCheckIn(uid, method = 'self') {
  const { date, time } = getIST();
  const dayStatus = await getDayStatus(date);
  if (dayStatus === 'holiday') throw new AttendanceError('Today is a holiday!');
  const existing = await todayRecord(uid);
  if (existing?.check_in) throw new AttendanceError(`Already checked in at ${existing.check_in.slice(0,5)}`);

  const inMin = timeToMinutes(time);
  const initialStatus = inMin >= MIDDAY_H * 60 ? 'half_day_first' : 'present';

  await db.query(
    `INSERT INTO attendance (user_id,date,check_in,status,method) VALUES (?,?,?,?,?)
     ON DUPLICATE KEY UPDATE check_in=?,status=?,method=?`,
    [uid, date, time, initialStatus, method, time, initialStatus, method]
  );
  const late = isLate(time);
  const note = initialStatus === 'half_day_first' ? ' — after 1 PM, first half marked as leave'
             : late ? ` — late mark (after ${LATE_AFTER})` : '';
  return { message: `Checked in at ${time.slice(0,5)}${note}`, time, date, status: initialStatus, late };
}

async function doLunchOut(uid) {
  const { time } = getIST();
  const r = await todayRecord(uid);
  if (!r?.check_in) throw new AttendanceError('Please check in first');
  if (r.check_out)  throw new AttendanceError('You have already checked out today');
  if (r.lunch_out)  throw new AttendanceError(`Lunch already marked out at ${r.lunch_out.slice(0,5)}`);
  await db.query('UPDATE attendance SET lunch_out=? WHERE user_id=? AND date=?', [time, uid, r.date]);
  return { message: `Lunch out at ${time.slice(0,5)} — enjoy your meal 🍱`, time };
}

async function doLunchIn(uid) {
  const { time } = getIST();
  const r = await todayRecord(uid);
  if (!r?.check_in)  throw new AttendanceError('Please check in first');
  if (r.check_out)   throw new AttendanceError('You have already checked out today');
  if (!r.lunch_out)  throw new AttendanceError('Mark lunch out first');
  if (r.lunch_in)    throw new AttendanceError(`Lunch already marked in at ${r.lunch_in.slice(0,5)}`);
  await db.query('UPDATE attendance SET lunch_in=? WHERE user_id=? AND date=?', [time, uid, r.date]);
  const mins = Math.max(0, timeToMinutes(time) - timeToMinutes(r.lunch_out));
  return { message: `Back from lunch at ${time.slice(0,5)} (${mins} min break)`, time };
}

async function doCheckOut(uid) {
  const { date, time } = getIST();
  const record = await todayRecord(uid);
  if (!record?.check_in) throw new AttendanceError('Please check in first');
  if (record.check_out)  throw new AttendanceError(`Already checked out at ${record.check_out.slice(0,5)}. Check-out is once per day.`);

  const finalStatus = computeStatus(record.check_in, time, record.lunch_out, record.lunch_in);
  await db.query('UPDATE attendance SET check_out=?,status=? WHERE user_id=? AND date=?',
    [time, finalStatus, uid, date]);

  const worked = workedMinutes({ ...record, check_out: time });
  const short = worked < FULL_DAY_MINS;
  if (short) {
    await notify(uid, 'Work hours not completed',
      `On ${date.split('-').reverse().join('/')} you worked ${fmtMins(worked)} (${FULL_DAY_MINS / 60} hours needed). This day is marked as a half day.`);
  }
  const message = short
    ? `Checked out at ${time.slice(0,5)} — work hours not completed (${fmtMins(worked)} of ${FULL_DAY_MINS / 60}h). Marked as half day.`
    : `Checked out at ${time.slice(0,5)} — ${fmtMins(worked)} worked ✅`;
  return { message, time, status: finalStatus, worked_minutes: worked, hours_short: short };
}

// Daily job: remind people who forgot to check out (last 7 days, once per day-record).
async function notifyMissedCheckouts() {
  const { date } = getIST();
  const [rows] = await db.query(
    `SELECT user_id, date FROM attendance
     WHERE check_in IS NOT NULL AND check_out IS NULL AND COALESCE(alerted,0)=0
       AND date < ? AND date >= DATE_SUB(?, INTERVAL 7 DAY)`, [date, date]);
  for (const r of rows) {
    const d = String(r.date).slice(0, 10);
    await notify(r.user_id, 'Work hours not completed',
      `You did not check out on ${d.split('-').reverse().join('/')}, so your working hours are incomplete. Please tell HR your leaving time.`);
    await db.query('UPDATE attendance SET alerted=1 WHERE user_id=? AND date=?', [r.user_id, d]);
  }
  return rows.length;
}

const sendErr = (res, err) =>
  res.status(err instanceof AttendanceError ? 400 : 500).json({ message: err.message });

// ─── CHECK IN / LUNCH / CHECK OUT ─────────────────────────────────────────────
router.post('/checkin', auth(), async (req, res) => {
  try { res.json(await doCheckIn(req.user.id, req.body.method || 'self')); }
  catch (err) { sendErr(res, err); }
});
router.post('/lunch-out', auth(), async (req, res) => {
  try { res.json(await doLunchOut(req.user.id)); } catch (err) { sendErr(res, err); }
});
router.post('/lunch-in', auth(), async (req, res) => {
  try { res.json(await doLunchIn(req.user.id)); } catch (err) { sendErr(res, err); }
});
router.post('/checkout', auth(), async (req, res) => {
  try { res.json(await doCheckOut(req.user.id)); }
  catch (err) { sendErr(res, err); }
});

// ─── TODAY STATUS ────────────────────────────────────────────────────────────
router.get('/today', auth(), async (req, res) => {
  try {
    const uid = req.user.id;
    const { date, time } = getIST();
    const [[record]] = await db.query('SELECT * FROM attendance WHERE user_id=? AND date=?', [uid, date]);
    const dayStatus  = await getDayStatus(date);
    const [holidays] = await db.query('SELECT * FROM holidays WHERE date=?', [date]);
    res.json({ record: record ? decorate(record, date, time) : null, dayStatus, holiday: holidays[0] || null,
      today: date, now: time, rules: RULES });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── MY ATTENDANCE ───────────────────────────────────────────────────────────
router.get('/my/:month/:year', auth(), async (req, res) => {
  try {
    const { month, year } = req.params;
    const { date, time } = getIST();
    const [rows]  = await db.query(
      'SELECT * FROM attendance WHERE user_id=? AND MONTH(date)=? AND YEAR(date)=? ORDER BY date',
      [req.user.id, month, year]
    );
    const [hols]  = await db.query('SELECT * FROM holidays WHERE MONTH(date)=? AND YEAR(date)=?', [month, year]);
    const [rules] = await db.query('SELECT * FROM attendance_rules WHERE is_active=1');
    res.json({ attendance: rows.map(r => decorate(r, date, time)), holidays: hols, rules, office: RULES });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── MONTHLY REPORT — HR/Owner: every employee, every day, with totals ───────
router.get('/report', auth(['owner','hr']), async (req, res) => {
  try {
    const { date: today, time } = getIST();
    const month = Number(req.query.month) || Number(today.slice(5, 7));
    const year  = Number(req.query.year)  || Number(today.slice(0, 4));
    const pad = n => String(n).padStart(2, '0');
    const D = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const days = [];
    for (let d = 1; d <= D; d++) {
      const ds = `${year}-${pad(month)}-${pad(d)}`;
      days.push({ date: ds, day: new Date(ds + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' }),
        type: await getDayStatus(ds), future: ds > today });
    }
    const [emps] = await db.query(`
      SELECT u.id,u.name,e.department,e.designation,e.date_of_joining
      FROM users u LEFT JOIN employees e ON e.user_id=u.id LEFT JOIN employee_details ed ON ed.user_id=u.id
      WHERE u.role IN ('hr','team') AND COALESCE(ed.status,'active')='active' ORDER BY u.name`);
    const [rows] = await db.query('SELECT * FROM attendance WHERE MONTH(date)=? AND YEAR(date)=?', [month, year]);
    const byUser = {};
    for (const r of rows) (byUser[r.user_id] = byUser[r.user_id] || {})[String(r.date).slice(0, 10)] = decorate(r, today, time);

    const employees = emps.map(e => {
      const t = { present: 0, half: 0, leave: 0, absent: 0, late: 0, short: 0, missed_out: 0, worked_minutes: 0, holidays: 0 };
      const doj = e.date_of_joining ? String(e.date_of_joining).slice(0, 10) : null;
      const cells = days.map(d => {
        const r = byUser[e.id]?.[d.date] || null;
        let code = '';
        if (doj && d.date < doj) code = '';
        else if (r?.status === 'leave') code = 'L';
        else if (r?.check_in) code = r.status?.startsWith('half_day') ? 'H' : 'P';
        else if (d.type === 'holiday') code = 'WO';
        else if (r?.status === 'absent' || (!d.future && d.date < today)) code = 'A';
        if (code === 'P') t.present++; else if (code === 'H') t.half++; else if (code === 'L') t.leave++;
        else if (code === 'A') t.absent++; else if (code === 'WO') t.holidays++;
        if (r?.late) t.late++;
        if (r?.hours_short) t.short++;
        if (r?.missed_checkout) t.missed_out++;
        t.worked_minutes += r?.worked_minutes || 0;
        return { code, check_in: r?.check_in || null, check_out: r?.check_out || null, lunch_out: r?.lunch_out || null,
          lunch_in: r?.lunch_in || null, worked_minutes: r?.worked_minutes || 0, late: !!r?.late, hours_short: !!r?.hours_short,
          missed_checkout: !!r?.missed_checkout, status: r?.status || null };
      });
      return { id: e.id, name: e.name, department: e.department, designation: e.designation, cells, totals: t };
    });
    res.json({ month, year, days, employees, rules: RULES });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── ALL ATTENDANCE — HR/Owner ────────────────────────────────────────────────
router.get('/all', auth(['owner','hr']), async (req, res) => {
  try {
    const date = req.query.date || getIST().date;
    const [rows] = await db.query(`
      SELECT u.id,u.name,u.avatar,u.role,
             a.date,a.check_in,a.check_out,a.lunch_out,a.lunch_in,a.status,a.method
      FROM users u
      LEFT JOIN attendance a ON u.id=a.user_id AND a.date=?
      WHERE u.role IN ('hr','team')
      ORDER BY u.name
    `, [date]);
    const dayStatus = await getDayStatus(date);
    const todayIST  = getIST().date;
    const nowIST = getIST();
    const processed = rows.map(r => ({
      ...decorate(r, nowIST.date, nowIST.time),
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
      const [[lunch]] = await db.query('SELECT lunch_out,lunch_in FROM attendance WHERE user_id=? AND date=?', [user_id, date]);
      finalStatus = computeStatus(check_in, effectiveCheckOut, lunch?.lunch_out, lunch?.lunch_in);
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
module.exports.doCheckIn = doCheckIn;
module.exports.doLunchOut = doLunchOut;
module.exports.doLunchIn = doLunchIn;
module.exports.todayRecord = todayRecord;
module.exports.notifyMissedCheckouts = notifyMissedCheckouts;
module.exports.workedMinutes = workedMinutes;
module.exports.computeStatus = computeStatus;
module.exports.RULES = RULES;
module.exports.getDayStatus = getDayStatus;
module.exports.doCheckOut = doCheckOut;
module.exports.AttendanceError = AttendanceError;
