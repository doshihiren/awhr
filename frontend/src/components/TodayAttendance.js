// Employee's "Today" card: check in → lunch out → lunch in → check out, with live working hours,
// late mark (after 10:15) and a half-day warning when net hours are under 6.
import { useCallback, useEffect, useState } from 'react';
import api from '../api';
import { C, FONT_HEAD } from '../theme';
import { Btn, Badge, Spinner, showToast } from './UI';

const toMin = t => { if (!t) return null; const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
export const fmtHours = m => `${Math.floor((m || 0) / 60)}h ${String((m || 0) % 60).padStart(2, '0')}m`;
const hhmm = t => (t ? String(t).slice(0, 5) : '—');
const nowMin = () => { const d = new Date(Date.now() + 5.5 * 3600e3); return d.getUTCHours() * 60 + d.getUTCMinutes(); };

// Same formula as the server: (out − in) − lunch; still working → up to now; on lunch → stops at lunch-out.
function liveMinutes(r) {
  if (!r?.check_in) return 0;
  const start = toMin(r.check_in);
  let end = r.check_out ? toMin(r.check_out) : nowMin();
  let lunch = 0;
  if (r.lunch_out) { if (r.lunch_in) lunch = Math.max(0, toMin(r.lunch_in) - toMin(r.lunch_out)); else end = Math.min(end, toMin(r.lunch_out)); }
  return Math.max(0, end - start - lunch);
}

export default function TodayAttendance({ onChange, title = "Today's Attendance" }) {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState('');
  const [, tick] = useState(0);

  const load = useCallback(() => api.get('/attendance/today').then(r => setD(r.data)).catch(() => setD({ error: true })), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 30000); return () => clearInterval(t); }, []);

  const act = async (path, label) => {
    setBusy(label);
    try {
      const { data } = await api.post(`/attendance/${path}`);
      showToast(data.message, data.hours_short ? C.orange : C.accent);
      await load(); onChange?.();
    } catch (ex) { showToast(ex.response?.data?.message || 'Something went wrong', C.red); }
    setBusy('');
  };

  if (!d) return <Card title={title}><Spinner /></Card>;
  if (d.error) return <Card title={title}><div style={{ color: C.red }}>Could not load today's attendance.</div></Card>;

  const r = d.record;
  const full = d.rules?.full_day_minutes || 360;
  const lateAfter = d.rules?.late_after || '10:15';
  const worked = liveMinutes(r);
  const pct = Math.min(100, (worked / full) * 100);
  const working = r?.check_in && !r.check_out;
  const onLunch = working && r.lunch_out && !r.lunch_in;
  const remaining = Math.max(0, full - worked);

  const checkOut = () => {
    if (worked < full && !window.confirm(`You have worked ${fmtHours(worked)} today — less than ${full / 60} hours.\n\nIf you check out now, today will be marked as a HALF DAY.\n\nCheck out anyway?`)) return;
    act('checkout', 'out');
  };

  if (d.dayStatus === 'holiday' && !r?.check_in) {
    return (
      <Card title={title}>
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ fontSize: 34 }}>🎉</div>
          <div style={{ color: C.yellow, fontWeight: 700, marginTop: 6 }}>{d.holiday?.name || 'Holiday'}</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>No attendance needed today</div>
        </div>
      </Card>
    );
  }

  if (r?.status === 'leave' && !r.check_in) {
    return <Card title={title}><div style={{ color: C.yellow, fontWeight: 600 }}>🌴 You are on leave today</div></Card>;
  }

  const steps = [
    ['Check in', r?.check_in, C.green], ['Lunch out', r?.lunch_out, C.yellow],
    ['Lunch in', r?.lunch_in, C.yellow], ['Check out', r?.check_out, C.blue],
  ];

  return (
    <Card title={title} right={
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {r?.late && <Badge color={C.red}>Late mark</Badge>}
        {onLunch && <Badge color={C.yellow}>On lunch</Badge>}
        {r?.check_out && (r.hours_short ? <Badge color={C.orange}>Half day</Badge> : <Badge color={C.green}>Full day</Badge>)}
      </div>
    }>
      {!r?.check_in ? (
        <div style={{ textAlign: 'center', padding: '6px 0' }}>
          <div style={{ color: C.muted, fontSize: 14, marginBottom: 14 }}>
            You haven't checked in yet. Check in by <b style={{ color: C.text }}>{lateAfter}</b> to avoid a late mark.
          </div>
          <Btn onClick={() => act('checkin', 'in')} disabled={!!busy} style={{ width: '100%', padding: 13 }}>{busy === 'in' ? 'Checking in…' : '✅ Check in'}</Btn>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 14 }}>
            {steps.map(([k, v, c]) => (
              <div key={k} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: C.muted }}>{k}</div>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 700, color: v ? c : C.muted, marginTop: 2 }}>{hhmm(v)}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 13 }}>
            <span style={{ color: C.muted }}>Working hours {working && !onLunch ? '(live)' : ''}</span>
            <span><b style={{ fontFamily: FONT_HEAD, fontSize: 18 }}>{fmtHours(worked)}</b><span style={{ color: C.muted }}> / {full / 60}h</span></span>
          </div>
          <div style={{ height: 8, background: C.border, borderRadius: 8, overflow: 'hidden', margin: '8px 0 12px' }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 8, transition: 'width .5s',
              background: worked >= full ? C.green : `linear-gradient(90deg,${C.accent},${C.blue})` }} />
          </div>

          {working && worked < full && (
            <div style={{ fontSize: 13, color: C.subtle, marginBottom: 12 }}>
              {onLunch ? '🍱 Lunch time is not counted. Tap "Back from lunch" when you return.' : `⏳ ${fmtHours(remaining)} more to complete ${full / 60} hours.`}
            </div>
          )}
          {r.check_out && r.hours_short && (
            <div role="alert" style={{ background: `${C.orange}1f`, color: C.orange, borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12 }}>
              ⚠️ <b>Work hours not completed</b> — {fmtHours(worked)} of {full / 60} hours. Today is marked as a half day.
            </div>
          )}
          {r.late && !r.check_out && (
            <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>Late mark: checked in after {lateAfter}.</div>
          )}

          {working ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!r.lunch_out && <Btn outline color={C.yellow} onClick={() => act('lunch-out', 'lo')} disabled={!!busy} style={{ flex: 1, minWidth: 130 }}>{busy === 'lo' ? '…' : '🍱 Lunch out'}</Btn>}
              {onLunch && <Btn color={C.yellow} onClick={() => act('lunch-in', 'li')} disabled={!!busy} style={{ flex: 1, minWidth: 130 }}>{busy === 'li' ? '…' : '🍽️ Back from lunch'}</Btn>}
              {!onLunch && <Btn color={C.blue} onClick={checkOut} disabled={!!busy} style={{ flex: 1, minWidth: 130 }}>{busy === 'out' ? '…' : '🚪 Check out'}</Btn>}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: C.green, fontWeight: 600, fontSize: 14 }}>✓ Signed off for today</div>
          )}
        </>
      )}
    </Card>
  );
}

function Card({ title, right, children }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600 }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}
