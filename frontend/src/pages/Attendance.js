import { useEffect, useState, useRef } from 'react';
import api from '../api';
import { C } from '../theme';
import { StatCard, Badge, Avatar, Spinner, Btn, Modal, Field, TableCard, Row } from '../components/UI';

const STATUS_COLOR = {
  present:C.green, absent:C.red, leave:C.yellow, holiday:C.blue,
  half_day:C.orange, half_day_first:C.orange, half_day_second:C.orange,
};
const STATUS_LABEL = {
  present:'Present', absent:'Absent', leave:'On Leave', holiday:'Holiday',
  half_day:'Half Day', half_day_first:'First Half Leave', half_day_second:'Second Half Leave',
};

export default function Attendance() {
  const [date,      setDate]      = useState(new Date().toISOString().split('T')[0]);
  const [records,   setRecords]   = useState([]);
  const [dayStatus, setDayStatus] = useState('working');
  const [holidays,  setHolidays]  = useState([]);
  const [rules,     setRules]     = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('all');
  const [showHoliday, setShowHoliday] = useState(false);
  const [editHoliday, setEditHoliday] = useState(null);
  const [showManual,  setShowManual]  = useState(false);
  const [showBulk,    setShowBulk]    = useState(false);
  const [csvPreview,  setCsvPreview]  = useState([]);
  const [hForm, setHForm] = useState({name:'',date:'',type:'national'});
  const [mForm, setMForm] = useState({user_id:'',date:'',check_in:'',check_out:'',status:'present'});
  const fileRef = useRef();
  const today = new Date().toISOString().split('T')[0];

  const load = async () => {
    setLoading(true);
    const [att, hol, rul, emp] = await Promise.all([
      api.get(`/attendance/all?date=${date}`),
      api.get('/attendance/holidays'),
      api.get('/attendance/rules'),
      api.get('/hr/employees'),
    ]);
    setRecords(att.data.attendance||[]);
    setDayStatus(att.data.dayStatus||'working');
    setHolidays(hol.data||[]);
    setRules(rul.data||[]);
    setEmployees(emp.data||[]);
    setLoading(false);
  };
  useEffect(()=>{ load(); },[date]);

  const saveHoliday = async()=>{
    if(editHoliday) await api.put(`/attendance/holidays/${editHoliday.id}`,hForm);
    else await api.post('/attendance/holidays',hForm);
    setShowHoliday(false); setEditHoliday(null); setHForm({name:'',date:'',type:'national'}); load();
  };
  const deleteHoliday = async(id)=>{ if(!window.confirm('Delete holiday?'))return; await api.delete(`/attendance/holidays/${id}`); load(); };
  const openEditH = (h)=>{ setEditHoliday(h); setHForm({name:h.name,date:h.date,type:h.type}); setShowHoliday(true); };
  const addManual = async()=>{
    if (!mForm.user_id) { alert('Please select an employee'); return; }
    if (!mForm.date)    { alert('Please select a date'); return; }
    // Strip empty check_out — don't send '' (empty string) which the backend would treat as a value
    const payload = { ...mForm, check_out: mForm.check_out || null };
    try{
      const r = await api.post('/attendance/manual-entry', payload);
      setShowManual(false);
      setMForm({user_id:'',date:'',check_in:'',check_out:'',status:'present'});
      load();
      alert(r.data.message);
    }
    catch(err){ alert(err.response?.data?.message||'Error saving attendance'); }
  };
  const toggleRule = async(r)=>{ await api.put(`/attendance/rules/${r.id}`,{is_active:r.is_active?0:1}); load(); };
  const markAbsent = async()=>{ const r = await api.post('/attendance/mark-absent'); alert(r.data.message); load(); };

  const handleCSV = (e)=>{
    const file=e.target.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      const lines=ev.target.result.trim().split('\n');
      const headers=lines[0].split(',').map(h=>h.trim().toLowerCase());
      const rows=lines.slice(1).map(line=>{
        const vals=line.split(',').map(v=>v.trim());
        const obj={}; headers.forEach((h,i)=>obj[h]=vals[i]||'');
        const emp=employees.find(e=>e.name.toLowerCase().includes(obj.name?.toLowerCase())||String(e.id)===obj.employee_id||String(e.id)===obj.id);
        return { user_id:emp?.id||'', emp_name:emp?.name||obj.name||'Unknown', date:obj.date||'', check_in:obj.check_in||obj['in time']||'', check_out:obj.check_out||obj['out time']||'', status:obj.status||'present' };
      }).filter(r=>r.date);
      setCsvPreview(rows); setShowBulk(true);
    };
    reader.readAsText(file);
  };
  const uploadBulk = async()=>{
    const valid=csvPreview.filter(r=>r.user_id);
    const {data}=await api.post('/attendance/bulk-upload',{records:valid});
    setShowBulk(false); setCsvPreview([]); load();
    if(fileRef.current)fileRef.current.value='';
    alert(`${data.message}${data.skipped?`. ${data.skipped} future dates skipped.`:''}`);
  };

  const filtered = filter==='all' ? records : records.filter(r=>(r.status||'absent')===filter);
  const counts = {
    present:  records.filter(r=>r.status==='present').length,
    half_day: records.filter(r=>r.status==='half_day').length,
    leave:    records.filter(r=>r.status==='leave').length,
    absent:   records.filter(r=>r.status==='absent'||!r.status).length,
  };

  if(loading) return <Spinner />;

  return (
    <div className="fade-in">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800}}>Attendance 📷</h1>
          <div style={{color:C.muted,fontSize:13,marginTop:3}}>Office hours: 10:00 AM – 7:00 PM · Half Day if &lt; 4.5h worked</div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input type="date" value={date} max={today} onChange={e=>setDate(e.target.value)} style={{padding:'7px 12px',borderRadius:8,width:'auto'}} />
          <label style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${C.green}`,color:C.green,fontSize:12,fontWeight:700,cursor:'pointer',background:`${C.green}15`}}>
            📁 CSV <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} style={{display:'none'}} />
          </label>
          <Btn onClick={()=>setShowManual(true)} color={C.accent} outline small>+ Manual Entry</Btn>
          <Btn onClick={()=>{setEditHoliday(null);setHForm({name:'',date:'',type:'national'});setShowHoliday(true);}} color={C.yellow} outline small>+ Holiday</Btn>
          {date===today && <Btn onClick={markAbsent} color={C.red} outline small>⚠ Mark Absent</Btn>}
        </div>
      </div>

      {/* Clickable stat cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:10,marginBottom:20}}>
        {[
          {key:'all',label:'Total',value:records.length,color:C.accent,icon:'👥'},
          {key:'present',label:'Present',value:counts.present,color:C.green,icon:'✅'},
          {key:'half_day',label:'Half Day',value:counts.half_day,color:C.orange,icon:'🕐'},
          {key:'leave',label:'On Leave',value:counts.leave,color:C.yellow,icon:'🌴'},
          {key:'absent',label:'Absent',value:counts.absent,color:C.red,icon:'❌'},
        ].map(s=>(
          <div key={s.key} onClick={()=>setFilter(s.key)} style={{background:C.card,border:`2px solid ${filter===s.key?s.color:C.border}`,borderRadius:14,padding:'14px 16px',cursor:'pointer',transition:'all 0.2s',boxShadow:filter===s.key?`0 0 20px ${s.color}22`:'none'}}>
            <div style={{fontSize:20}}>{s.icon}</div>
            <div style={{fontSize:24,fontWeight:800,color:s.color,marginTop:4}}>{s.value}</div>
            <div style={{fontSize:11,color:C.muted}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{background:`${C.accent}10`,border:`1px solid ${C.accent}33`,borderRadius:10,padding:'10px 16px',marginBottom:16,fontSize:12,display:'flex',gap:20,flexWrap:'wrap',color:C.muted}}>
        <span><span style={{color:C.green,fontWeight:700}}>✅ Present</span> — Checked in &amp; worked 4.5h+</span>
        <span><span style={{color:C.orange,fontWeight:700}}>🕐 Half Day</span> — Checked in but worked &lt;4.5h</span>
        <span><span style={{color:C.yellow,fontWeight:700}}>🌴 Leave</span> — Approved leave</span>
        <span><span style={{color:C.red,fontWeight:700}}>❌ Absent</span> — No check-in</span>
      </div>

      {/* Attendance Table */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:'hidden',marginBottom:18}}>
       <div style={{overflowX:'auto'}}>
        <div style={{minWidth:600}}>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 80px',padding:'12px 20px',borderBottom:`1px solid ${C.border}`,fontSize:11,color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px'}}>
          <span>Employee</span><span>Status</span><span>Check In</span><span>Check Out</span><span>Hours</span><span>Method</span>
        </div>
        {filtered.length===0 && <div style={{padding:30,textAlign:'center',color:C.muted,fontSize:13}}>No records</div>}
        {filtered.map((r,i)=>{
          const status = r.status || 'absent';
          const isAbsent = status === 'absent' || status === 'leave' || status === 'holiday';
          const hrs = !isAbsent && r.check_in && r.check_out
            ? ((new Date(`2000-01-01 ${r.check_out}`)-new Date(`2000-01-01 ${r.check_in}`))/3600000).toFixed(1)
            : null;
          return (
            <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 80px',padding:'13px 20px',borderBottom:`1px solid ${C.border}22`,alignItems:'center',background:i%2===0?'transparent':`${C.surface}44`}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <Avatar initials={r.avatar||r.name?.slice(0,2)} size={32} />
                <div>
                  <div style={{fontWeight:600,fontSize:13}}>{r.name}</div>
                  <div style={{fontSize:10,color:C.muted}}>{r.role}</div>
                </div>
              </div>
              <Badge color={STATUS_COLOR[status]||C.muted}>{STATUS_LABEL[status]||'—'}</Badge>
              <div style={{fontSize:13,fontWeight:500,color:isAbsent?C.muted:(r.check_in?C.green:C.muted)}}>
                {isAbsent ? '—' : (r.check_in?.slice(0,5) || '—')}
              </div>
              <div style={{fontSize:13,fontWeight:500,color:isAbsent?C.muted:(r.check_out?C.orange:C.muted)}}>
                {isAbsent ? '—' : (r.check_out?.slice(0,5) || '—')}
              </div>
              <div style={{fontSize:12,color:hrs?C.accent:C.muted}}>{hrs ? `${hrs}h` : '—'}</div>
              <div style={{fontSize:11,color:C.muted}}>{r.method==='face_kiosk'?'🙂 Face kiosk':(r.method?.replace('_',' ')||'—')}</div>
            </div>
          );
        })}
        </div>
       </div>
      </div>

      {/* Attendance Rules */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'18px 20px',marginBottom:18}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>Attendance Rules</div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {rules.map(r=>(
            <div key={r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:C.surface,borderRadius:10}}>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{r.rule_name}</div>
                <div style={{fontSize:11,color:C.muted}}>{r.rule_type}</div>
              </div>
              <div onClick={()=>toggleRule(r)} style={{width:44,height:24,borderRadius:12,background:r.is_active?C.green:C.border,cursor:'pointer',position:'relative',transition:'all 0.2s',flexShrink:0}}>
                <div style={{position:'absolute',top:2,left:r.is_active?22:2,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'all 0.2s'}}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Holidays */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:'hidden'}}>
        <div style={{padding:'14px 18px',borderBottom:`1px solid ${C.border}`,fontSize:14,fontWeight:700}}>Public Holidays {new Date().getFullYear()}</div>
        {holidays.map((h,i)=>(
          <Row key={i} i={i}>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:13}}>{h.name}</div>
              <div style={{fontSize:11,color:C.muted}}>{new Date(h.date+'T00:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</div>
            </div>
            <Badge color={h.type==='national'?C.accent:h.type==='state'?C.green:C.muted}>{h.type}</Badge>
            <button onClick={()=>openEditH(h)} style={{padding:'4px 10px',borderRadius:6,border:`1px solid ${C.accent}44`,background:`${C.accent}15`,color:C.accent,fontSize:11,fontWeight:700,cursor:'pointer'}}>Edit</button>
            <button onClick={()=>deleteHoliday(h.id)} style={{padding:'4px 10px',borderRadius:6,border:`1px solid ${C.red}44`,background:`${C.red}15`,color:C.red,fontSize:11,fontWeight:700,cursor:'pointer'}}>Del</button>
          </Row>
        ))}
        {holidays.length===0 && <div style={{padding:20,textAlign:'center',color:C.muted,fontSize:13}}>No holidays added yet</div>}
      </div>

      {/* Add Holiday Modal */}
      {showHoliday&&(
        <Modal title={editHoliday?'Edit Holiday':'Add Holiday'} onClose={()=>{setShowHoliday(false);setEditHoliday(null);}}>
          <Field label="Name"><input value={hForm.name} onChange={e=>setHForm({...hForm,name:e.target.value})} /></Field>
          <Field label="Date"><input type="date" value={hForm.date} onChange={e=>setHForm({...hForm,date:e.target.value})} /></Field>
          <Field label="Type">
            <select value={hForm.type} onChange={e=>setHForm({...hForm,type:e.target.value})}>
              <option value="national">National</option><option value="state">State</option><option value="optional">Optional</option>
            </select>
          </Field>
          <Btn onClick={saveHoliday} style={{width:'100%'}}>{editHoliday?'Update':'Add'} Holiday</Btn>
        </Modal>
      )}

      {/* Manual Entry Modal */}
      {showManual&&(
        <Modal title="Manual Attendance Entry" onClose={()=>{setShowManual(false);setMForm({user_id:'',date:'',check_in:'',check_out:'',status:'present'});}}>
          <div style={{background:`${C.orange}15`,border:`1px solid ${C.orange}33`,borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:12,color:C.orange}}>
            ⚠ Half-Day is auto-detected from times. For today, only Check-In is editable — employee checks out themselves later.
          </div>
          <Field label="Employee">
            <select value={mForm.user_id} onChange={e=>setMForm({...mForm,user_id:e.target.value})}>
              <option value="">Select employee</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </Field>
          <Field label="Date"><input type="date" value={mForm.date} max={today} onChange={e=>setMForm({...mForm,date:e.target.value})} /></Field>
          <Field label="Status">
            <select value={mForm.status} onChange={e=>setMForm({...mForm,status:e.target.value})}>
              <option value="present">Present (auto-detects half-day from times)</option>
              <option value="absent">Absent</option>
              <option value="leave">On Leave (full day)</option>
              <option value="half_day_first">First Half Leave (arrived after 1 PM)</option>
              <option value="half_day_second">Second Half Leave (left before 1 PM)</option>
            </select>
          </Field>
          {mForm.status !== 'absent' && mForm.status !== 'leave' && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <Field label="Check In">
                <input
                  type="time"
                  value={mForm.check_in}
                  max={mForm.date===today ? new Date().toTimeString().slice(0,5) : undefined}
                  onChange={e=>setMForm({...mForm,check_in:e.target.value})}
                />
              </Field>
              {/* For today: don't provide a Check Out — employee punches out themselves later */}
              {mForm.date !== today && (
                <Field label="Check Out"><input type="time" value={mForm.check_out} onChange={e=>setMForm({...mForm,check_out:e.target.value})} /></Field>
              )}
            </div>
          )}
          <Btn onClick={addManual} style={{width:'100%'}}>Save Entry</Btn>
        </Modal>
      )}

      {/* Bulk CSV Preview Modal */}
      {showBulk&&(
        <Modal title={`Bulk Import — ${csvPreview.length} records`} onClose={()=>{setShowBulk(false);setCsvPreview([]);}}>
          <div style={{maxHeight:260,overflowY:'auto',marginBottom:12}}>
            {csvPreview.slice(0,20).map((r,i)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:8,padding:'7px 0',borderBottom:`1px solid ${C.border}22`,fontSize:12,alignItems:'center'}}>
                <span style={{color:r.user_id?C.text:C.red}}>{r.emp_name}{!r.user_id?' ⚠':''}</span>
                <span style={{color:C.muted}}>{r.date}</span>
                <span>{r.check_in||'—'} → {r.check_out||'—'}</span>
                <Badge color={r.status==='present'?C.green:r.status==='leave'?C.yellow:C.red}>{r.status}</Badge>
              </div>
            ))}
          </div>
          <Btn onClick={uploadBulk} color={C.green} style={{width:'100%'}}>Import {csvPreview.filter(r=>r.user_id).length} Valid Records</Btn>
        </Modal>
      )}
    </div>
  );
}
