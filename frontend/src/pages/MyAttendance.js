import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';
import { Spinner, Btn, Modal, Field } from '../components/UI';
import TodayAttendance, { fmtHours } from '../components/TodayAttendance';

const GRID = '1fr 1.1fr 1.2fr 0.9fr 1.2fr 0.8fr 0.9fr';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STATUS_COLOR = {
  present:C.green, absent:C.red, leave:C.yellow, holiday:C.accent,
  half_day:C.orange, half_day_first:C.orange, half_day_second:C.orange,
};
const STATUS_LABEL = {
  present:'Present', absent:'Absent', leave:'On Leave', holiday:'Holiday',
  half_day:'Half Day', half_day_first:'Half day (after 1 PM)', half_day_second:'Half day (<6h)',
};

export default function MyAttendance() {
  const { user } = useAuth();
  const now = new Date();
  const [month,   setMonth]   = useState(now.getMonth()+1);
  const [year,    setYear]    = useState(now.getFullYear());
  const [data,    setData]    = useState(null);
  const [today,   setToday]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutMsg, setCheckoutMsg] = useState('');
  const [leaveModal, setLeaveModal] = useState(false);
  const [lForm, setLForm] = useState({ leave_type:'earned', from_date:'', to_date:'', reason:'' });

  const load = async () => {
    setLoading(true);
    const [att, tod] = await Promise.all([
      api.get(`/attendance/my/${month}/${year}`),
      api.get('/attendance/today'),
    ]);
    setData(att.data); setToday(tod.data); setLoading(false);
  };
  useEffect(() => { load(); }, [month, year]);

  const checkIn = async () => {
    try { await api.post('/attendance/checkin', { method:'manual' }); load(); }
    catch(e) { alert(e.response?.data?.message || 'Error'); }
  };

  const checkOut = async () => {
    try {
      const r = await api.post('/attendance/checkout');
      setCheckoutMsg(r.data.message);
      load();
      setTimeout(() => setCheckoutMsg(''), 5000);
    } catch(e) { alert(e.response?.data?.message || 'Error'); }
  };

  const applyLeave = async () => {
    if (!lForm.from_date || !lForm.to_date) { alert('Please select dates'); return; }
    try {
      await api.post('/hr/leaves', lForm);
      setLeaveModal(false);
      setLForm({ leave_type:'earned', from_date:'', to_date:'', reason:'' });
      load(); alert('Leave applied successfully!');
    } catch(e) { alert(e.response?.data?.message || 'Error'); }
  };

  const getDayInfo = (y, m, d) => {
    const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow = new Date(Date.UTC(y, m-1, d)).getUTCDay();
    if (dow === 0) return { status:'holiday', label:'Sunday' };
    if (dow === 6) {
      const rules = data?.rules || [];
      if (rules.find(r => r.rule_type === 'all_sat' && r.is_active)) return { status:'holiday', label:'Saturday' };
      const weekNum = Math.ceil(d / 7);
      if (weekNum === 2 && rules.find(r => r.rule_type === 'second_sat' && r.is_active)) return { status:'holiday', label:'2nd Sat' };
      if (weekNum === 4 && rules.find(r => r.rule_type === 'fourth_sat' && r.is_active)) return { status:'holiday', label:'4th Sat' };
    }
    const hol = data?.holidays?.find(h => h.date === dateStr);
    if (hol) return { status:'holiday', label:hol.name };
    const rec = data?.attendance?.find(a => a.date === dateStr);
    if (rec) return { status:rec.status, label:'', check_in:rec.check_in, check_out:rec.check_out, rec };
    const todayStr = today?.today || '';
    if (dateStr > todayStr) return { status:'future', label:'' };
    return { status:'absent', label:'' };
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  // Count based on actual displayed status (same logic as getDayInfo) to match the sheet
  let presentCount = 0, halfDayCount = 0, leaveCount = 0, absentCount = 0;
  const lateCount = (data?.attendance || []).filter(a => a.late).length;
  const totalWorked = (data?.attendance || []).reduce((s, a) => s + (a.worked_minutes || 0), 0);
  const office = data?.office || { late_after: '10:15', full_day_minutes: 360 };
  for (let d = 1; d <= daysInMonth; d++) {
    const info = getDayInfo(year, month, d);
    if (info.status === 'present')  presentCount++;
    else if (info.status === 'half_day' || info.status === 'half_day_first' || info.status === 'half_day_second') halfDayCount++;
    else if (info.status === 'leave')  leaveCount++;
    else if (info.status === 'absent') absentCount++;
  }

  if (loading) return <Spinner />;
  const rec = today?.record;
  const isHoliday = today?.dayStatus === 'holiday';

  return (
    <div className="fade-in">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <h1 style={{fontSize:22,fontWeight:800}}>My Attendance 📷</h1>
        <Btn onClick={()=>setLeaveModal(true)} color={C.yellow} outline small>🌴 Apply Leave</Btn>
      </div>

      {/* Office rules */}
      <div style={{background:`${C.accent}10`,border:`1px solid ${C.accent}33`,borderRadius:10,padding:'10px 16px',marginBottom:16,fontSize:13,color:C.subtle,lineHeight:1.6}}>
        🕙 Office <b style={{color:C.text}}>10:00 AM – 7:00 PM</b> · Check-in after <b style={{color:C.red}}>{office.late_after}</b> = late mark ·
        Less than <b style={{color:C.orange}}>{office.full_day_minutes/60} working hours</b> (lunch not counted) = half day
      </div>

      <div style={{marginBottom:20}}><TodayAttendance onChange={load} /></div>

      {/* Month Selector + Stats */}
      <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'center',flexWrap:'wrap'}}>
        <select value={month} onChange={e=>setMonth(parseInt(e.target.value))} style={{padding:'7px 12px',borderRadius:8,width:'auto'}}>
          {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={e=>setYear(parseInt(e.target.value))} style={{padding:'7px 12px',borderRadius:8,width:'auto'}}>
          {[2025,2026,2027].map(y=><option key={y}>{y}</option>)}
        </select>
        <div style={{display:'flex',gap:12,marginLeft:8,flexWrap:'wrap'}}>
          <span style={{fontSize:12,color:C.green,fontWeight:700}}>✅ {presentCount} Present</span>
          <span style={{fontSize:12,color:C.orange,fontWeight:700}}>🕐 {halfDayCount} Half Day</span>
          <span style={{fontSize:12,color:C.yellow,fontWeight:700}}>🌴 {leaveCount} Leave</span>
          <span style={{fontSize:12,color:C.red,fontWeight:700}}>❌ {absentCount} Absent</span>
          <span style={{fontSize:12,color:C.red,fontWeight:700}}>⏰ {lateCount} Late</span>
          <span style={{fontSize:12,color:C.subtle,fontWeight:700}}>🕘 {fmtHours(totalWorked)} worked</span>
        </div>
      </div>

      {/* Vertical Sheet */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflowX:'auto'}}>
        <div style={{display:'grid',gridTemplateColumns:GRID,minWidth:660,padding:'12px 20px',borderBottom:`1px solid ${C.border}`,fontSize:11,color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px'}}>
          <span>Date</span><span>Day</span><span>Status</span><span>In</span><span>Lunch</span><span>Out</span><span>Hours</span>
        </div>
        {Array.from({length: daysInMonth}, (_,i) => {
          const day     = i+1;
          const info    = getDayInfo(year, month, day);
          const d       = new Date(Date.UTC(year, month-1, day));
          const dayName = d.toLocaleDateString('en-IN', {weekday:'short', timeZone:'UTC'});
          const isHol   = info.status === 'holiday';
          const isWknd  = d.getUTCDay() === 0 || d.getUTCDay() === 6;
          const isFut   = info.status === 'future';
          const isAbs   = info.status === 'absent';

          return (
            <div key={day} style={{
              display:'grid', gridTemplateColumns:GRID, minWidth:660,
              padding:'10px 20px', borderBottom:`1px solid ${C.border}22`,
              background: isHol ? `${C.accent}08` : isWknd ? `${C.border}33` : 'transparent',
              opacity: isFut ? 0.35 : 1,
            }}>
              <div style={{fontSize:13,fontWeight:600}}>{String(day).padStart(2,'0')} {MONTHS[month-1].slice(0,3)}</div>
              <div style={{fontSize:12,color:isHol?C.accent:C.muted,fontWeight:isHol?700:400}}>
                {dayName}{info.label?` (${info.label})`:''}
              </div>
              <div>
                {!isFut && (
                  <span style={{padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:700,
                    background:`${STATUS_COLOR[info.status]||C.border}22`,
                    color:STATUS_COLOR[info.status]||C.muted}}>
                    {STATUS_LABEL[info.status]||'—'}
                  </span>
                )}
              </div>
              {/* In Time — show dash for absent/holiday/future */}
              <div style={{fontSize:13,color:info.check_in?C.green:C.muted,fontWeight:info.check_in?600:400}}>
                {isAbs || isHol || isFut ? '—' : (info.check_in?.slice(0,5) || '—')}
                {info.rec?.late && <span style={{marginLeft:6,fontSize:10,fontWeight:700,color:C.red}}>LATE</span>}
              </div>
              <div style={{fontSize:12,color:C.muted}}>
                {isAbs || isHol || isFut || !info.rec?.lunch_out ? '—' : `${info.rec.lunch_out.slice(0,5)}–${info.rec.lunch_in ? info.rec.lunch_in.slice(0,5) : '…'}`}
              </div>
              {/* Out Time — show dash for absent/holiday/future */}
              <div style={{fontSize:13,color:info.check_out?C.orange:C.muted,fontWeight:info.check_out?600:400}}>
                {isAbs || isHol || isFut ? '—' : (info.check_out?.slice(0,5) || '—')}
              </div>
              <div style={{fontSize:13,fontWeight:600,color:info.rec?.hours_short?C.orange:info.rec?.worked_minutes?C.text:C.muted}}>
                {info.rec?.check_in ? fmtHours(info.rec.worked_minutes) : '—'}
                {info.rec?.missed_checkout && <span style={{display:'block',fontSize:10,color:C.orange}}>no check-out</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Leave Modal */}
      {leaveModal && (
        <Modal title="Apply for Leave" onClose={()=>setLeaveModal(false)}>
          <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:'10px 14px',fontSize:13,color:C.subtle,marginBottom:14}}>
            Earned leave · Sundays and holidays in between are not counted. Leave is taken from your balance when the month's salary is calculated.
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Field label="From Date"><input type="date" value={lForm.from_date} onChange={e=>setLForm({...lForm,from_date:e.target.value})} /></Field>
            <Field label="To Date"><input type="date" value={lForm.to_date} onChange={e=>setLForm({...lForm,to_date:e.target.value})} /></Field>
          </div>
          <Field label="Reason">
            <textarea value={lForm.reason} onChange={e=>setLForm({...lForm,reason:e.target.value})} rows={3} placeholder="Reason for leave..." />
          </Field>
          <div style={{display:'flex',gap:10}}>
            <Btn onClick={applyLeave} style={{flex:1}}>Submit Leave Request</Btn>
            <Btn onClick={()=>setLeaveModal(false)} color={C.muted} outline style={{flex:1}}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
