// Office face-attendance kiosk. Open /kiosk on a tablet at the entrance.
// Employees just look at the camera: first scan of the day = check-in, a later scan = check-out.
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { C, FONT_HEAD, onColor } from '../theme';
import { Btn, Avatar } from '../components/UI';
import { Logo } from '../components/Sidebar';
import useIsMobile from '../hooks/useIsMobile';
import { loadFaceEngine, startCamera, stopCamera, detectFace, euclidean, averageDescriptor, snapshot } from '../lib/faceEngine';

const TOKEN_KEY = 'awelion_kiosk_token';
const kioskApi = axios.create({ baseURL: '/api' });
kioskApi.interceptors.request.use(cfg => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t && !cfg.headers.Authorization) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

const FRAMES_NEEDED = 3;      // consecutive steady frames before sending
const MIN_FACE_WIDTH = 0.18;  // face must fill this share of the frame (stand close)
const RESULT_MS = 3500;

const RESULT_STYLE = {
  checked_in:  { color: C.green,  title: n => `${greet()}, ${first(n)}!`, icon: '✓' },
  checked_out: { color: C.blue,   title: n => `Bye ${first(n)}, have a great evening!`, icon: '👋' },
  lunch_out:   { color: C.yellow, title: n => `Enjoy your lunch, ${first(n)}!`, icon: '🍱' },
  lunch_in:    { color: C.green,  title: n => `Welcome back, ${first(n)}!`, icon: '🍽' },
  already_in:  { color: C.yellow, title: n => `Hi ${first(n)}, you're already in`, icon: 'ℹ' },
  done:        { color: C.yellow, title: n => `Hi ${first(n)}, you're done for today`, icon: 'ℹ' },
  blocked:     { color: C.yellow, title: n => `Hi ${first(n)}`, icon: 'ℹ' },
  unknown:     { color: C.red,    title: () => 'Face not recognised', icon: '✕' },
};
const first = n => (n || '').split(' ')[0];
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return now;
}

const page = {
  minHeight: '100vh', color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  background: `radial-gradient(circle at 15% 15%, #12403c 0, transparent 40%), radial-gradient(circle at 85% 85%, #0c3350 0, transparent 40%), ${C.bg}`,
};
const panel = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28, width: 'min(460px,100%)' };
const lbl = { fontSize: 13, color: C.muted, display: 'grid', gap: 6 };

// ─── Setup: an HR/Owner signs in once to register this tablet as a kiosk ───────
function Setup({ onReady, note }) {
  const [f, setF] = useState({ email: '', password: '', name: 'Office entrance' });
  const [err, setErr] = useState(note || '');
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const { data } = await kioskApi.post('/auth/login', { email: f.email.trim().toLowerCase(), password: f.password });
      if (data.user.role !== 'owner') throw new Error('Only the owner can set up a kiosk');
      const r = await kioskApi.post('/face/kiosk/activate', { name: f.name },
        { headers: { Authorization: `Bearer ${data.token}` } });
      localStorage.setItem(TOKEN_KEY, r.data.token);
      onReady();
    } catch (ex) {
      setErr(ex.response?.data?.message || ex.message);
    } finally { setBusy(false); }
  };
  return (
    <div style={page}>
      <form onSubmit={submit} style={{ ...panel, display: 'grid', gap: 14 }} className="fade-in">
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}><Logo size={52} /></div>
          <h1 style={{ fontSize: 24, margin: '12px 0 6px' }}>Set up attendance kiosk</h1>
          <p style={{ color: C.muted, fontSize: 14 }}>The owner signs in once. After that, this device stays in kiosk mode and staff just look at the camera.</p>
        </div>
        {err && <div role="alert" style={{ background: `${C.red}1f`, color: C.red, borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>{err}</div>}
        <label style={lbl}>Owner email<input type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
        <label style={lbl}>Password<input type="password" required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></label>
        <label style={lbl}>Kiosk name<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="e.g. Ground floor reception" /></label>
        <Btn type="submit" disabled={busy} style={{ padding: 13 }}>{busy ? 'Setting up…' : 'Start kiosk'}</Btn>
        <a href="/login" style={{ textAlign: 'center', color: C.muted, fontSize: 13, textDecoration: 'none' }}>← Back to sign in</a>
      </form>
    </div>
  );
}

