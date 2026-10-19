// Face-scan attendance: employee face enrolment (HR/Owner), kiosk devices, and kiosk scans.
//
// How it works
// - The browser (kiosk tablet / HR enrolment screen) runs face-api.js and turns a face into a
//   128-number "descriptor". Photos and descriptors are sent here; matching happens on the server,
//   so stored face data never leaves the server.
// - A kiosk device gets its own long-lived token (signed with a different secret than user logins),
//   so it can only call the kiosk endpoints and can be switched off from the Face Attendance page.
const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const db     = require('../db/db');
const auth   = require('../middleware/auth');
const { getIST, doCheckIn, doCheckOut, AttendanceError } = require('./attendance');

const MATCH_THRESHOLD = Number(process.env.FACE_MATCH_THRESHOLD || 0.5); // lower = stricter
const MATCH_MARGIN    = 0.06;  // best match must beat the next person by this much
const MIN_GAP_MINUTES = Number(process.env.FACE_MIN_GAP_MINUTES || 30); // check-in → check-out
const MAX_PHOTO_CHARS = 400 * 1024;

const kioskSecret = () => `${process.env.JWT_SECRET}::kiosk`;

// ─── helpers ────────────────────────────────────────────────────────────────
const isDescriptor = d => Array.isArray(d) && d.length === 128 && d.every(n => typeof n === 'number' && Number.isFinite(n));
const cleanPhoto = p => (typeof p === 'string' && p.startsWith('data:image/') && p.length <= MAX_PHOTO_CHARS) ? p : null;
const distance = (a, b) => { let s = 0; for (let i = 0; i < 128; i++) { const d = a[i] - b[i]; s += d * d; } return Math.sqrt(s); };
const minutes = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };

let cache = null; // [{ user_id, name, descriptor }]
async function profiles() {
  if (!cache) {
    const [rows] = await db.query(
      `SELECT f.user_id, u.name, f.descriptor FROM face_profiles f JOIN users u ON u.id=f.user_id`);
    cache = rows.map(r => ({ user_id: r.user_id, name: r.name, descriptor: JSON.parse(r.descriptor) }));
  }
  return cache;
}
const clearCache = () => { cache = null; };

// Best match per person (closest of their samples), then compare the top two people.
function findMatch(descriptor, list) {
  const best = new Map();
  for (const p of list) {
    const d = distance(descriptor, p.descriptor);
    const cur = best.get(p.user_id);
    if (!cur || d < cur.distance) best.set(p.user_id, { user_id: p.user_id, name: p.name, distance: d });
  }
  const ranked = [...best.values()].sort((a, b) => a.distance - b.distance);
  const [first, second] = ranked;
  if (!first || first.distance > MATCH_THRESHOLD) return { match: null, closest: first?.distance };
  if (second && second.distance - first.distance < MATCH_MARGIN) return { match: null, closest: first.distance, ambiguous: true };
  return { match: first };
}

function kioskAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Kiosk not set up' });
  try {
    const decoded = jwt.verify(token, kioskSecret());
    if (!decoded.kiosk || !decoded.device_id) throw new Error('bad token');
    req.deviceId = decoded.device_id;
    next();
  } catch { res.status(401).json({ message: 'Kiosk not set up' }); }
}

async function activeDevice(id) {
  const [[d]] = await db.query('SELECT * FROM kiosk_devices WHERE id=? AND is_active=1', [id]);
  return d;
}

async function logScan({ device_id, user_id = null, action, distance: dist = null, message, photo }) {
  const { date, time } = getIST();
  await db.query(
    `INSERT INTO face_scan_logs (device_id,user_id,scan_date,scan_time,action,distance,message,photo)
     VALUES (?,?,?,?,?,?,?,?)`,
    [device_id, user_id, date, time, action, dist == null ? null : Number(dist.toFixed(3)), message?.slice(0, 255), photo]
  );
}

