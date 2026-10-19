// OWNER ONLY: monthly salary (auto-calculated after each month ends), payslips, mark paid.
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api';
import { C } from '../theme';
import { Card, StatCard, Btn, Modal, Field, Spinner, Badge, Avatar, showToast } from '../components/UI';
import Payslip, { inr } from '../components/Payslip';
import useIsMobile from '../hooks/useIsMobile';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const istToday = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const lastMonth = () => { const [y, m] = istToday().split('-').map(Number); return m === 1 ? { month: 12, year: y - 1 } : { month: m - 1, year: y }; };
const dd = n => { const v = Number(n) || 0; return v % 1 ? v.toFixed(1) : String(v); };
const fmtDT = s => { if (!s) return ''; const [d, t] = String(s).split(/[ T]/); const [y, m, x] = d.split('-'); return `${x}/${m}/${y}${t ? ' ' + t.slice(0, 5) : ''}`; };

function SlipModal({ id, onClose }) {
  const [d, setD] = useState(null);
  useEffect(() => { api.get(`/payslips/${id}`).then(r => setD(r.data)); }, [id]);
  // Rendered straight into <body> so printing can hide the rest of the app (one clean A4 page).
  return createPortal(
    <div className="print-root" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.75)', overflowY: 'auto', padding: '16px 12px 40px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="print-frame" style={{ maxWidth: 794, margin: '0 auto' }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 12 }}>
          <Btn onClick={() => window.print()} disabled={!d}>⬇ Download / Print PDF</Btn>
          <Btn outline onClick={onClose} style={{ background: C.card }}>Close</Btn>
        </div>
        <div className="print-frame" style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>
          {d ? <Payslip slip={d.slip} company={d.company} /> : <div style={{ background: '#fff' }}><Spinner /></div>}
        </div>
      </div>
    </div>,
    document.body
  );
}

function AdjustModal({ slip, onClose, onDone }) {
  const [f, setF] = useState({ bonus: slip.bonus || 0, other_deduction: slip.other_deduction || 0, remarks: slip.remarks || '' });
  const save = async () => {
    try { await api.put(`/payslips/${slip.id}/adjust`, f); showToast('Payslip updated'); onDone(); }
    catch (ex) { showToast(ex.response?.data?.message || 'Could not save', C.red); }
  };
  return (
    <Modal title={`Adjust — ${slip.name}`} onClose={onClose} width={460}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Bonus / incentive (₹)"><input type="number" min="0" value={f.bonus} onChange={e => setF({ ...f, bonus: e.target.value })} /></Field>
        <Field label="Other deduction (₹)"><input type="number" min="0" value={f.other_deduction} onChange={e => setF({ ...f, other_deduction: e.target.value })} /></Field>
      </div>
      <Field label="Remarks on payslip"><input value={f.remarks} onChange={e => setF({ ...f, remarks: e.target.value })} placeholder="e.g. Diwali bonus" /></Field>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn outline onClick={onClose}>Cancel</Btn><Btn onClick={save}>Save & recalculate</Btn>
      </div>
    </Modal>
  );
}