// ─── Unlock dialog to leave kiosk mode (HR/Owner password needed) ─────────────
function Unlock({ onClose, onUnlocked }) {
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const submit = async e => {
    e.preventDefault(); setErr('');
    try {
      const { data } = await kioskApi.post('/auth/login', { email: f.email.trim().toLowerCase(), password: f.password });
      if (data.user.role !== 'owner') throw new Error('Only the owner can exit kiosk mode');
      onUnlocked();
    } catch (ex) { setErr(ex.response?.data?.message || ex.message); }
  };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 50, display: 'grid', placeItems: 'center', padding: 16 }}>
      <form onSubmit={submit} style={{ ...panel, display: 'grid', gap: 12 }} className="fade-in">
        <h3 style={{ fontSize: 18 }}>Exit kiosk mode</h3>
        <p style={{ color: C.muted, fontSize: 13 }}>The owner must sign in. This device will stop taking attendance.</p>
        {err && <div role="alert" style={{ color: C.red, fontSize: 13 }}>{err}</div>}
        <label style={lbl}>Email<input type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
        <label style={lbl}>Password<input type="password" required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></label>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn type="button" outline onClick={onClose}>Cancel</Btn>
          <Btn type="submit" color={C.red}>Exit kiosk</Btn>
        </div>
      </form>
    </div>
  );
}

