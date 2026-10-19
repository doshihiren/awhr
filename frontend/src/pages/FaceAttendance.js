// HR / Owner: register employee faces, review kiosk scans (with photos), manage kiosk devices.
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';
import { C, FONT_HEAD } from '../theme';
import { Card, StatCard, Badge, Btn, Modal, Avatar, Spinner, showToast } from '../components/UI';
import useIsMobile from '../hooks/useIsMobile';
import { loadFaceEngine, startCamera, stopCamera, detectFace, euclidean, snapshot } from '../lib/faceEngine';

const initials = n => (n || '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
// last_seen is stored as IST "YYYY-MM-DD HH:MM:SS"
const fmtIST = s => { const [d, t] = String(s).split(' '); const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y} ${(t || '').slice(0, 5)}`; };
const istDate = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

const ACTION = {
  checked_in:  ['Checked in', C.green],
  checked_out: ['Checked out', C.blue],
  already_in:  ['Already in', C.yellow],
  done:        ['Already done', C.yellow],
  blocked:     ['Not allowed', C.yellow],
  unknown:     ['Not recognised', C.red],
};

// ─── Register face modal ──────────────────────────────────────────────────────
const SAMPLES = 5;
function EnrolModal({ person, onClose, onSaved }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('Starting camera…');
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [count, setCount] = useState(0);
  const [error, setError] = useState('');
  const faRef = useRef(null);

  useEffect(() => {
    let stream, stopped = false;
    (async () => {
      try {
        const [fa] = await Promise.all([loadFaceEngine(), (async () => { stream = await startCamera(videoRef.current); })()]);
        if (stopped) return;
        faRef.current = fa;
        setReady(true);
        setStatus('Ask the employee to look straight at the camera, then press Capture.');
      } catch (ex) {
        setError(ex.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access and try again.' : ex.message);
      }
    })();
    return () => { stopped = true; stopCamera(stream); };
  }, []);

  const capture = async () => {
    const fa = faRef.current, video = videoRef.current;
    setCapturing(true); setError(''); setCount(0);
    const descs = []; let photo = null; let tries = 0;
    const tips = ['Look straight', 'Turn slightly left', 'Turn slightly right', 'Chin slightly up', 'Look straight again'];
    while (descs.length < SAMPLES && tries < 60) {
      tries++;
      setStatus(tips[descs.length] + '…');
      const { count: n, face } = await detectFace(fa, video);
      if (n === 1 && face.widthRatio > 0.15) {
        if (descs.length && euclidean(descs[0], face.descriptor) > 0.6) {
          setError('A different face appeared. Make sure only the employee is in front of the camera.');
          setCapturing(false); return;
        }
        if (!photo) photo = snapshot(video);
        descs.push(face.descriptor); setCount(descs.length);
        await new Promise(r => setTimeout(r, 450));
      } else {
        setStatus(n > 1 ? 'Only one person should be in the frame' : n === 1 ? 'Move closer to the camera' : 'No face found — look at the camera');
        await new Promise(r => setTimeout(r, 200));
      }
    }
    if (descs.length < SAMPLES) { setError('Could not see the face clearly. Improve the lighting and try again.'); setCapturing(false); return; }
    setStatus('Saving…');
    try {
      const { data } = await api.post('/face/enroll', { user_id: person.id, descriptors: descs, photo });
      showToast(data.message);
      onSaved();
    } catch (ex) {
      setError(ex.response?.data?.message || 'Could not save. Please try again.');
      setCapturing(false); setCount(0);
      setStatus('Press Capture to try again.');
    }
  };

  return (
    <Modal title={`Register face — ${person.name}`} onClose={onClose} width={560}>
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000', aspectRatio: '4 / 3' }}>
        <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }} />
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: '44%', height: '74%', transform: 'translate(-50%,-50%)',
          borderRadius: '50%', border: `3px solid ${C.accent}`, boxShadow: '0 0 0 9999px rgba(0,0,0,.3)' }} />
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '14px 0 8px' }}>
        {Array.from({ length: SAMPLES }).map((_, i) => (
          <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i < count ? C.accent : C.border, transition: 'background .2s' }} />
        ))}
      </div>
      <div style={{ textAlign: 'center', color: C.subtle, fontSize: 14, minHeight: 20 }}>{status}</div>
      {error && <div role="alert" style={{ background: `${C.red}1f`, color: C.red, borderRadius: 10, padding: '10px 14px', fontSize: 13, marginTop: 12 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <Btn outline onClick={onClose}>Cancel</Btn>
        <Btn onClick={capture} disabled={!ready || capturing}>{capturing ? 'Capturing…' : '📸 Capture'}</Btn>
      </div>
      <p style={{ color: C.muted, fontSize: 12, marginTop: 14, lineHeight: 1.6 }}>
        Tip: register in the same place as the kiosk, in normal office lighting, without sunglasses or a mask.
      </p>
    </Modal>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function People({ people, reload }) {
  const [q, setQ] = useState('');
  const [enrol, setEnrol] = useState(null);
  const list = people.filter(p => (p.name + ' ' + (p.department || '') + ' ' + (p.designation || '')).toLowerCase().includes(q.toLowerCase()));
  const remove = async p => {
    if (!window.confirm(`Remove ${p.name}'s face? They won't be able to use the kiosk until registered again.`)) return;
    await api.delete(`/face/enroll/${p.id}`); showToast('Face removed'); reload();
  };
  return (
    <Card>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <input placeholder="🔍 Search employees…" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 320 }} />
        <span style={{ color: C.muted, fontSize: 13 }}>Register each employee once. It takes about 5 seconds.</span>
      </div>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
        {list.map(p => (
          <div key={p.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
            {p.photo
              ? <img src={p.photo} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              : <Avatar initials={p.avatar || initials(p.name)} size={48} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
              <div style={{ color: C.muted, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.designation || p.department || p.role}</div>
              <div style={{ marginTop: 6 }}>{p.samples > 0 ? <Badge color={C.green}>Registered</Badge> : <Badge color={C.yellow}>Not registered</Badge>}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Btn small outline={p.samples > 0} onClick={() => setEnrol(p)}>{p.samples > 0 ? 'Redo' : 'Register'}</Btn>
              {p.samples > 0 && <Btn small outline color={C.red} onClick={() => remove(p)}>Remove</Btn>}
            </div>
          </div>
        ))}
        {!list.length && <div style={{ color: C.muted }}>No employees found.</div>}
      </div>
      {enrol && <EnrolModal person={enrol} onClose={() => setEnrol(null)} onSaved={() => { setEnrol(null); reload(); }} />}
    </Card>
  );
}

function Scans({ date, setDate, logs }) {
  const [photo, setPhoto] = useState(null);
  const isMobile = useIsMobile(700);
  const open = async l => {
    setPhoto({ l, src: null });
    const { data } = await api.get(`/face/logs/${l.id}/photo`);
    setPhoto({ l, src: data.photo });
  };
  return (
    <Card style={{ padding: 0 }}>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>Kiosk scans</h3>
        <input type="date" value={date} max={istDate()} onChange={e => setDate(e.target.value)} style={{ maxWidth: 180 }} />
      </div>
      {!logs.length ? <div style={{ color: C.muted, padding: 20 }}>No scans on this day.</div> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 14 }}>
            <thead><tr>
              {['Time', 'Photo', 'Employee', 'Result', !isMobile && 'Kiosk', !isMobile && 'Match'].filter(Boolean).map(h =>
                <th key={h} style={{ textAlign: 'left', padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {logs.map(l => {
                const [label, color] = ACTION[l.action] || [l.action, C.muted];
                return (
                  <tr key={l.id}>
                    <td style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{l.scan_time?.slice(0, 5)}</td>
                    <td style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}>
                      {l.has_photo ? <Btn small outline onClick={() => open(l)}>View</Btn> : <span style={{ color: C.muted }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}>{l.user_name || <span style={{ color: C.muted }}>Unknown person</span>}</td>
                    <td style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}><Badge color={color}>{label}</Badge></td>
                    {!isMobile && <td style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, color: C.muted }}>{l.device_name || '—'}</td>}
                    {!isMobile && <td style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, color: C.muted }}>{l.distance != null ? `${Math.max(0, Math.round((1 - l.distance) * 100))}%` : '—'}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {photo && (
        <Modal title={`${photo.l.user_name || 'Unknown person'} · ${photo.l.scan_time?.slice(0, 5)}`} onClose={() => setPhoto(null)} width={420}>
          {photo.src ? <img src={photo.src} alt="Scan" style={{ width: '100%', borderRadius: 12, transform: 'scaleX(-1)' }} /> : <Spinner />}
          <div style={{ color: C.muted, fontSize: 13, marginTop: 10 }}>{photo.l.message}</div>
        </Modal>
      )}
    </Card>
  );
}

function Devices({ devices, reload }) {
  const url = `${window.location.origin}/kiosk`;
  const off = async d => {
    if (!window.confirm(`Switch off "${d.name}"? It will stop taking attendance immediately.`)) return;
    await api.delete(`/face/kiosk/devices/${d.id}`); showToast('Kiosk switched off'); reload();
  };
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Set up a kiosk tablet</h3>
        <ol style={{ paddingLeft: 20, color: C.subtle, lineHeight: 1.9, fontSize: 14 }}>
          <li>Mount a tablet or phone at the office entrance at face height, plugged into power.</li>
          <li>Open <b style={{ color: C.text }}>{url}</b> in Chrome (Android) or Safari (iPad).</li>
          <li>Sign in with the owner account and give the kiosk a name, e.g. "Ground floor reception".</li>
          <li>Allow camera access. Staff now just look at the screen: first scan = check-in, later scan = check-out.</li>
        </ol>
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <Btn small onClick={() => { navigator.clipboard?.writeText(url); showToast('Kiosk link copied'); }}>Copy kiosk link</Btn>
          <Btn small outline onClick={() => window.open('/kiosk', '_blank')}>Open kiosk here</Btn>
        </div>
      </Card>
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Kiosk devices</h3>
        {!devices.length && <div style={{ color: C.muted }}>No kiosks set up yet.</div>}
        {devices.map(d => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 22 }}>📱</div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontWeight: 600 }}>{d.name}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>
                Set up by {d.created_by_name || '—'} · Last used {d.last_seen ? fmtIST(d.last_seen) : 'never'}
              </div>
            </div>
            {d.is_active ? <Badge color={C.green}>Active</Badge> : <Badge color={C.muted}>Switched off</Badge>}
            {!!d.is_active && <Btn small outline color={C.red} onClick={() => off(d)}>Switch off</Btn>}
          </div>
        ))}
      </Card>
    </div>
  );
}

export default function FaceAttendance() {
  const isMobile = useIsMobile(900);
  const [tab, setTab] = useState('people');
  const [people, setPeople] = useState(null);
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [date, setDate] = useState(istDate());
  const [error, setError] = useState('');

  const loadPeople = useCallback(() => api.get('/face/people').then(r => setPeople(r.data)).catch(e => setError(e.response?.data?.message || e.message)), []);
  const loadDevices = useCallback(() => api.get('/face/kiosk/devices').then(r => setDevices(r.data)).catch(() => {}), []);
  const loadLogs = useCallback(() => api.get('/face/logs', { params: { date } }).then(r => setLogs(r.data)).catch(() => {}), [date]);

  useEffect(() => { loadPeople(); loadDevices(); }, [loadPeople, loadDevices]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  if (error) return <Card><div style={{ color: C.red }}>Could not load face attendance: {error}</div></Card>;
  if (!people) return <Spinner />;

  const registered = people.filter(p => p.samples > 0).length;
  const ins = logs.filter(l => l.action === 'checked_in').length;
  const outs = logs.filter(l => l.action === 'checked_out').length;
  const unknown = logs.filter(l => l.action === 'unknown').length;
  const active = devices.filter(d => d.is_active).length;

  const tabs = [['people', '👥 Employees'], ['scans', '🕒 Scan log'], ['devices', '📱 Kiosks']];

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24 }}>Face Attendance 🙂</h1>
          <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Staff check in and out by looking at the office kiosk.</div>
        </div>
        <Btn onClick={() => window.open('/kiosk', '_blank')}>Open kiosk ↗</Btn>
      </div>

      <div style={{ display: 'grid', gap: 18, gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)' }}>
        <StatCard label="Faces registered" value={`${registered} / ${people.length}`} icon="🙂" color={registered === people.length ? C.green : C.yellow}
          sub={registered === people.length ? 'Everyone is set up' : `${people.length - registered} still to register`} />
        <StatCard label={date === istDate() ? 'Check-ins today' : 'Check-ins'} value={ins} icon="✅" color={C.green} sub={`${outs} check-outs`} />
        <StatCard label="Unrecognised scans" value={unknown} icon="⚠️" color={unknown ? C.red : C.muted} sub={unknown ? 'Review photos in the scan log' : 'All good'} />
        <StatCard label="Active kiosks" value={active} icon="📱" color={active ? C.accent : C.yellow} sub={active ? 'Taking attendance' : 'Set one up in Kiosks'} />
      </div>

      <div role="tablist" style={{ display: 'flex', gap: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 4, width: 'fit-content', maxWidth: '100%', overflowX: 'auto' }}>
        {tabs.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{
            border: 'none', borderRadius: 9, padding: '8px 16px', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
            background: tab === k ? 'rgba(45,212,191,.12)' : 'transparent', color: tab === k ? C.accent : C.muted,
          }}>{l}</button>
        ))}
      </div>

      {tab === 'people' && <People people={people} reload={loadPeople} />}
      {tab === 'scans' && <Scans date={date} setDate={setDate} logs={logs} />}
      {tab === 'devices' && <Devices devices={devices} reload={loadDevices} />}
    </div>
  );
}
