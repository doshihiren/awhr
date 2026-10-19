// Earned leave — employees see their balance & history; owner/HR see everyone and can set balances.
import { useCallback, useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { C, FONT_HEAD } from '../theme';
import { Card, StatCard, Btn, Modal, Field, Spinner, Badge, Avatar, showToast } from '../components/UI';
import useIsMobile from '../hooks/useIsMobile';

const fmtDate = d => { const [y, m, dd] = String(d).slice(0, 10).split('-'); return `${dd}/${m}/${y}`; };
const days = n => { const v = Number(n) || 0; return `${v % 1 ? v.toFixed(1) : v} day${Math.abs(v) === 1 ? '' : 's'}`; };
const KIND = { opening: ['Opening', C.blue], adjust: ['Set by office', C.blue], accrual: ['Earned', C.green], used: ['Used', C.orange] };

function History({ entries }) {
  if (!entries?.length) return <div style={{ color: C.muted, fontSize: 14 }}>No leave history yet.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 14 }}>
        <thead><tr>{['Date', 'Type', 'Details', 'Days'].map(h =>
          <th key={h} style={{ textAlign: h === 'Days' ? 'right' : 'left', padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
        <tbody>
          {entries.map(e => {
            const [label, color] = KIND[e.kind] || [e.kind, C.muted];
            const v = Number(e.days);
            return (
              <tr key={e.id}>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{fmtDate(e.entry_date)}</td>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}><Badge color={color}>{label}</Badge></td>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}`, color: C.subtle }}>{e.note}{e.by_name ? ` · by ${e.by_name}` : ''}</td>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}`, textAlign: 'right', fontWeight: 600,
                  color: e.kind === 'opening' || e.kind === 'adjust' ? C.text : v >= 0 ? C.green : C.orange }}>
                  {e.kind === 'adjust' || e.kind === 'opening' ? (v >= 0 ? '+' : '') : v > 0 ? '+' : ''}{v % 1 ? v.toFixed(1) : v}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ApplyLeave({ onClose, onDone }) {
  const [f, setF] = useState({ from_date: '', to_date: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!f.from_date || !f.to_date) return showToast('Choose the dates', C.yellow);
    setBusy(true);
    try {
      const { data } = await api.post('/hr/leaves', f);
      showToast(`Leave request sent (${days(data.days)})`); onDone();
    } catch (ex) { showToast(ex.response?.data?.message || 'Could not apply', C.red); }
    setBusy(false);
  };
  return (
    <Modal title="Apply for leave" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="From"><input type="date" value={f.from_date} onChange={e => setF({ ...f, from_date: e.target.value, to_date: f.to_date || e.target.value })} /></Field>
        <Field label="To"><input type="date" value={f.to_date} min={f.from_date} onChange={e => setF({ ...f, to_date: e.target.value })} /></Field>
      </div>
      <Field label="Reason"><textarea rows={3} value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} placeholder="e.g. Family function" /></Field>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>Sundays and holidays in between are not counted.</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn outline onClick={onClose}>Cancel</Btn>
        <Btn onClick={submit} disabled={busy}>{busy ? 'Sending…' : 'Send request'}</Btn>
      </div>
    </Modal>
  );
}

function MyLeave() {
  const [d, setD] = useState(null);
  const [apply, setApply] = useState(false);
  const load = useCallback(() => api.get('/leave/my').then(r => setD(r.data)), []);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Spinner />;
  const after = Math.max(0, d.balance - d.this_month.days);
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1>My Leave 🌴</h1>
          <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>You earn {d.monthly} days of leave every month (18 a year).</div>
        </div>
        <Btn onClick={() => setApply(true)}>+ Apply leave</Btn>
      </div>
      <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <StatCard label="Leave balance" value={days(d.balance)} icon="🌴" color={C.green} sub={`+${d.monthly} added on the 1st of every month`} />
        <StatCard label="Used this month so far" value={days(d.this_month.days)} icon="📅" color={d.this_month.days ? C.orange : C.muted}
          sub={[d.this_month.leave && `${d.this_month.leave} leave`, d.this_month.absent && `${d.this_month.absent} absent`, d.this_month.half && `${d.this_month.half} half`].filter(Boolean).join(' · ') || 'Nothing yet'} />
        <StatCard label="Balance after this month" value={days(after)} icon="🧮" color={C.accent} sub="Estimate, before the 1st's +1.5" />
      </div>
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>How it works</h3>
        <p style={{ color: C.subtle, fontSize: 14, lineHeight: 1.7 }}>
          Leave days, absent days and half days (½ day) are taken from your balance at the end of each month.
          If your balance runs out, the extra days are unpaid.
        </p>
      </Card>
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>History</h3>
        <History entries={d.entries} />
      </Card>
      {apply && <ApplyLeave onClose={() => setApply(false)} onDone={() => { setApply(false); load(); }} />}
    </div>
  );
}

function SetBalance({ emp, onClose, onDone }) {
  const [v, setV] = useState(String(emp.balance));
  const [note, setNote] = useState('');
  const save = async () => {
    try {
      const { data } = await api.post('/leave/set-balance', { user_id: emp.id, balance: Number(v), note: note || undefined });
      showToast(data.message); onDone();
    } catch (ex) { showToast(ex.response?.data?.message || 'Could not save', C.red); }
  };
  return (
    <Modal title={`Set leave balance — ${emp.name}`} onClose={onClose} width={440}>
      <Field label="Balance (days)"><input type="number" step="0.5" min="0" value={v} onChange={e => setV(e.target.value)} autoFocus /></Field>
      <Field label="Note (optional)"><input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Balance carried from register" /></Field>
      <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
        Enter the balance <b style={{ color: C.text }}>before this month's leave and absences</b>. This month's days are taken out automatically when the salary is calculated on the 1st.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn outline onClick={onClose}>Cancel</Btn>
        <Btn onClick={save}>Save balance</Btn>
      </div>
    </Modal>
  );
}

function TeamLeave() {
  const isMobile = useIsMobile(700);
  const [d, setD] = useState(null);
  const [edit, setEdit] = useState(null);
  const [hist, setHist] = useState(null);
  const [q, setQ] = useState('');
  const load = useCallback(() => api.get('/leave/balances').then(r => setD(r.data)), []);
  useEffect(() => { load(); }, [load]);
  const openHist = async e => { setHist({ e, entries: null }); const r = await api.get(`/leave/ledger/${e.id}`); setHist({ e, entries: r.data.entries }); };
  if (!d) return <Spinner />;
  const list = d.employees.filter(e => e.name.toLowerCase().includes(q.toLowerCase()));
  const [y, m] = d.accrual_start.split('-');
  const startLabel = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <h1>Leave 🌴</h1>
        <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>One leave type: earned leave, {d.monthly} days a month (18 a year).</div>
      </div>
      <Card accent={C.accent}>
        <div style={{ color: C.subtle, fontSize: 14, lineHeight: 1.8 }}>
          ✅ <b style={{ color: C.text }}>+{d.monthly} days</b> are added to everyone automatically on the 1st of every month, starting {startLabel}.<br />
          ✅ Leave, absent days and half days are taken from the balance when salary is calculated. Beyond the balance, days are unpaid.<br />
          ✏️ Use <b style={{ color: C.text }}>Set balance</b> to enter each person's current balance (until 31 March 2027 or whenever you need a correction).
        </div>
      </Card>
      <Card style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Balances</h3>
          <input placeholder="🔍 Search…" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 260 }} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 14 }}>
            <thead><tr>{['Employee', 'Balance', !isMobile && 'This month so far', ''].filter(h => h !== false).map((h, i) =>
              <th key={i} style={{ textAlign: 'left', padding: '10px 20px', borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
            <tbody>
              {list.map(e => (
                <tr key={e.id}>
                  <td style={{ padding: '10px 20px', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar initials={e.name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()} size={32} />{e.name}
                    </div>
                  </td>
                  <td style={{ padding: '10px 20px', borderBottom: `1px solid ${C.border}`, fontWeight: 600, color: e.balance > 0 ? C.green : C.orange }}>{days(e.balance)}</td>
                  {!isMobile && <td style={{ padding: '10px 20px', borderBottom: `1px solid ${C.border}`, color: C.muted }}>{e.this_month.days ? days(e.this_month.days) : '—'}</td>}
                  <td style={{ padding: '10px 20px', borderBottom: `1px solid ${C.border}`, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Btn small outline onClick={() => openHist(e)}>History</Btn>{' '}
                    <Btn small onClick={() => setEdit(e)}>Set balance</Btn>
                  </td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={4} style={{ padding: 20, color: C.muted }}>No employees found.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      {edit && <SetBalance emp={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />}
      {hist && (
        <Modal title={`Leave history — ${hist.e.name}`} onClose={() => setHist(null)} width={680}>
          {hist.entries ? <History entries={hist.entries} /> : <Spinner />}
        </Modal>
      )}
    </div>
  );
}

export default function Leave() {
  const { user } = useAuth();
  return ['owner', 'hr'].includes(user?.role) ? <TeamLeave /> : <MyLeave />;
}