// ─── Running kiosk ────────────────────────────────────────────────────────────
function Scanner({ device, enrolled, onExit }) {
  const now = useClock();
  const narrow = useIsMobile(900);
  const videoRef = useRef(null);
  const [phase, setPhase] = useState('loading'); // loading | running | error
  const [error, setError] = useState('');
  const [hint, setHint] = useState('Starting camera…');
  const [result, setResult] = useState(null);
  const [recent, setRecent] = useState([]);
  const [unlock, setUnlock] = useState(false);
  const [choice, setChoice] = useState(null);

  useEffect(() => {
    let stream, stopped = false, timer;
    const frames = [];
    let busy = false;
    let last = null; // { desc, at, ms }

    const loop = async fa => {
      if (stopped) return;
      const video = videoRef.current;
      try {
        if (!busy && video) {
          const { count, face } = await detectFace(fa, video);
          if (!count) { frames.length = 0; setHint('Look at the camera to mark attendance'); }
          else if (count > 1) { frames.length = 0; setHint('One person at a time, please'); }
          else if (face.widthRatio < MIN_FACE_WIDTH) { frames.length = 0; setHint('Come a little closer'); }
          else {
            const prev = frames[frames.length - 1];
            if (prev && euclidean(prev, face.descriptor) > 0.45) frames.length = 0;
            frames.push(face.descriptor);
            setHint('Hold still…');
            if (frames.length >= FRAMES_NEEDED) {
              const desc = averageDescriptor(frames.splice(0));
              const repeat = last && Date.now() - last.at < last.ms && euclidean(last.desc, desc) < 0.45;
              if (!repeat) {
                busy = true;
                try {
                  let { data } = await kioskApi.post('/face/kiosk/scan', { descriptor: desc, photo: snapshot(video) });
                  if (data.result === 'choose') {
                    // Ask: lunch or leaving? Wait up to 10 s for a tap.
                    const picked = await new Promise(resolve => {
                      const timer = setTimeout(() => resolve(null), 10000);
                      setChoice({ ...data, pick: a => { clearTimeout(timer); resolve(a); } });
                    });
                    setChoice(null);
                    if (!picked) { last = { desc, at: Date.now(), ms: 3000 }; busy = false; timer = setTimeout(() => loop(fa), 200); return; }
                    data = (await kioskApi.post('/face/kiosk/action', { token: data.token, action: picked })).data;
                  }
                  last = { desc, at: Date.now(), ms: data.result === 'unknown' ? 4000 : 15000 };
                  setResult(data);
                  if (data.result !== 'unknown')
                    setRecent(r => [{ ...data, at: new Date() }, ...r].slice(0, 6));
                  try { navigator.vibrate?.(80); } catch {}
                  await new Promise(r => setTimeout(r, RESULT_MS));
                  setResult(null);
                } catch (ex) {
                  if (ex.response?.status === 401) { onExit(true); return; }
                  if (ex.response?.status !== 429) {
                    setResult({ result: 'unknown', message: ex.response?.data?.message || 'Network problem — please try again' });
                    await new Promise(r => setTimeout(r, 2500));
                    setResult(null);
                  }
                } finally { busy = false; }
              }
            }
          }
        }
      } catch { /* a dropped frame is fine */ }
      timer = setTimeout(() => loop(fa), 200);
    };

    (async () => {
      try {
        setHint('Loading face engine…');
        const [fa] = await Promise.all([loadFaceEngine(), (async () => { stream = await startCamera(videoRef.current); })()]);
        if (stopped) return;
        setPhase('running');
        loop(fa);
      } catch (ex) {
        setPhase('error');
        setError(ex.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access for this site and reload.' : ex.message);
      }
    })();

    let wake;
    navigator.wakeLock?.request('screen').then(w => { wake = w; }).catch(() => {});
    return () => { stopped = true; clearTimeout(timer); stopCamera(stream); wake?.release?.().catch(() => {}); };
  }, [onExit]);

  const rs = result && (RESULT_STYLE[result.result] || RESULT_STYLE.unknown);

  return (
    <div style={{ ...page, alignItems: 'stretch', padding: 'clamp(12px,3vw,32px)' }}>
      <div style={{ width: '100%', maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 20,
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignContent: 'center' }}>

        {/* Left: clock + recent */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Logo size={42} />
            <div>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 20, fontWeight: 700 }}>Awelion Attendance</div>
              <div style={{ color: C.muted, fontSize: 13 }}>📍 {device.name}</div>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 'clamp(44px,8vw,72px)', letterSpacing: 2, lineHeight: 1 }}>
              {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              <span style={{ fontSize: '0.4em', color: C.muted, marginLeft: 6 }}>{String(now.getSeconds()).padStart(2, '0')}</span>
            </div>
            <div style={{ color: C.muted, marginTop: 8 }}>{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Recent</div>
            {recent.length === 0 && <div style={{ color: C.muted, fontSize: 14 }}>No scans yet on this device.</div>}
            {recent.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? `1px solid ${C.border}` : 'none' }}>
                <Avatar initials={r.name?.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()} size={30} />
                <div style={{ flex: 1, fontSize: 14 }}>{r.name}</div>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                  background: `${(RESULT_STYLE[r.result] || RESULT_STYLE.unknown).color}26`, color: (RESULT_STYLE[r.result] || RESULT_STYLE.unknown).color }}>
                  {({ checked_in: 'In', checked_out: 'Out', lunch_out: 'Lunch', lunch_in: 'Back' })[r.result] || '—'} {r.time || ''}
                </span>
              </div>
            ))}
          </div>
          {enrolled === 0 && (
            <div style={{ background: `${C.yellow}1f`, color: C.yellow, borderRadius: 12, padding: 14, fontSize: 14 }}>
              No faces are registered yet. The owner can register staff from <b>Face Attendance</b> in the Awelion app.
            </div>
          )}
        </div>

        {/* Right: camera (shown first on narrow / portrait screens) */}
        <div style={{ order: narrow ? -1 : 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', aspectRatio: '4 / 3' }}>
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }} />
            {/* face guide */}
            <div style={{ position: 'absolute', left: '50%', top: '50%', width: '42%', height: '72%', transform: 'translate(-50%,-50%)',
              borderRadius: '50%', border: `3px solid ${rs ? rs.color : C.accent}`, boxShadow: '0 0 0 9999px rgba(0,0,0,.35)', transition: 'border-color .2s' }} />
            {phase === 'error' && (
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', background: 'rgba(13,17,23,.92)' }}>
                <div>
                  <div style={{ fontSize: 36 }}>📷</div>
                  <div style={{ margin: '10px 0 16px', color: C.text }}>{error}</div>
                  <Btn onClick={() => window.location.reload()}>Try again</Btn>
                </div>
              </div>
            )}
            {choice && (
              <div className="fade-in" style={{ position: 'absolute', left: 12, right: 12, bottom: 12, background: 'rgba(13,17,23,.95)',
                border: `1px solid ${C.accent}66`, borderRadius: 14, padding: 16 }}>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Hi {first(choice.name)} — what are you doing?</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {choice.options.includes('lunch_out') && (
                    <button onClick={() => choice.pick('lunch_out')} style={{ flex: 1, padding: '18px 10px', borderRadius: 12, border: 'none', background: C.yellow, color: C.onAccent, fontSize: 18, fontWeight: 700 }}>🍱 Going for lunch</button>
                  )}
                  <button onClick={() => choice.pick('check_out')} style={{ flex: 1, padding: '18px 10px', borderRadius: 12, border: 'none', background: C.blue, color: C.onAccent, fontSize: 18, fontWeight: 700 }}>🏠 Leaving for the day</button>
                </div>
              </div>
            )}
            {rs && (
              <div className="fade-in" style={{ position: 'absolute', left: 12, right: 12, bottom: 12, background: 'rgba(13,17,23,.94)',
                border: `1px solid ${rs.color}66`, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: rs.color, color: onColor(rs.color), display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 700, flexShrink: 0 }}>{rs.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: FONT_HEAD, fontSize: 18, fontWeight: 700 }}>{rs.title(result.name)}</div>
                  <div style={{ color: C.subtle, fontSize: 14, marginTop: 2 }}>
                    {result.result === 'unknown' ? 'Please try again, or ask the office to register your face.' : result.message}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 600, minHeight: 26, color: phase === 'running' ? C.text : C.muted }}>
            {phase === 'loading' && <span style={{ animation: 'pulse 1.2s infinite' }}>{hint}</span>}
            {phase === 'running' && !rs && !choice && hint}
          </div>
        </div>
      </div>

      <button onClick={() => setUnlock(true)} aria-label="Exit kiosk"
        style={{ position: 'fixed', right: 12, bottom: 12, background: 'none', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: '6px 10px', fontSize: 12, opacity: .6 }}>
        ⚙ Exit
      </button>
      {unlock && <Unlock onClose={() => setUnlock(false)} onUnlocked={() => onExit(false)} />}
    </div>
  );
}

