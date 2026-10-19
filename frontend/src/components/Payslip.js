// Printable A4 payslip (white paper style). Used by the owner-only Salary page.
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const INK = '#111827', MUTED = '#6b7280', LINE = '#e5e7eb', BRAND = '#0f766e', SOFT = '#f0fdfa';

export const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const dd = n => { const v = Number(n) || 0; return v % 1 ? v.toFixed(1) : String(v); };
const fmtDate = d => { if (!d) return '—'; const [y, m, x] = String(d).slice(0, 10).split('-'); return `${x}/${m}/${y}`; };
const mask = a => (a ? 'XXXX' + String(a).slice(-4) : '—');

// 123456 → "One Lakh Twenty Three Thousand Four Hundred Fifty Six"
export function inWords(num) {
  num = Math.round(Number(num) || 0);
  if (num === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen',
    'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = n => (n < 20 ? a[n] : b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : ''));
  const three = n => (n >= 100 ? a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + two(n % 100) : '') : two(n));
  const parts = [];
  const crore = Math.floor(num / 1e7); num %= 1e7;
  const lakh = Math.floor(num / 1e5); num %= 1e5;
  const thousand = Math.floor(num / 1e3); num %= 1e3;
  if (crore) parts.push(three(crore) + ' Crore');
  if (lakh) parts.push(two(lakh) + ' Lakh');
  if (thousand) parts.push(two(thousand) + ' Thousand');
  if (num) parts.push(three(num));
  return parts.join(' ');
}

const cell = { padding: '7px 10px', borderBottom: `1px solid ${LINE}`, fontSize: 12.5 };
const label = { fontSize: 10.5, color: MUTED, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 };