export default function Salary() {
  const isMobile = useIsMobile(900);
  const [sel, setSel] = useState(lastMonth());
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState(null);
  const [adjust, setAdjust] = useState(null);

  const load = useCallback(() => { setD(null); api.get('/payslips', { params: sel }).then(r => setD(r.data)).catch(e => setD({ error: e.response?.data?.message || e.message })); }, [sel]);
  useEffect(() => { load(); }, [load]);

  const label = `${MONTHS[sel.month - 1]} ${sel.year}`;
  const monthOver = `${sel.year}-${String(sel.month).padStart(2, '0')}-${String(new Date(sel.year, sel.month, 0).getDate()).padStart(2, '0')}` < istToday();

  const calc = async () => {
    setBusy(true);
    try { const { data } = await api.post('/payslips/generate', sel); showToast(data.message); load(); }
    catch (ex) { showToast(ex.response?.data?.message || 'Could not calculate', C.red); }
    setBusy(false);
  };
  const markAll = async () => {
    if (!window.confirm(`Mark all ${label} payslips as paid today? Paid payslips are locked and won't be recalculated.`)) return;
    const { data } = await api.post('/payslips/mark-paid', sel); showToast(data.message); load();
  };
  const toggle = async s => {
    await api.put(`/payslips/${s.id}/status`, { status: s.status === 'paid' ? 'generated' : 'paid' }); load();
  };

  const years = []; for (let y = Number(istToday().slice(0, 4)); y >= 2025; y--) years.push(y);
  const slips = d?.slips || [];
  const total = k => slips.reduce((a, s) => a + Number(s[k] || 0), 0);
  const unpaid = slips.filter(s => s.status !== 'paid').length;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1>Salary 💰</h1>
          <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Only you (owner) can see this page. Calculated automatically on the 1st for the month that just ended.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={sel.month} onChange={e => setSel({ ...sel, month: Number(e.target.value) })} style={{ width: 140 }}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={sel.year} onChange={e => setSel({ ...sel, year: Number(e.target.value) })} style={{ width: 100 }}>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {!d ? <Spinner /> : d.error ? <Card><div style={{ color: C.red }}>{d.error}</div></Card> : (
        <>
          <Card accent={d.run ? C.green : monthOver ? C.yellow : C.blue}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 14, color: C.subtle, lineHeight: 1.6 }}>
                {d.run
                  ? <>✅ <b style={{ color: C.text }}>{label}</b> calculated {d.run.mode === 'auto' ? 'automatically' : 'by you'} on {fmtDT(d.run.generated_at)}. If you correct attendance or leave, press Recalculate.</>
                  : monthOver
                    ? <>⏳ <b style={{ color: C.text }}>{label}</b> hasn't been calculated yet.</>
                    : <>📅 <b style={{ color: C.text }}>{label}</b> isn't over yet. Salary will be calculated automatically on the 1st of next month.</>}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {monthOver && <Btn onClick={calc} disabled={busy}>{busy ? 'Calculating…' : d.run ? '↻ Recalculate' : 'Calculate now'}</Btn>}
                {unpaid > 0 && <Btn outline color={C.green} onClick={markAll}>✓ Mark all paid</Btn>}
              </div>
            </div>
          </Card>

          {d.no_salary?.length > 0 && (
            <Card accent={C.yellow}>
              <div style={{ fontSize: 14, color: C.subtle }}>
                ⚠️ No salary is set for <b style={{ color: C.text }}>{d.no_salary.map(x => x.name).join(', ')}</b>, so they're left out. Set it in <b style={{ color: C.text }}>HR → Edit</b>, then Recalculate.
              </div>
            </Card>
          )}

          {slips.length > 0 && (
            <div style={{ display: 'grid', gap: 18, gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)' }}>
              <StatCard label="Net salary payable" value={inr(total('net_pay'))} icon="💰" color={C.accent} sub={`${slips.length} employees`} />
              <StatCard label="Gross earned" value={inr(total('gross_earned'))} icon="📈" color={C.green} sub={`Deductions ${inr(total('total_deductions'))}`} />
              <StatCard label="Unpaid days (LOP)" value={dd(total('lop_days'))} icon="⚠️" color={total('lop_days') ? C.orange : C.muted} sub={`Leave used ${dd(total('leave_used'))} days`} />
              <StatCard label="Status" value={unpaid ? `${unpaid} to pay` : 'All paid'} icon="✅" color={unpaid ? C.yellow : C.green} sub={`${slips.length - unpaid} paid`} />
            </div>
          )}

          <Card style={{ padding: 0 }}>
            {!slips.length ? <div style={{ padding: 24, color: C.muted }}>No payslips for {label}.</div> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 14, minWidth: 760 }}>
                  <thead><tr>{['Employee', 'Paid days', 'Unpaid', 'Gross', 'Deductions', 'Net pay', 'Status', ''].map((h, i) =>
                    <th key={i} style={{ textAlign: i && i < 6 ? 'right' : 'left', padding: '12px 16px', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {slips.map(s => (
                      <tr key={s.id}>
                        <td style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar initials={s.avatar || s.name.slice(0, 2).toUpperCase()} size={32} />
                            <div><div style={{ fontWeight: 600 }}>{s.name}</div><div style={{ fontSize: 12, color: C.muted }}>{s.designation || s.department || ''}</div></div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, textAlign: 'right' }}>{dd(s.paid_days)} / {s.days_in_month}</td>
                        <td style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, textAlign: 'right', color: Number(s.lop_days) ? C.orange : C.muted }}
                          title={`Absent ${dd(s.absent_days)} · Leave ${dd(s.leave_days)} · Half ${dd(s.half_days)} · Leave used ${dd(s.leave_used)}`}>{dd(s.lop_days)}</td>
                        <td style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, textAlign: 'right' }}>{inr(s.gross_earned)}</td>
                        <td style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, textAlign: 'right', color: C.muted }}>{inr(s.total_deductions)}</td>
                        <td style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, textAlign: 'right', fontWeight: 700 }}>{inr(s.net_pay)}</td>
                        <td style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}>
                          <button onClick={() => toggle(s)} title="Click to change" style={{ background: 'none', border: 'none', padding: 0 }}>
                            <Badge color={s.status === 'paid' ? C.green : C.yellow}>{s.status === 'paid' ? 'Paid' : 'To pay'}</Badge>
                          </button>
                        </td>
                        <td style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {s.status !== 'paid' && <><Btn small outline onClick={() => setAdjust(s)}>Adjust</Btn>{' '}</>}
                          <Btn small onClick={() => setView(s.id)}>Payslip</Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.7 }}>
            How it's calculated: per-day pay = monthly salary ÷ days in the month (Sundays & holidays paid). Absent = 1 day, half day = ½, leave = 1 — taken from the
            employee's leave balance first; anything beyond the balance is unpaid. Professional tax ₹200 when earned salary is ₹12,000+. Approved salary advances are recovered in the month set on the advance.
          </p>
        </>
      )}

      {view && <SlipModal id={view} onClose={() => setView(null)} />}
      {adjust && <AdjustModal slip={adjust} onClose={() => setAdjust(null)} onDone={() => { setAdjust(null); load(); }} />}
    </div>
  );
}