export default function Kiosk() {
  const [state, setState] = useState({ step: 'check' });

  useEffect(() => {
    if (state.step !== 'check') return;
    if (!localStorage.getItem(TOKEN_KEY)) { setState({ step: 'setup' }); return; }
    kioskApi.get('/face/kiosk/me')
      .then(r => setState({ step: 'run', device: r.data.device, enrolled: r.data.enrolled }))
      .catch(ex => {
        if (ex.response?.status === 401) { localStorage.removeItem(TOKEN_KEY); setState({ step: 'setup', note: ex.response.data?.message }); }
        else setState({ step: 'offline' });
      });
  }, [state.step]);

  const exit = useRef(revoked => { localStorage.removeItem(TOKEN_KEY); setState({ step: 'setup', note: revoked ? 'This kiosk was switched off by the owner.' : '' }); }).current;

  if (state.step === 'setup') return <Setup note={state.note} onReady={() => setState({ step: 'check' })} />;
  if (state.step === 'run') return <Scanner device={state.device} enrolled={state.enrolled} onExit={exit} />;
  return (
    <div style={page}>
      <div style={{ ...panel, textAlign: 'center' }}>
        {state.step === 'offline' ? (
          <>
            <div style={{ fontSize: 36 }}>📡</div>
            <p style={{ margin: '10px 0 16px' }}>Can't reach the server. Check the internet connection.</p>
            <Btn onClick={() => setState({ step: 'check' })}>Retry</Btn>
          </>
        ) : <div style={{ color: C.muted, animation: 'pulse 1.2s infinite' }}>Starting kiosk…</div>}
      </div>
    </div>
  );
}
