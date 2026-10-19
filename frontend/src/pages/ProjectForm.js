import { useEffect, useState } from 'react';
import { useNavigate, useParams } from '../lib/router';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { C, priorityColors } from '../theme';
import { Btn, Field, Spinner, Badge } from '../components/UI';

const sColor = { todo:C.muted, in_progress:C.accent, review:C.yellow, done:C.green };
const sLabel = { todo:'To Do', in_progress:'In Progress', review:'Review', done:'Done' };

export default function ProjectForm() {
  const nav  = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();
  const isEdit   = !!id;
  const isOwnerHr = ['owner','hr'].includes(user.role);
  const [employees, setEmployees] = useState([]);
  const [clients,   setClients]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [members,   setMembers]   = useState([]);
  const [tasks,     setTasks]     = useState([]);
  const [form, setForm] = useState({name:'',description:'',client_id:'',status:'active',progress:0,start_date:'',due_date:''});

  useEffect(() => {
    const loaders = [api.get('/hr/people').catch(()=>({data:{employees:[],clients:[]}}))];
    if (isEdit) loaders.push(api.get(`/projects/${id}`));
    Promise.all(loaders).then(([people, proj]) => {
      setEmployees(people.data.employees||[]);
      setClients(people.data.clients||[]);
      if (proj) {
        const p = proj.data;
        setForm({name:p.name||'',description:p.description||'',client_id:p.client_id||'',status:p.status||'active',progress:p.progress||0,start_date:p.start_date?.split('T')[0]||p.start_date||'',due_date:p.due_date?.split('T')[0]||p.due_date||''});
        setMembers((p.members||[]).map(m=>({id:m.user_id,name:m.name,role:m.role||'member'})));
        setTasks(p.tasks||[]);
      }
      setLoading(false);
    });
  }, [id]);

  const toggleMember = (emp) => {
    if (members.find(m=>m.id===emp.id)) setMembers(members.filter(m=>m.id!==emp.id));
    else setMembers([...members,{id:emp.id,name:emp.name,role:'member'}]);
  };

  const buildPayload = () => ({...form, client_id:form.client_id===''?null:form.client_id, start_date:form.start_date===''?null:form.start_date, due_date:form.due_date===''?null:form.due_date});

  const submit = async () => {
    if (!form.name.trim()) { alert('Please enter a project name'); return; }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        await api.put(`/projects/${id}`, payload);
        for (const m of members) await api.post(`/projects/${id}/members`, {user_id:m.id,role:m.role});
      } else {
        const { data } = await api.post('/projects', {...payload,members:members.map(m=>m.id)});
        nav(`/projects/edit/${data.id}`); return;
      }
      nav('/projects');
    } catch (err) { alert(err.response?.data?.message||'Error saving project'); }
    setSaving(false);
  };

  const deleteProject = async () => {
    if (!window.confirm('Delete this project? Tasks linked to it will be unlinked but not deleted.')) return;
    try { await api.delete(`/projects/${id}`); nav('/projects'); }
    catch(err) { alert(err.response?.data?.message||'Error'); }
  };

  const removeMember = async (mid) => {
    if (isEdit) await api.delete(`/projects/${id}/members/${mid}`);
    setMembers(members.filter(m=>m.id!==mid));
  };

  if (loading) return <Spinner />;

  return (
    <div className="fade-in" style={{maxWidth:760,margin:'0 auto',paddingBottom:40}}>
      <div style={{marginBottom:24,display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
        <div>
          <button onClick={()=>nav('/projects')} style={{background:'none',border:'none',color:C.muted,fontSize:13,cursor:'pointer',marginBottom:8,padding:0}}>← Back to Projects</button>
          <h1 style={{fontSize:22,fontWeight:800}}>{isEdit?'Edit Project':'New Project'} 🚀</h1>
          <div style={{color:C.muted,fontSize:13,marginTop:2}}>{isEdit?form.name:'Create a new project and assign your team'}</div>
        </div>
        {isEdit&&isOwnerHr&&<button onClick={deleteProject} style={{padding:'8px 14px',borderRadius:8,border:`1px solid ${C.red}44`,background:`${C.red}15`,color:C.red,fontSize:12,fontWeight:700,cursor:'pointer'}}>🗑 Delete Project</button>}
      </div>

      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'24px 26px',marginBottom:18}}>
        {isOwnerHr ? (
          <>
            <Field label="Project Name"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Website Redesign" autoFocus /></Field>
            <Field label="Description"><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3} placeholder="Project scope, goals..." /></Field>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <Field label="Client (optional)">
                <select value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}>
                  <option value="">No client</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                  <option value="active">Active</option><option value="at_risk">At Risk</option><option value="completed">Completed</option><option value="on_hold">On Hold</option>
                </select>
              </Field>
              <Field label="Start Date"><input type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})} /></Field>
              <Field label="Due Date"><input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} /></Field>
            </div>
          </>
        ) : (<div style={{marginBottom:4}}><div style={{fontSize:16,fontWeight:800,marginBottom:4}}>{form.name}</div><div style={{fontSize:13,color:C.muted}}>{form.description}</div></div>)}
        <Field label={`Progress: ${form.progress}%`}>
          <input type="range" min="0" max="100" value={form.progress} onChange={e=>setForm({...form,progress:parseInt(e.target.value)})} style={{padding:0,background:'none',border:'none',accentColor:C.accent}} />
        </Field>
      </div>

      {isOwnerHr && (
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'24px 26px',marginBottom:18}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>Tag Team Members</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:14}}>
            {employees.map(e=>{
              const tagged=members.find(m=>m.id===e.id);
              return <button key={e.id} onClick={()=>toggleMember(e)} style={{padding:'8px 14px',borderRadius:20,border:`1px solid ${tagged?C.accent:C.border}`,background:tagged?`${C.accent}22`:C.surface,color:tagged?C.accent:C.text,fontSize:12,fontWeight:600,cursor:'pointer'}}>{tagged?'✓ ':''}{e.name}</button>;
            })}
          </div>
          {members.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {members.map(m=>(
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:C.surface,borderRadius:10,fontSize:12}}>
                <span style={{fontWeight:600}}>{m.name}</span>
                {isEdit&&<button onClick={()=>removeMember(m.id)} style={{background:'none',border:'none',color:C.red,cursor:'pointer',fontSize:12}}>✕</button>}
              </div>
            ))}
          </div>}
        </div>
      )}

      {isEdit && (
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'24px 26px',marginBottom:18}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
            <div style={{fontSize:14,fontWeight:700}}>Project Tasks ({tasks.length})</div>
            <button onClick={()=>nav('/tasks/new')} style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${C.accent}`,background:`${C.accent}15`,color:C.accent,fontSize:12,fontWeight:700,cursor:'pointer'}}>+ Add Task</button>
          </div>
          {tasks.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:'center',padding:'12px 0'}}>No tasks yet</div>}
          {tasks.map((t,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:`1px solid ${C.border}22`,flexWrap:'wrap',gap:8}}>
              <div><div style={{fontWeight:600,fontSize:13}}>{t.title}</div><div style={{fontSize:11,color:C.muted}}>👤 {t.assigned_name||'Unassigned'}</div></div>
              <div style={{display:'flex',gap:6}}>
                <span style={{padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:700,background:`${sColor[t.status]}22`,color:sColor[t.status]}}>{sLabel[t.status]}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <Btn onClick={submit} style={{flex:1,minWidth:140}}>{saving?'Saving...':(isEdit?'Update Project':'Create Project')}</Btn>
        <Btn onClick={()=>nav('/projects')} color={C.muted} outline style={{flex:1,minWidth:140}}>Cancel</Btn>
      </div>
    </div>
  );
}
