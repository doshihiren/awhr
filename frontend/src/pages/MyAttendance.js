import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';
import { Spinner, Btn, Modal, Field } from '../components/UI';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STATUS_COLOR = {
  present:C.green, absent:C.red, leave:C.yellow, holiday:C.accent,
  half_day:C.orange, half_day_first:C.orange, half_day_second:C.orange,
};
const STATUS_LABEL = {
  present:'Present', absent:'Absent', leave:'On Leave', holiday:'Holiday',
  half_day:'Half Day', half_day_first:'1st Half Leave', half_day_second:'2nd Half Leave',
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
  const [lForm, setLForm] = useState({ leave_type:'PL', from_date:'', to_date:'', reason:'' });

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
      setLForm({ leave_type:'PL', from_date:'', to_date:'', reason:'' });
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
    if (rec) return { status:rec.status, label:'', check_in:rec.check_in, check_out:rec.check_out };
    const todayStr = today?.today || '';
    if (dateStr > todayStr) return { status:'future', label:'' };
    return { status:'absent', label:'' };
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  // Count based on actual displayed status (same logic as getDayInfo) to match the sheet
  let presentCount = 0, halfDayCount = 0, leaveCount = 0, absentCount = 0;
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

      {/* Office Hours Banner */}
      <div style={{background:`${C.accent}10`,border:`1px solid ${C.accent}33`,borderRadius:10,padding:'10px 16px',marginBottom:16,fontSize:12,color:C.muted}}>
        🕙 Office hours: <strong style={{color:C.accent}}>10:00 AM – 07:00 PM</strong> · Working less than 4.5 hours is marked as <strong style={{color:C.orange}}>Half Day</strong>
      </div>

      {checkoutMsg && (
        <div style={{background:`${C.orange}15`,border:`1px solid ${C.orange}44`,borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:13,color:C.orange,fontWeight:600}}>
          ⚠ {checkoutMsg}
        </div>
      )}

      {/* Check In/Out Card */}
      <div style={{background:C.card,border:`1px solid ${isHoliday?C.yellow+'44':C.border}`,borderRadius:16,padding:'18px 20px',marginBottom:20}}>
        {isHoliday ? (
          <div style={{color:C.yellow,fontWeight:700,fontSize:15}}>
            🎉 Today is a Holiday{today?.holiday ? ` — ${today.holiday.name}` : ''}
          </div>
        ) : !rec?.check_in ? (
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
            <div>
              <div style={{fontSize:14,fontWeight:700}}>Not checked in yet</div>
              <div style={{fontSize:12,color:C.muted,marginTop:2}}>Office hours: 10:00 AM – 7:00 PM (IST)</div>
            </div>
            <Btn onClick={checkIn} color={C.green}>✅ Check In</Btn>
          </div>
        ) : (
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.green}}>✅ Checked in at {rec.check_in?.slice(0,5)}</div>
              {rec.check_out
                ? <div style={{fontSize:12,marginTop:4}}>
                    Checked out at <strong>{rec.check_out?.slice(0,5)}</strong>
                    {(rec.status === 'half_day' || rec.status === 'half_day_first' || rec.status === 'half_day_second') && (
                  <div style={{fontSize:12,marginTop:4}}>
                    <span style={{color:C.orange,fontWeight:700}}>
                      🕐 {STATUS_LABEL[rec.status] || 'Half Day'}
                    </span>
                  </div>
                )}
                  </div>
                : <div style={{fontSize:12,color:C.muted,marginTop:2}}>Still working — checkout when leaving</div>}
            </div>
            {!rec.check_out && <Btn onClick={checkOut} color={C.orange}>🚪 Check Out</Btn>}
            {rec.check_out && (
              <div style={{padding:'6px 14px',borderRadius:8,background:`${C.green}15`,border:`1px solid ${C.green}33`,color:C.green,fontSize:12,fontWeight:700}}>
                ✓ Signed off for today
              </div>
            )}
          </div>
        )}
      </div>

      {/* Month Selector + Stats */}
      <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'center',flexWrap:'wrap'}}>
        <select value={month} onChange={e=>setMonth(parseInt(e.target.value))} style={{padding:'7px 12px',borderRadius:8,width:'auto'}}>
          {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={e=>setYear(parseInt(e.target.value))} style={{padding:'7px 12px',borderRadius:8,width:'auto'}}>
          {[2024,2025,2026].map(y=><option key={y}>{y}</option>)}
        </select>
        <div style={{display:'flex',gap:12,marginLeft:8,flexWrap:'wrap'}}>
          <span style={{fontSize:12,color:C.green,fontWeight:700}}>✅ {presentCount} Present</span>
          <span style={{fontSize:12,color:C.orange,fontWeight:700}}>🕐 {halfDayCount} Half Day</span>
          <span style={{fontSize:12,color:C.yellow,fontWeight:700}}>🌴 {leaveCount} Leave</span>
          <span style={{fontSize:12,color:C.red,fontWeight:700}}>❌ {absentCount} Absent</span>
        </div>
      </div>

      {/* Vertical Sheet */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr 1fr 1fr 1fr',padding:'12px 20px',borderBottom:`1px solid ${C.border}`,fontSize:11,color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px'}}>
          <span>Date</span><span>Day</span><span>Status</span><span>In</span><span>Out</span>
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
              display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr 1fr 1fr',
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
              </div>
              {/* Out Time — show dash for absent/holiday/future */}
              <div style={{fontSize:13,color:info.check_out?C.orange:C.muted,fontWeight:info.check_out?600:400}}>
                {isAbs || isHol || isFut ? '—' : (info.check_out?.slice(0,5) || '—')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Leave Modal */}
      {leaveModal && (
        <Modal title="Apply for Leave" onClose={()=>setLeaveModal(false)}>
          <Field label="Leave Type">
            <select value={lForm.leave_type} onChange={e=>setLForm({...lForm,leave_type:e.target.value})}>
              <option value="PL">Privilege Leave (PL)</option>
              <option value="CL">Casual Leave (CL)</option>
              <option value="SL">Sick Leave (SL)</option>
            </select>
          </Field>
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
