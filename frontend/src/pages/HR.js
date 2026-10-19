import { useEffect, useState } from 'react';
import { useNavigate } from '../lib/router';
import api from '../api';
import { C } from '../theme';
import { Btn, Modal, Field, Spinner, Badge, Avatar, ProgressBar, TableCard, Row } from '../components/UI';

export default function HR() {
  const nav = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEmp,   setEditEmp]   = useState(null);
  const [pwModal,   setPwModal]   = useState(null);
  const [newPw,     setNewPw]     = useState('');
  const [leaveReqs, setLeaveReqs] = useState([]);
  const [tab,       setTab]       = useState('employees');
  const [statusModal, setStatusModal] = useState(null);
  const [form, setForm] = useState({name:'',email:'',phone:'',role:'team',department:'',designation:'',date_of_joining:'',basic_salary:'',hra:'',other_allowance:''});

  const load = async () => {
    const [emp, lv] = await Promise.all([api.get('/hr/employees'), api.get('/hr/leaves')]);
    setEmployees(emp.data); setLeaveReqs(lv.data); setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const openAdd = () => { setEditEmp(null); setForm({name:'',email:'',phone:'',role:'team',department:'',designation:'',date_of_joining:'',basic_salary:'',hra:'',other_allowance:''}); setShowModal(true); };
  const openEdit = (emp) => { setEditEmp(emp); setForm({name:emp.name||'',email:emp.email||'',phone:emp.phone||'',role:emp.role||'team',department:emp.department||'',designation:emp.designation||'',date_of_joining:emp.date_of_joining?.split('T')[0]||'',basic_salary:emp.basic_salary||'',hra:emp.hra||'',other_allowance:emp.other_allowance||''}); setShowModal(true); };

  const save = async () => {
    try {
      if (editEmp) await api.put(`/hr/employees/${editEmp.id}`, form);
      else await api.post('/hr/employees', form);
      setShowModal(false); setEditEmp(null); load();
    } catch(err) { alert(err.response?.data?.message||'Error'); }
  };

  const markStatus = async (action) => { await api.delete(`/hr/employees/${statusModal.id}`, { data:{action} }); setStatusModal(null); load(); };
  const resetPw = async () => {
    if (newPw.length < 6) { alert('Minimum 6 characters required'); return; }
    try { 
      await api.put(`/hr/employees/${pwModal.id}/reset-password`, { new_password: newPw }); 
      setPwModal(null); setNewPw(''); 
      alert(`Password for ${pwModal.name} has been reset. They must use the new password on their next login.`); 
    }
    catch(err) { alert(err.response?.data?.message||'Error'); }
  };
  const approveLeave = async (id, status) => { await api.put(`/hr/leaves/${id}`, { status }); load(); };

  if (loading) return <Spinner />;
  const activeEmps   = employees.filter(e=>!e.emp_status||e.emp_status==='active');
  const inactiveEmps = employees.filter(e=>e.emp_status==='resigned'||e.emp_status==='terminated');
  const pending      = leaveReqs.filter(l=>l.status==='pending');

  return (
    <div className="fade-in">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800}}>HR Module 🧑‍💼</h1>
          <div style={{color:C.muted,fontSize:13,marginTop:2}}>{activeEmps.length} active · {inactiveEmps.length} inactive · {pending.length} pending leaves</div>
        </div>
        <Btn onClick={openAdd} small>+ Add Employee</Btn>
      </div>

      <div style={{display:'flex',gap:4,background:C.card,padding:'5px 6px',borderRadius:12,border:`1px solid ${C.border}`,marginBottom:20,width:'fit-content',overflowX:'auto'}}>
        {[{key:'employees',label:'👥 Active'},{key:'inactive',label:'📁 Resigned/Terminated'},{key:'leaves',label:`🌴 Leaves${pending.length>0?` (${pending.length})`:''}`}].map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} style={{padding:'7px 14px',borderRadius:8,border:'none',background:tab===t.key?C.accent:'transparent',color:tab===t.key?'#fff':C.muted,fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>{t.label}</button>
        ))}
      </div>

      {tab==='employees' && (
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 160px',padding:'12px 20px',borderBottom:`1px solid ${C.border}`,fontSize:11,color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px'}}>
            <span>Employee</span><span>Dept</span><span>Designation</span><span>Salary</span><span>Leave</span><span>Actions</span>
          </div>
          {activeEmps.map((e,i)=>(
            <div key={e.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 160px',padding:'13px 20px',borderBottom:`1px solid ${C.border}22`,alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <Avatar initials={e.avatar||e.name?.slice(0,2)} size={34} />
                <div><div style={{fontWeight:600,fontSize:13}}>{e.name}</div><div style={{fontSize:11,color:C.muted}}>{e.email}</div></div>
              </div>
              <div style={{fontSize:12}}>{e.department||'—'}</div>
              <div style={{fontSize:12}}>{e.designation||'—'}</div>
              <div style={{fontSize:13,fontWeight:600,color:C.green}}>₹{Number(e.basic_salary||0).toLocaleString()}</div>
              <div><div style={{fontSize:12,fontWeight:600,color:e.leave_balance>10?C.green:C.orange}}>{e.leave_balance||0} days</div></div>
              <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                <button onClick={()=>nav(`/employees/${e.id}`)} style={{padding:'4px 8px',borderRadius:5,border:`1px solid ${C.accent}44`,background:`${C.accent}15`,color:C.accent,fontSize:10,fontWeight:700,cursor:'pointer'}}>Profile</button>
                <button onClick={()=>openEdit(e)} style={{padding:'4px 8px',borderRadius:5,border:`1px solid ${C.green}44`,background:`${C.green}15`,color:C.green,fontSize:10,fontWeight:700,cursor:'pointer'}}>Edit</button>
                <button onClick={()=>{setPwModal(e);setNewPw('');}} style={{padding:'4px 8px',borderRadius:5,border:`1px solid ${C.yellow}44`,background:`${C.yellow}15`,color:C.yellow,fontSize:10,fontWeight:700,cursor:'pointer'}}>Pwd</button>
                <button onClick={()=>setStatusModal(e)} style={{padding:'4px 8px',borderRadius:5,border:`1px solid ${C.red}44`,background:`${C.red}15`,color:C.red,fontSize:10,fontWeight:700,cursor:'pointer'}}>Status</button>
              </div>
            </div>
          ))}
          {activeEmps.length===0&&<div style={{padding:24,textAlign:'center',color:C.muted,fontSize:13}}>No active employees</div>}
        </div>
      )}

      {tab==='inactive' && (
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'12px 20px',borderBottom:`1px solid ${C.border}`,fontSize:12,color:C.orange}}>ℹ️ Data preserved for reference. Records are never deleted.</div>
          {inactiveEmps.map((e,i)=>(
            <div key={e.id} style={{display:'flex',alignItems:'center',gap:14,padding:'13px 20px',borderBottom:`1px solid ${C.border}22`}}>
              <Avatar initials={e.avatar||e.name?.slice(0,2)} size={34} />
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{e.name}</div><div style={{fontSize:11,color:C.muted}}>{e.email} · {e.designation}</div></div>
              <Badge color={e.emp_status==='resigned'?C.yellow:C.red}>{e.emp_status}</Badge>
              <button onClick={()=>nav(`/employees/${e.id}`)} style={{padding:'4px 10px',borderRadius:6,border:`1px solid ${C.accent}44`,background:`${C.accent}15`,color:C.accent,fontSize:11,fontWeight:700,cursor:'pointer'}}>View</button>
            </div>
          ))}
          {inactiveEmps.length===0&&<div style={{padding:24,textAlign:'center',color:C.muted,fontSize:13}}>No resigned/terminated employees</div>}
        </div>
      )}

      {tab==='leaves' && (
        <TableCard title="Leave Requests">
          {leaveReqs.length===0&&<div style={{padding:24,textAlign:'center',color:C.muted,fontSize:13}}>No leave requests</div>}
          {leaveReqs.map((l,i)=>(
            <Row key={i} i={i}>
              <Avatar initials={l.avatar||l.name?.slice(0,2)} color={C.orange} size={32} />
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{l.name}</div>
                <div style={{fontSize:11,color:C.muted}}>{l.leave_type} · {new Date(l.from_date).toLocaleDateString('en-IN')} → {new Date(l.to_date).toLocaleDateString('en-IN')} · {l.days} day(s)</div>
                {l.reason&&<div style={{fontSize:11,color:C.muted,fontStyle:'italic'}}>"{l.reason}"</div>}
              </div>
              <Badge color={l.status==='approved'?C.green:l.status==='rejected'?C.red:C.yellow}>{l.status}</Badge>
              {l.status==='pending'&&(
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>approveLeave(l.id,'approved')} style={{padding:'5px 12px',borderRadius:6,border:'none',background:`${C.green}22`,color:C.green,fontSize:12,fontWeight:700,cursor:'pointer'}}>✓</button>
                  <button onClick={()=>approveLeave(l.id,'rejected')} style={{padding:'5px 12px',borderRadius:6,border:'none',background:`${C.red}22`,color:C.red,fontSize:12,fontWeight:700,cursor:'pointer'}}>✗</button>
                </div>
              )}
            </Row>
          ))}
        </TableCard>
      )}

      {showModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto'}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:28,width:'100%',maxWidth:580,maxHeight:'90vh',overflowY:'auto'}} className="fade-in">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,position:'sticky',top:0,background:C.card,paddingBottom:12,borderBottom:`1px solid ${C.border}`}}>
              <div style={{fontSize:17,fontWeight:800}}>{editEmp?`Edit — ${editEmp.name}`:'Add New Employee'}</div>
              <button onClick={()=>{setShowModal(false);setEditEmp(null);}} style={{background:`${C.red}22`,border:`1px solid ${C.red}44`,color:C.red,borderRadius:8,width:32,height:32,fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <Field label="Full Name"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
              <Field label="Email"><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></Field>
              <Field label="Phone"><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></Field>
              <Field label="Role"><select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="team">Team</option><option value="hr">HR</option></select></Field>
              <Field label="Department"><input value={form.department} onChange={e=>setForm({...form,department:e.target.value})} /></Field>
              <Field label="Designation"><input value={form.designation} onChange={e=>setForm({...form,designation:e.target.value})} /></Field>
              <Field label="Date of Joining"><input type="date" value={form.date_of_joining} onChange={e=>setForm({...form,date_of_joining:e.target.value})} /></Field>
              <div/>
              <Field label="Basic Salary (₹)"><input type="number" value={form.basic_salary} onChange={e=>setForm({...form,basic_salary:e.target.value})} /></Field>
              <Field label="HRA (₹)"><input type="number" value={form.hra} onChange={e=>setForm({...form,hra:e.target.value})} /></Field>
              <Field label="Other Allowance (₹)"><input type="number" value={form.other_allowance} onChange={e=>setForm({...form,other_allowance:e.target.value})} /></Field>
            </div>
            {!editEmp&&<div style={{fontSize:12,color:C.muted,marginTop:10,padding:'8px 12px',background:C.surface,borderRadius:8}}>Default password: <strong>password123</strong></div>}
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <Btn onClick={save} style={{flex:1}}>{editEmp?'Update':'Add'} Employee</Btn>
              <Btn onClick={()=>{setShowModal(false);setEditEmp(null);}} color={C.muted} outline style={{flex:1}}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}

      {statusModal&&(
        <Modal title={`Change Status — ${statusModal.name}`} onClose={()=>setStatusModal(null)}>
          <div style={{background:`${C.orange}15`,border:`1px solid ${C.orange}33`,borderRadius:10,padding:'12px 14px',marginBottom:16,fontSize:13,color:C.orange}}>ℹ️ Data is NEVER deleted — only status changes.</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <button onClick={()=>markStatus('resigned')} style={{padding:'12px 16px',borderRadius:10,border:`1px solid ${C.yellow}44`,background:`${C.yellow}15`,color:C.yellow,fontSize:14,fontWeight:700,cursor:'pointer',textAlign:'left'}}>🔶 Mark as Resigned</button>
            <button onClick={()=>markStatus('terminated')} style={{padding:'12px 16px',borderRadius:10,border:`1px solid ${C.red}44`,background:`${C.red}15`,color:C.red,fontSize:14,fontWeight:700,cursor:'pointer',textAlign:'left'}}>🔴 Mark as Terminated</button>
            <Btn onClick={()=>setStatusModal(null)} color={C.muted} outline style={{width:'100%'}}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {pwModal&&(
        <Modal title={`Reset Password — ${pwModal.name}`} onClose={()=>setPwModal(null)}>
          <div style={{background:`${C.orange}15`,border:`1px solid ${C.orange}33`,borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:13,color:C.orange}}>⚠ This immediately changes the employee's login password</div>
          <Field label="New Password"><input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Min 6 characters" /></Field>
          <div style={{display:'flex',gap:10,marginTop:8}}>
            <Btn onClick={resetPw} color={C.green} style={{flex:1}}>Reset Password</Btn>
            <Btn onClick={()=>setPwModal(null)} color={C.muted} outline style={{flex:1}}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
