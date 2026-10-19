import { useEffect, useState } from 'react';
import { useNavigate, useParams } from '../lib/router';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';
import { Btn, Field, Spinner } from '../components/UI';

export default function TaskForm() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();
  const [employees, setEmployees] = useState([]);
  const [projects,  setProjects]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [task,      setTask]      = useState(null);
  const [form, setForm] = useState({
    title:'', description:'', project_id:'', assigned_to:'',
    priority:'medium', due_date:'', due_time:'', estimated_hours:''
  });

  useEffect(() => {
    const loaders = [
      api.get('/hr/people').catch(()=>({data:{employees:[]}})),
      api.get('/projects'),
    ];
    if (id) loaders.push(api.get(`/tasks/${id}`));
    Promise.all(loaders).then(([people, proj, taskRes]) => {
      setEmployees(people.data.employees||[]);
      setProjects(proj.data||[]);
      if (taskRes) {
        const t = taskRes.data;
        setTask(t);
        setForm({
          title:t.title||'',
          description:t.description||'',
          project_id:t.project_id||'',
          assigned_to:t.assigned_to||'',
          priority:t.priority||'medium',
          due_date:t.due_date?.split('T')[0]||t.due_date||'',
          due_time:t.due_time?.slice(0,5)||'',
          estimated_hours:t.estimated_hours||''
        });
      }
      setLoading(false);
    });
  }, [id]);

  const submit = async () => {
    if (!form.title.trim()) { alert('Please enter a task title'); return; }
    setSaving(true);
    try {
      if (id) await api.put(`/tasks/${id}`, form);
      else await api.post('/tasks', form);
      nav('/tasks');
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving task');
      setSaving(false);
    }
  };

  const deleteTask = async () => {
    if (!window.confirm('Delete this task permanently? This cannot be undone.')) return;
    try {
      await api.delete(`/tasks/${id}`);
      nav('/tasks');
    } catch (err) { alert(err.response?.data?.message || 'Error deleting task'); }
  };

  const canDelete = id && task && (['owner','hr'].includes(user.role) || task.assigned_by === user.id);

  if (loading) return <Spinner />;

  return (
    <div className="fade-in" style={{maxWidth:700, margin:'0 auto', paddingBottom:60}}>
      {/* Header */}
      <div style={{marginBottom:28, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12}}>
        <div>
          <button onClick={()=>nav('/tasks')} style={{background:'none',border:'none',color:C.muted,fontSize:13,cursor:'pointer',padding:0,marginBottom:8,display:'flex',alignItems:'center',gap:4}}>
            ← Back to Tasks
          </button>
          <h1 style={{fontSize:24, fontWeight:800, margin:0}}>{id ? 'Edit Task' : 'New Task'} 📋</h1>
          <p style={{color:C.muted, fontSize:13, marginTop:4}}>
            {id ? 'Update task details below' : 'Fill in the details to assign a new task'}
          </p>
        </div>
        {canDelete && (
          <button onClick={deleteTask} style={{padding:'9px 16px',borderRadius:8,border:`1px solid ${C.red}44`,background:`${C.red}15`,color:C.red,fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
            🗑 Delete Task
          </button>
        )}
      </div>

      {/* Form Card */}
      <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:'28px 30px'}}>

        {/* Title — full width */}
        <Field label="Task Title *">
          <input
            value={form.title}
            onChange={e=>setForm({...form,title:e.target.value})}
            placeholder="e.g. Design homepage mockup, Fix login bug..."
            autoFocus
          />
        </Field>

        {/* Description — full width */}
        <Field label="Description">
          <textarea
            value={form.description}
            onChange={e=>setForm({...form,description:e.target.value})}
            rows={4}
            placeholder="Describe what needs to be done, acceptance criteria, links, notes..."
          />
        </Field>

        {/* Row 1: Project + Assign To */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:0}}>
          <Field label="Project (optional)">
            <select value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})}>
              <option value="">No project</option>
              {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Assign To">
            <select value={form.assigned_to} onChange={e=>setForm({...form,assigned_to:e.target.value})}>
              <option value="">Select team member</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
            </select>
          </Field>
        </div>

        {/* Row 2: Priority + Estimated Hours */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:0}}>
          <Field label="Priority">
            <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🔴 High</option>
            </select>
          </Field>
          <Field label="Estimated Hours">
            <input type="number" value={form.estimated_hours} onChange={e=>setForm({...form,estimated_hours:e.target.value})} placeholder="e.g. 4" step="0.5" min="0" />
          </Field>
        </div>

        {/* Row 3: Due Date + Due Time */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:0}}>
          <Field label="Due Date">
            <input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} />
          </Field>
          <Field label="Due Time">
            <input type="time" value={form.due_time} onChange={e=>setForm({...form,due_time:e.target.value})} />
          </Field>
        </div>

        {/* Action Buttons */}
        <div style={{display:'flex', gap:12, marginTop:24, paddingTop:20, borderTop:`1px solid ${C.border}`}}>
          <Btn onClick={submit} style={{flex:1, padding:'12px'}} disabled={saving}>
            {saving ? 'Saving...' : id ? '💾 Update Task' : '✅ Create Task'}
          </Btn>
          <Btn onClick={()=>nav('/tasks')} color={C.muted} outline style={{flex:1, padding:'12px'}}>
            Cancel
          </Btn>
        </div>
      </div>
    </div>
  );
}
