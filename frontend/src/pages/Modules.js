import { useEffect, useState } from 'react';
import { useNavigate } from '../lib/router';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { C, statusColors } from '../theme';
import { Badge, Btn, Spinner, ProgressBar, Avatar } from '../components/UI';

export function Projects() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const load = ()=>api.get('/projects').then(r=>{ setProjects(r.data); setLoading(false); });
  useEffect(()=>{ load(); },[]);
  if(loading) return <Spinner />;
  const canCreate = ['owner','hr'].includes(user.role);

  return (
    <div className="fade-in">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div><h1 style={{fontSize:22,fontWeight:800}}>Projects 🚀</h1><div style={{color:C.muted,fontSize:13,marginTop:2}}>{projects.length} projects</div></div>
        {canCreate && <Btn onClick={()=>nav('/projects/new')} small>+ Project</Btn>}
      </div>
      {projects.length===0&&<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:40,textAlign:'center',color:C.muted}}>No projects yet</div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:18}}>
        {projects.map(p=>(
          <div key={p.id} onClick={()=>nav(`/projects/edit/${p.id}`)} style={{background:C.card,border:`1px solid ${p.status==='at_risk'?C.orange+'44':C.border}`,borderRadius:16,padding:'20px 22px',cursor:'pointer'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
              <Badge color={(statusColors||{})[p.status]||C.muted}>{p.status?.replace('_',' ')}</Badge>
              <span style={{fontSize:16}}>✏️</span>
            </div>
            <div style={{fontSize:16,fontWeight:800,marginBottom:4}}>{p.name}</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:14}}>{p.client_name&&`Client: ${p.client_name} · `}Due {p.due_date?new Date(p.due_date).toLocaleDateString('en-IN',{month:'short',day:'numeric',year:'numeric'}):'—'}</div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4}}>
              <span style={{color:C.muted}}>Progress</span>
              <span style={{fontWeight:700,color:p.status==='at_risk'?C.orange:C.green}}>{p.progress}%</span>
            </div>
            <ProgressBar pct={p.progress} color={p.status==='at_risk'?C.orange:C.green} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Payroll() {
  const [payroll, setPayroll] = useState([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  useEffect(()=>{ api.get(`/hr/payroll?month=${now.getMonth()+1}&year=${now.getFullYear()}`).then(r=>{ setPayroll(r.data); setLoading(false); }); },[]);
  if(loading) return <Spinner />;
  const total = payroll.reduce((s,p)=>s+Number(p.net_salary||0),0);
  return (
    <div className="fade-in">
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div><h1 style={{fontSize:22,fontWeight:800}}>Payroll 💳</h1><div style={{color:C.muted,fontSize:13,marginTop:2}}>₹{total.toLocaleString()} total</div></div>
        <Btn onClick={()=>api.post('/hr/payroll/process',{month:now.getMonth()+1,year:now.getFullYear()}).then(()=>alert('Processed!'))} color={C.green} small>Process Payroll</Btn>
      </div>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 80px',padding:'12px 20px',borderBottom:`1px solid ${C.border}`,fontSize:11,color:C.muted,fontWeight:700,textTransform:'uppercase'}}>
          <span>Employee</span><span>Basic</span><span>HRA</span><span>Other</span><span>Net Salary</span><span>Status</span>
        </div>
        {payroll.map((p,i)=>(
          <div key={p.user_id} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 80px',padding:'14px 20px',borderBottom:`1px solid ${C.border}22`,alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <Avatar initials={p.avatar||p.name?.slice(0,2)} size={32} />
              <div><div style={{fontWeight:600,fontSize:13}}>{p.name}</div><div style={{fontSize:11,color:C.muted}}>{p.department}</div></div>
            </div>
            <div>₹{Number(p.basic||0).toLocaleString()}</div>
            <div>₹{Number(p.hra||0).toLocaleString()}</div>
            <div>₹{Number(p.other||0).toLocaleString()}</div>
            <div style={{fontSize:15,fontWeight:800,color:C.green}}>₹{Number(p.net_salary||0).toLocaleString()}</div>
            <Badge color={p.status==='paid'?C.green:p.status==='processed'?C.accent:C.orange}>{p.status}</Badge>
          </div>
        ))}
        <div style={{padding:'16px 20px',borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between'}}>
          <span style={{color:C.muted,fontWeight:600}}>Total</span>
          <span style={{fontWeight:800,color:C.green,fontSize:18}}>₹{total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
