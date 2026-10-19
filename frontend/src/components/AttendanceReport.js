// HR / Owner: month view of every employee's attendance, with Excel (CSV) downloads.
import { useEffect, useState } from 'react';
import api from '../api';
import { C, FONT_HEAD } from '../theme';
import { Card, Btn, Spinner } from './UI';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CODE = {
  P:  ['Present', C.green], H: ['Half day', C.orange], L: ['Leave', C.yellow],
  A:  ['Absent', C.red], WO: ['Week off / holiday', C.muted],
};
const fmtH = m => `${Math.floor((m || 0) / 60)}h ${String((m || 0) % 60).padStart(2, '0')}m`;
const t5 = t => (t ? String(t).slice(0, 5) : '');

function download(filename, rows) {
  const esc = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = '﻿' + rows.map(r => r.map(esc).join(',')).join('\r\n');   // BOM so Excel reads ₹ / names correctly
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AttendanceReport() {
  const now = new Date(Date.now() + 5.5 * 3600e3);
  const [sel, setSel] = useState({ month: now.getUTCMonth() + 1, year: now.getUTCFullYear() });
  const [d, setD] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => { setD(null); api.get('/attendance/report', { params: sel }).then(r => setD(r.data)).catch(e => setD({ error: e.response?.data?.message || e.message })); }, [sel]);

  const label = `${MONTHS[sel.month - 1]} ${sel.year}`;
  const fileBase = `Attendance-${MONTHS[sel.month - 1]}-${sel.year}`;

  const downloadSummary = () => {
    const head = ['Employee', 'Department', 'Designation', 'Present', 'Half days', 'Leave', 'Absent', 'Late marks', 'Short-hour days', 'Missed check-outs', 'Total worked hours',
      ...d.days.map(x => `${x.date.slice(8)} ${x.day}`)];
    const rows = d.employees.map(e => [e.name, e.department || '', e.designation || '', e.totals.present, e.totals.half, e.totals.leave, e.totals.absent,
      e.totals.late, e.totals.short, e.totals.missed_out, (e.totals.worked_minutes / 60).toFixed(2),
      ...e.cells.map(c => c.code + (c.late ? '*' : ''))]);
    download(`${fileBase}-summary.csv`, [[`Attendance summary — ${label}`], ['P = Present, H = Half day, L = Leave, A = Absent, WO = Week off / holiday, * = Late mark (after 10:15)'], [], head, ...rows]);
  };
  const downloadDetail = () => {
    const rows = [['Date', 'Day', 'Employee', 'Department', 'Status', 'Check in', 'Lunch out', 'Lunch in', 'Check out', 'Worked (hours)', 'Worked', 'Late mark', 'Note']];
    d.employees.forEach(e => e.cells.forEach((c, i) => {
      const day = d.days[i];
      if (!c.code) return;
      const note = [c.hours_short && 'Work hours not completed', c.missed_checkout && 'No check-out'].filter(Boolean).join('; ');
      rows.push([day.date.split('-').reverse().join('/'), day.day, e.name, e.department || '', CODE[c.code]?.[0] || c.code,
        t5(c.check_in), t5(c.lunch_out), t5(c.lunch_in), t5(c.check_out), c.check_in ? (c.worked_minutes / 60).toFixed(2) : '',
        c.check_in ? fmtH(c.worked_minutes) : '', c.late ? 'Yes' : '', note]);
    }));
    download(`${fileBase}-daily-log.csv`, rows);
  };

  const years = []; for (let y = now.getUTCFullYear(); y >= 2025; y--) years.push(y);
  const emps = d?.employees?.filter(e => e.name.toLowerCase().includes(q.toLowerCase())) || [];
  const th = { padding: '8px 10px', borderBottom: `1px solid ${C.border}`, color: C.muted, fontWeight: 500, fontSize: 12, textAlign: 'right', whiteSpace: 'nowrap' };
  const td = { padding: '8px 10px', borderBottom: `1px solid ${C.border}`, fontSize: 13, textAlign: 'right' };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={sel.month} onChange={e => setSel({ ...sel, month: Number(e.target.value) })} style={{ width: 140 }}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={sel.year} onChange={e => setSel({ ...sel, year: Number(e.target.value) })} style={{ width: 100 }}>{years.map(y => <option key={y}>{y}</option>)}</select>
          <input placeholder="🔍 Search employee…" value={q} onChange={e => setQ(e.target.value)} style={{ width: 220 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn small disabled={!d?.employees} onClick={downloadSummary}>⬇ Download summary (Excel)</Btn>
          <Btn small outline disabled={!d?.employees} onClick={downloadDetail}>⬇ Daily log (Excel)</Btn>
        </div>
      </div>

      {!d ? <Spinner /> : d.error ? <Card><div style={{ color: C.red }}>{d.error}</div></Card> : (
        <>
          <Card style={{ padding: 0 }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, fontFamily: FONT_HEAD, fontWeight: 600 }}>Summary — {label}</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 760 }}>
                <thead><tr>
                  <th style={{ ...th, textAlign: 'left' }}>Employee</th>
                  {['Present', 'Half day', 'Leave', 'Absent', 'Late marks', 'Short hours', 'No check-out', 'Worked'].map(h => <th key={h} style={th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {emps.map(e => (
                    <tr key={e.id}>
                      <td style={{ ...td, textAlign: 'left' }}><b style={{ fontWeight: 600 }}>{e.name}</b><div style={{ fontSize: 11, color: C.muted }}>{e.designation || e.department || ''}</div></td>
                      <td style={{ ...td, color: C.green }}>{e.totals.present}</td>
                      <td style={{ ...td, color: e.totals.half ? C.orange : C.muted }}>{e.totals.half}</td>
                      <td style={{ ...td, color: e.totals.leave ? C.yellow : C.muted }}>{e.totals.leave}</td>
                      <td style={{ ...td, color: e.totals.absent ? C.red : C.muted }}>{e.totals.absent}</td>
                      <td style={{ ...td, color: e.totals.late ? C.red : C.muted, fontWeight: e.totals.late ? 700 : 400 }}>{e.totals.late}</td>
                      <td style={{ ...td, color: e.totals.short ? C.orange : C.muted }}>{e.totals.short}</td>
                      <td style={{ ...td, color: e.totals.missed_out ? C.orange : C.muted }}>{e.totals.missed_out}</td>
                      <td style={td}>{fmtH(e.totals.worked_minutes)}</td>
                    </tr>
                  ))}
                  {!emps.length && <tr><td colSpan={9} style={{ ...td, textAlign: 'left', color: C.muted }}>No employees.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>

          <Card style={{ padding: 0 }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: FONT_HEAD, fontWeight: 600 }}>Day by day</span>
              <span style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: C.muted }}>
                {Object.entries(CODE).map(([k, [n, c]]) => <span key={k}><b style={{ color: c }}>{k}</b> {n}</span>)}
                <span><span style={{ color: C.red }}>●</span> Late</span>
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>
                  <th style={{ ...th, textAlign: 'left', position: 'sticky', left: 0, background: C.card, zIndex: 1 }}>Employee</th>
                  {d.days.map(x => (
                    <th key={x.date} style={{ ...th, textAlign: 'center', padding: '6px 4px', color: x.type === 'holiday' ? C.muted : C.subtle, opacity: x.future ? .5 : 1 }}>
                      <div>{x.date.slice(8)}</div><div style={{ fontSize: 10 }}>{x.day.slice(0, 2)}</div>
                    </th>
                  ))}
                </tr></thead>
                <tbody>
                  {emps.map(e => (
                    <tr key={e.id}>
                      <td style={{ ...td, textAlign: 'left', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: C.card, zIndex: 1 }}>{e.name}</td>
                      {e.cells.map((c, i) => {
                        const color = CODE[c.code]?.[1] || C.muted;
                        const tip = c.check_in ? `In ${t5(c.check_in)}${c.lunch_out ? ` · Lunch ${t5(c.lunch_out)}–${t5(c.lunch_in) || '…'}` : ''} · Out ${t5(c.check_out) || '—'} · ${fmtH(c.worked_minutes)}${c.late ? ' · LATE' : ''}` : CODE[c.code]?.[0] || '';
                        return (
                          <td key={i} title={tip} style={{ borderBottom: `1px solid ${C.border}`, padding: 3, textAlign: 'center' }}>
                            {c.code && (
                              <span style={{ position: 'relative', display: 'inline-grid', placeItems: 'center', width: 28, height: 24, borderRadius: 6,
                                background: c.code === 'WO' ? 'transparent' : `${color}26`, color, fontWeight: 700, fontSize: c.code === 'WO' ? 9 : 11 }}>
                                {c.code}
                                {c.late && <span style={{ position: 'absolute', top: 1, right: 2, width: 5, height: 5, borderRadius: '50%', background: C.red }} />}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