export default function Payslip({ slip: s, company: co = {} }) {
  const period = `${MONTHS[s.month - 1]} ${s.year}`;
  const earnings = [
    ['Basic salary', s.basic, s.earned_basic],
    ['House rent allowance (HRA)', s.hra, s.earned_hra],
    ['Other allowance', s.other_allowance, s.earned_other],
    ...(Number(s.bonus) ? [['Bonus / incentive', null, s.bonus]] : []),
  ];
  const deductions = [
    ['Professional tax', s.pt],
    ...(Number(s.advance) ? [['Salary advance recovery', s.advance]] : []),
    ...(Number(s.other_deduction) ? [['Other deduction', s.other_deduction]] : []),
  ];
  const fixedTotal = Number(s.basic) + Number(s.hra) + Number(s.other_allowance);
  const addr = [co.address, co.city, co.state, co.pincode].filter(Boolean).join(', ');

  return (
    <div className="payslip-print" style={{ background: '#fff', color: INK, width: '100%', maxWidth: 794, margin: '0 auto',
      padding: '34px 38px', fontFamily: "'Manrope', Arial, sans-serif", fontSize: 13, lineHeight: 1.45, boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, borderBottom: `3px solid ${BRAND}`, paddingBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "'Sora', Arial, sans-serif", fontSize: 21, fontWeight: 700, color: INK }}>{co.company_name || 'Company name'}</div>
          {addr && <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{addr}</div>}
          <div style={{ color: MUTED, fontSize: 12 }}>{[co.gstin && `GSTIN ${co.gstin}`, co.pan && `PAN ${co.pan}`, co.phone].filter(Boolean).join(' · ')}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Sora', Arial, sans-serif", fontSize: 16, fontWeight: 700, color: BRAND, letterSpacing: '.08em' }}>PAYSLIP</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{period}</div>
          <div style={{ color: MUTED, fontSize: 11.5 }}>Payslip no. {s.year}{String(s.month).padStart(2, '0')}-{String(s.user_id).padStart(4, '0')}</div>
        </div>
      </div>

      {/* Employee */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 18px', padding: '16px 0', borderBottom: `1px solid ${LINE}` }}>
        {[
          ['Employee name', s.name], ['Employee code', `EMP-${String(s.user_id).padStart(4, '0')}`], ['Designation', s.designation || '—'],
          ['Department', s.department || '—'], ['Date of joining', fmtDate(s.date_of_joining)], ['PAN', s.pan_number || '—'],
          ['Bank', s.bank_name || '—'], ['Account no.', mask(s.bank_account_number)], ['IFSC', s.bank_ifsc || '—'],
        ].map(([k, v]) => <div key={k}><div style={label}>{k}</div><div style={{ fontWeight: 600 }}>{v}</div></div>)}
      </div>

      {/* Attendance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', margin: '16px 0', border: `1px solid ${LINE}`, borderRadius: 8, overflow: 'hidden' }}>
        {[
          ['Days in month', s.days_in_month], ['Paid days', dd(s.paid_days)], ['Present', dd(s.present_days)], ['Half days', dd(s.half_days)],
          ['Leave', dd(s.leave_days)], ['Absent', dd(s.absent_days)], ['Sundays / holidays', dd(s.holidays)], ['Unpaid (LOP)', dd(s.lop_days)],
        ].map(([k, v], i) => (
          <div key={k} style={{ padding: '8px 6px', textAlign: 'center', borderLeft: i ? `1px solid ${LINE}` : 'none', background: k === 'Paid days' ? SOFT : '#fff' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: k === 'Unpaid (LOP)' && Number(v) ? '#b91c1c' : INK }}>{v}</div>
            <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.2 }}>{k}</div>
          </div>
        ))}
      </div>

      {/* Earnings & deductions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${LINE}` }}>
          <thead><tr style={{ background: SOFT }}>
            <th style={{ ...cell, textAlign: 'left', color: BRAND, fontWeight: 700 }}>Earnings</th>
            <th style={{ ...cell, textAlign: 'right', color: MUTED, fontWeight: 600 }}>Monthly</th>
            <th style={{ ...cell, textAlign: 'right', color: BRAND, fontWeight: 700 }}>Earned</th>
          </tr></thead>
          <tbody>
            {earnings.map(([k, full, got]) => (
              <tr key={k}><td style={cell}>{k}</td><td style={{ ...cell, textAlign: 'right', color: MUTED }}>{full == null ? '' : inr(full)}</td><td style={{ ...cell, textAlign: 'right' }}>{inr(got)}</td></tr>
            ))}
            <tr style={{ fontWeight: 700 }}><td style={cell}>Gross earnings</td><td style={{ ...cell, textAlign: 'right', color: MUTED, fontWeight: 600 }}>{inr(fixedTotal)}</td><td style={{ ...cell, textAlign: 'right' }}>{inr(s.gross_earned)}</td></tr>
          </tbody>
        </table>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${LINE}`, alignSelf: 'start' }}>
          <thead><tr style={{ background: '#fef2f2' }}>
            <th style={{ ...cell, textAlign: 'left', color: '#b91c1c', fontWeight: 700 }}>Deductions</th>
            <th style={{ ...cell, textAlign: 'right', color: '#b91c1c', fontWeight: 700 }}>Amount</th>
          </tr></thead>
          <tbody>
            {deductions.map(([k, v]) => <tr key={k}><td style={cell}>{k}</td><td style={{ ...cell, textAlign: 'right' }}>{inr(v)}</td></tr>)}
            <tr style={{ fontWeight: 700 }}><td style={cell}>Total deductions</td><td style={{ ...cell, textAlign: 'right' }}>{inr(s.total_deductions)}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Net pay */}
      <div style={{ marginTop: 16, background: BRAND, color: '#fff', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
        WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        <div>
          <div style={{ fontSize: 11, opacity: .85, textTransform: 'uppercase', letterSpacing: '.08em' }}>Net pay</div>
          <div style={{ fontSize: 12.5, opacity: .95 }}>Rupees {inWords(s.net_pay)} Only</div>
        </div>
        <div style={{ fontFamily: "'Sora', Arial, sans-serif", fontSize: 26, fontWeight: 700, whiteSpace: 'nowrap' }}>{inr(s.net_pay)}</div>
      </div>

      {/* Leave + notes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ ...label, color: BRAND, fontWeight: 700 }}>Earned leave</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginTop: 4 }}><span>Balance at start of month</span><b>{dd(s.leave_opening)}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}><span>Used for leave / absence</span><b>− {dd(s.leave_used)}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, borderTop: `1px solid ${LINE}`, marginTop: 4, paddingTop: 4 }}><span>Closing balance</span><b>{dd(s.leave_closing)}</b></div>
        </div>
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '10px 12px', fontSize: 12, color: MUTED }}>
          <div style={{ ...label, color: BRAND, fontWeight: 700 }}>Notes</div>
          <div>Per-day pay = monthly salary ÷ {s.days_in_month} days. Unpaid days = absences not covered by leave balance{Number(s.not_employed_days) ? ' + days before joining / after leaving' : ''}.</div>
          {s.remarks && <div style={{ color: INK, marginTop: 4 }}>{s.remarks}</div>}
          <div style={{ marginTop: 4 }}>Status: <b style={{ color: s.status === 'paid' ? '#15803d' : '#b45309' }}>{s.status === 'paid' ? `Paid on ${fmtDate(s.paid_on)}` : 'Not paid yet'}</b></div>
        </div>
      </div>

      <div style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 11, color: MUTED }}>
        <div>This is a computer-generated payslip and does not need a signature.</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ height: 28 }} />
          <div style={{ borderTop: `1px solid ${INK}`, paddingTop: 3, minWidth: 150, color: INK }}>Authorised signatory</div>
        </div>
      </div>
    </div>
  );
}