// ─── ENROLMENT (HR / Owner) ──────────────────────────────────────────────────
router.get('/people', auth(['owner','hr']), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.name, u.role, u.avatar, e.department, e.designation,
             COUNT(f.id) AS samples, MAX(f.created_at) AS enrolled_at,
             (SELECT f2.photo FROM face_profiles f2 WHERE f2.user_id=u.id AND f2.photo IS NOT NULL ORDER BY f2.id LIMIT 1) AS photo
      FROM users u
      LEFT JOIN employees e ON e.user_id=u.id
      LEFT JOIN face_profiles f ON f.user_id=u.id
      WHERE u.role IN ('owner','hr','team')
      GROUP BY u.id, u.name, u.role, u.avatar, e.department, e.designation
      ORDER BY u.name`);
    res.json(rows.map(r => ({ ...r, samples: Number(r.samples) })));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/enroll', auth(['owner','hr']), async (req, res) => {
  try {
    const { user_id, descriptors, photo } = req.body;
    if (!user_id) return res.status(400).json({ message: 'Choose an employee' });
    if (!Array.isArray(descriptors) || descriptors.length < 3 || descriptors.length > 10 || !descriptors.every(isDescriptor))
      return res.status(400).json({ message: 'Face capture incomplete — please scan again' });
    const [[u]] = await db.query("SELECT id,name FROM users WHERE id=? AND role IN ('owner','hr','team')", [user_id]);
    if (!u) return res.status(404).json({ message: 'Employee not found' });

    // Refuse if this face already belongs to someone else (avoids two people sharing one face profile).
    const others = (await profiles()).filter(p => p.user_id !== u.id);
    const clash = findMatch(descriptors[0], others).match;
    if (clash) return res.status(409).json({ message: `This face is already registered for ${clash.name}` });

    await db.query('DELETE FROM face_profiles WHERE user_id=?', [u.id]);
    const keepPhoto = cleanPhoto(photo);
    for (let i = 0; i < descriptors.length; i++) {
      await db.query('INSERT INTO face_profiles (user_id,descriptor,photo,created_by) VALUES (?,?,?,?)',
        [u.id, JSON.stringify(descriptors[i].map(n => Number(n.toFixed(6)))), i === 0 ? keepPhoto : null, req.user.id]);
    }
    clearCache();
    res.json({ message: `Face registered for ${u.name}` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/enroll/:userId', auth(['owner','hr']), async (req, res) => {
  try {
    await db.query('DELETE FROM face_profiles WHERE user_id=?', [req.params.userId]);
    clearCache();
    res.json({ message: 'Face removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── KIOSK DEVICES (HR / Owner) ──────────────────────────────────────────────
router.post('/kiosk/activate', auth(['owner','hr']), async (req, res) => {
  try {
    const name = String(req.body.name || 'Office kiosk').trim().slice(0, 100) || 'Office kiosk';
    const [r] = await db.query('INSERT INTO kiosk_devices (name,created_by) VALUES (?,?)', [name, req.user.id]);
    const token = jwt.sign({ kiosk: true, device_id: r.insertId }, kioskSecret(), { expiresIn: '3650d' });
    res.json({ token, device: { id: r.insertId, name } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/kiosk/devices', auth(['owner','hr']), async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT d.*, u.name AS created_by_name FROM kiosk_devices d
      LEFT JOIN users u ON u.id=d.created_by ORDER BY d.is_active DESC, d.id DESC`);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/kiosk/devices/:id', auth(['owner','hr']), async (req, res) => {
  try {
    await db.query('UPDATE kiosk_devices SET is_active=0 WHERE id=?', [req.params.id]);
    res.json({ message: 'Kiosk switched off' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── SCAN LOG (HR / Owner) ───────────────────────────────────────────────────
router.get('/logs', auth(['owner','hr']), async (req, res) => {
  try {
    const date = req.query.date || getIST().date;
    const [rows] = await db.query(`
      SELECT l.id, l.scan_date, l.scan_time, l.action, l.distance, l.message, l.user_id,
             (l.photo IS NOT NULL) AS has_photo, u.name AS user_name, d.name AS device_name
      FROM face_scan_logs l
      LEFT JOIN users u ON u.id=l.user_id
      LEFT JOIN kiosk_devices d ON d.id=l.device_id
      WHERE l.scan_date=? ORDER BY l.scan_time DESC, l.id DESC`, [date]);
    res.json(rows.map(r => ({ ...r, has_photo: !!Number(r.has_photo) })));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/logs/:id/photo', auth(['owner','hr']), async (req, res) => {
  try {
    const [[r]] = await db.query('SELECT photo FROM face_scan_logs WHERE id=?', [req.params.id]);
    res.json({ photo: r?.photo || null });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── KIOSK (device token) ────────────────────────────────────────────────────
router.get('/kiosk/me', kioskAuth, async (req, res) => {
  try {
    const d = await activeDevice(req.deviceId);
    if (!d) return res.status(401).json({ message: 'This kiosk has been switched off' });
    const [[{ n }]] = await db.query('SELECT COUNT(DISTINCT user_id) AS n FROM face_profiles');
    res.json({ device: { id: d.id, name: d.name }, enrolled: Number(n) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

const lastScan = new Map(); // device_id → ms, simple flood guard

router.post('/kiosk/scan', kioskAuth, async (req, res) => {
  try {
    const now = Date.now();
    if (now - (lastScan.get(req.deviceId) || 0) < 1000) return res.status(429).json({ message: 'Too fast' });
    lastScan.set(req.deviceId, now);

    const device = await activeDevice(req.deviceId);
    if (!device) return res.status(401).json({ message: 'This kiosk has been switched off' });
    const ist = getIST();
    await db.query('UPDATE kiosk_devices SET last_seen=? WHERE id=?', [`${ist.date} ${ist.time}`, device.id]); // stored in IST

    const { descriptor } = req.body;
    if (!isDescriptor(descriptor)) return res.status(400).json({ message: 'No face data' });
    const photo = cleanPhoto(req.body.photo);

    const { match, closest, ambiguous } = findMatch(descriptor, await profiles());
    if (!match) {
      const message = ambiguous ? 'Face unclear — please look straight at the camera' : 'Face not recognised';
      await logScan({ device_id: device.id, action: 'unknown', distance: closest, message, photo });
      return res.json({ result: 'unknown', message });
    }

    const uid = match.user_id;
    const { date, time } = getIST();
    const [[rec]] = await db.query('SELECT check_in,check_out FROM attendance WHERE user_id=? AND date=?', [uid, date]);
    let result, out;
    try {
      if (!rec?.check_in) {
        out = await doCheckIn(uid, 'face_kiosk');
        result = 'checked_in';
      } else if (!rec.check_out) {
        const since = minutes(time) - minutes(rec.check_in);
        if (since < MIN_GAP_MINUTES) {
          result = 'already_in';
          out = { message: `Already checked in at ${rec.check_in.slice(0, 5)}`, time: rec.check_in };
        } else {
          out = await doCheckOut(uid);
          result = 'checked_out';
        }
      } else {
        result = 'done';
        out = { message: `Already checked out today at ${rec.check_out.slice(0, 5)}`, time: rec.check_out };
      }
    } catch (err) {
      if (!(err instanceof AttendanceError)) throw err;
      result = 'blocked';
      out = { message: err.message };
    }

    await logScan({ device_id: device.id, user_id: uid, action: result, distance: match.distance, message: out.message, photo });
    res.json({ result, name: match.name, user_id: uid, message: out.message, time: out.time?.slice(0, 5), status: out.status });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
module.exports._findMatch = findMatch; // for tests
