import { useEffect, useState } from 'react';
import api from '../api';
import { C } from '../theme';
import { StatCard, TableCard, Row, Badge, Pill, ProgressBar, Avatar, Spinner, Btn } from '../components/UI';
import useIsMobile from '../hooks/useIsMobile';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function HRDashboard() {
  const isMobile = useIsMobile();
  const [data, setData] = useState(null);
  const load = () => api.get('/dashboard/hr').then(r=>setData(r.data));
  useEffect(()=>{ load(); },[]);
  const handleLeave = async (id, status) => { await api.put(`/hr/leaves/${id}`, { status }); load(); };
  const processPayroll = async () => { const now=new Date(); await api.post('/hr/payroll/process',{month:now.getMonth()+1,year:now.getFullYear()}); alert('Payroll processed!'); };
  const accrueLeave = async () => { await api.post('/hr/leaves/accrue'); alert('+1.5 days accrued!'); load(); };
  const markAbsent = async () => { const {data:r}=await api.post('/attendance/mark-absent'); alert(r.message); load(); };

  if (!data) return <Spinner />;
  const { stats, payroll, leave_requests, today_attendance, leave_balances } = data;
  const now = new Date();
  const presentList = (today_attendance||[]).filter(a=>a.status==='present');
  const absentList  = (today_attendance||[]).filter(a=>a.status==='absent'||!a.status);
  const leaveList   = (today_attendance||[]).filter(a=>a.status==='leave');

  return (
    <div className="fade-in">
      <div style={{marginBottom:28,display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.5px'}}>HR Control Center 🧑‍💼</h1>
          <div style={{color:C.muted,fontSize:13,marginTop:4}}>{MONTHS[now.getMonth()]} {now.getFullYear()}</div>
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <Btn onClick={markAbsent} color={C.red} outline small>⚠ Mark Absent</Btn>
          <Btn onClick={accrueLeave} color={C.yellow} outline small>+ Accrue 1.5 Leaves</Btn>
          <Btn onClick={processPayroll} color={C.green} small>Process Payroll</Btn>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:18,marginBottom:22}}>
        <StatCard label="Total Employees" value={stats.total} icon="👥" color={C.accent} />
        <StatCard label="Present Today" value={presentList.length} icon="✅" color={C.green} />
        <StatCard label="Absent / Leave" value={`${absentList.length}/${leaveList.length}`} icon="🌴" color={C.orange} />
        <StatCard label="Pending Leaves" value={leave_requests.filter(l=>l.status==='pending').length} icon="🏖️" color={C.yellow} />
      </div>

      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr',gap:18,marginBottom:22}}>
        <TableCard title="Payroll Breakdown" badge={<Pill color={C.orange}>{MONTHS[now.getMonth()]} {now.getFullYear()}</Pill>}>
          {(payroll||[]).length===0&&<div style={{padding:'20px',color:C.muted,fontSize:13,textAlign:'center'}}>No payroll processed yet</div>}
          {(payroll||[]).map((e,i)=>(
            <Row key={i} i={i}>
              <Avatar initials={e.avatar||e.name?.slice(0,2)} size={32} />
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{e.name}</div>
                <div style={{fontSize:11,color:C.muted}}>Basic: ₹{Number(e.basic).toLocaleString()} · HRA: ₹{Number(e.hra).toLocaleString()}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:800,color:C.green,fontSize:14}}>₹{Number(e.net_salary).toLocaleString()}</div>
                <Badge color={e.status==='paid'?C.green:C.orange}>{e.status}</Badge>
              </div>
            </Row>
          ))}
        </TableCard>

        <TableCard title="Pending Leave Requests">
          {(leave_requests||[]).filter(l=>l.status==='pending').length===0&&<div style={{padding:'20px',color:C.muted,fontSize:13,textAlign:'center'}}>No pending requests</div>}
          {(leave_requests||[]).filter(l=>l.status==='pending').map((l,i)=>(
            <Row key={i} i={i}>
              <Avatar initials={l.avatar||l.name?.slice(0,2)} color={C.orange} size={30} />
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{l.name}</div>
                <div style={{fontSize:11,color:C.muted}}>{new Date(l.from_date).toLocaleDateString('en-IN')} · {l.days}d · {l.leave_type}</div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>handleLeave(l.id,'approved')} style={{padding:'4px 10px',borderRadius:6,border:'none',background:`${C.green}22`,color:C.green,fontSize:12,fontWeight:700,cursor:'pointer'}}>✓</button>
                <button onClick={()=>handleLeave(l.id,'rejected')} style={{padding:'4px 10px',borderRadius:6,border:'none',background:`${C.red}22`,color:C.red,fontSize:12,fontWeight:700,cursor:'pointer'}}>✗</button>
              </div>
            </Row>
          ))}
        </TableCard>
      </div>

      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',gap:18}}>
        <div style={{background:C.card,border:`1px solid ${C.green}44`,borderRadius:16,padding:'20px 22px'}}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>✅ Present Today ({presentList.length})</div>
          <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:240,overflowY:'auto'}}>
            {presentList.length===0&&<div style={{color:C.muted,fontSize:12,textAlign:'center',padding:'10px 0'}}>No check-ins yet</div>}
            {presentList.map((a,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12,alignItems:'center'}}>
                <span style={{display:'flex',alignItems:'center',gap:6}}><Avatar initials={a.avatar||a.name?.slice(0,2)} size={22} />{a.name}</span>
                <span style={{color:C.green,fontWeight:600}}>{a.check_in?.slice(0,5)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{background:C.card,border:`1px solid ${C.red}33`,borderRadius:16,padding:'20px 22px'}}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>❌ Absent/Leave ({absentList.length + leaveList.length})</div>
          <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:240,overflowY:'auto'}}>
            {absentList.length===0&&leaveList.length===0&&<div style={{color:C.muted,fontSize:12,textAlign:'center',padding:'10px 0'}}>Everyone present 🎉</div>}
            {absentList.map((a,i)=>(<div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12,alignItems:'center'}}><span style={{display:'flex',alignItems:'center',gap:6}}><Avatar initials={a.avatar||a.name?.slice(0,2)} size={22} color={C.red} />{a.name}</span><span style={{color:C.red,fontWeight:600}}>Absent</span></div>))}
            {leaveList.map((a,i)=>(<div key={`l${i}`} style={{display:'flex',justifyContent:'space-between',fontSize:12,alignItems:'center'}}><span style={{display:'flex',alignItems:'center',gap:6}}><Avatar initials={a.avatar||a.name?.slice(0,2)} size={22} color={C.yellow} />{a.name}</span><span style={{color:C.yellow,fontWeight:600}}>🌴 Leave</span></div>))}
          </div>
        </div>

        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'20px 22px'}}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>Leave Balances</div>
          <div style={{maxHeight:240,overflowY:'auto'}}>
            {(leave_balances||[]).map((e,i)=>{
              const pct=(e.leave_balance/18)*100;
              return (<div key={i} style={{marginBottom:14}}><div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}><span style={{fontWeight:600}}>{e.name?.split(' ')[0]}</span><span style={{color:pct>60?C.green:C.orange,fontWeight:700}}>{e.leave_balance}d</span></div><ProgressBar pct={pct} color={pct>60?C.green:C.orange} /></div>);
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
