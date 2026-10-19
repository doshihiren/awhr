import { useEffect, useState } from 'react';
import { useNavigate } from '../lib/router';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { C, priorityColors } from '../theme';
import { Btn, Spinner } from '../components/UI';

const STATUSES = ['todo','in_progress','review','done'];
const sColor = { todo:C.muted, in_progress:C.accent, review:C.yellow, done:C.green };
const sLabel = { todo:'To Do', in_progress:'In Progress', review:'👁 Review', done:'✅ Done' };
const sIcon  = { todo:'📝', in_progress:'⚙️', review:'👁', done:'✅' };

function StatusStepper({ current }) {
  const idx = STATUSES.indexOf(current);
  return (
    <div style={{display:'flex',alignItems:'center',marginBottom:18}}>
      {STATUSES.map((s,i)=>(
        <div key={s} style={{display:'flex',alignItems:'center',flex:i<STATUSES.length-1?1:'none'}}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
            <div style={{width:34,height:34,borderRadius:'50%',background:i<=idx?sColor[s]:C.border,color:i<=idx?'#fff':C.muted,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,transition:'all 0.2s',boxShadow:i===idx?`0 0 0 4px ${sColor[s]}33`:'none'}}>
              {i<idx?'✓':sIcon[s]}
            </div>
            <div style={{fontSize:10,color:i<=idx?sColor[s]:C.muted,fontWeight:i===idx?700:500,whiteSpace:'nowrap'}}>{sLabel[s]}</div>
          </div>
          {i<STATUSES.length-1 && <div style={{flex:1,height:2,background:i<idx?sColor[s]:C.border,margin:'0 4px',marginBottom:16,transition:'background 0.2s'}} />}
        </div>
      ))}
    </div>
  );
}

export default function Tasks() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [tasks,      setTasks]     = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [filter,     setFilter]    = useState('all');
  const [selected,   setSelected]  = useState(null);
  const [comments,   setComments]  = useState([]);
  const [newComment, setNewComment]= useState('');

  const load = async () => { const { data } = await api.get('/tasks'); setTasks(data); setLoading(false); };
  useEffect(()=>{ load(); },[]);

  const loadComments = async (tid) => { const { data } = await api.get(`/tasks/${tid}/comments`); setComments(data); };
  const openTask = async (task) => { setSelected(task); await loadComments(task.id); };

  const startTask  = async (t) => { await api.post(`/tasks/${t.id}/start`); load(); setSelected(s=>s?{...s,status:'in_progress'}:s); };
  const markDone   = async (t) => { await api.post(`/tasks/${t.id}/mark-done`,{completion_note:'Done'}); load(); setSelected(null); };
  const closeTask  = async (t) => { await api.post(`/tasks/${t.id}/close`,{close_note:'Approved'}); load(); setSelected(null); };
  const reopen     = async (t) => { await api.post(`/tasks/${t.id}/reopen`,{reason:'Needs revision'}); load(); setSelected(null); };
  const addComment = async ()  => { if(!newComment.trim())return; await api.post(`/tasks/${selected.id}/comments`,{comment:newComment}); setNewComment(''); await loadComments(selected.id); };
  const canClose   = (t) => t.assigned_by===user.id || ['owner','hr'].includes(user.role);
  const isAssignee = (t) => t.assigned_to===user.id;

  const filtered = filter==='all' ? tasks : tasks.filter(t=>t.status===filter);
  if (loading) return <Spinner />;

  return (
    <div className="fade-in">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800}}>Tasks 📋</h1>
          <div style={{color:C.muted,fontSize:13,marginTop:2}}>{tasks.length} total · {tasks.filter(t=>t.status==='done').length} done</div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <div style={{display:'flex',gap:4,background:C.card,padding:'4px',borderRadius:10,border:`1px solid ${C.border}`,flexWrap:'wrap'}}>
            {['all',...STATUSES].map(s=>(
              <button key={s} onClick={()=>setFilter(s)} style={{padding:'5px 10px',borderRadius:7,border:'none',background:filter===s?C.accent:'transparent',color:filter===s?'#fff':C.muted,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                {s==='all'?'All':sLabel[s]}
              </button>
            ))}
          </div>
          {['owner','hr','team'].includes(user.role) && <Btn onClick={()=>nav('/tasks/new')} small>+ Task</Btn>}
        </div>
      </div>

      {/* Kanban */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
        {STATUSES.map(status=>(
          <div key={status}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px',color:sColor[status]}}>{sLabel[status]}</div>
              <div style={{background:`${sColor[status]}22`,color:sColor[status],fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20}}>
                {tasks.filter(t=>t.status===status).length}
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {tasks.filter(t=>t.status===status).map(t=>(
                <div key={t.id} onClick={()=>openTask(t)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:'12px 14px',borderLeft:`3px solid ${priorityColors[t.priority]||C.muted}`,cursor:'pointer'}}>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:6}}>{t.title}</div>
                  {t.project_name&&<div style={{fontSize:10,color:C.muted,marginBottom:6}}>📁 {t.project_name}</div>}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:700,background:`${priorityColors[t.priority]||C.muted}22`,color:priorityColors[t.priority]||C.muted}}>{t.priority}</span>
                    {t.due_date&&<span style={{fontSize:10,color:C.muted}}>{new Date(t.due_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>}
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
                    {t.assigned_name&&<div style={{fontSize:10,color:C.muted}}>👤 {t.assigned_name}</div>}
                    {t.given_by_name&&<div style={{fontSize:10,color:C.muted}}>from {t.given_by_name}</div>}
                  </div>
                </div>
              ))}
              {tasks.filter(t=>t.status===status).length===0&&<div style={{padding:'16px',textAlign:'center',color:C.muted,fontSize:11,border:`1px dashed ${C.border}`,borderRadius:12}}>Empty</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Task Detail — full-screen overlay, no clipping */}
      {selected && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:1000,overflowY:'auto'}}>
          <div style={{minHeight:'100%',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'16px 12px 40px'}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:'24px 22px',width:'100%',maxWidth:620}} className="fade-in">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${C.border}`}}>
              <div style={{flex:1}}>
                <div style={{fontSize:16,fontWeight:800}}>{selected.title}</div>
                <div style={{display:'flex',gap:14,marginTop:6,flexWrap:'wrap',fontSize:11,color:C.muted}}>
                  {selected.assigned_name&&<span>👤 <strong style={{color:C.text}}>{selected.assigned_name}</strong></span>}
                  {selected.given_by_name&&<span>📤 By <strong style={{color:C.text}}>{selected.given_by_name}</strong></span>}
                </div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0,marginLeft:12}}>
                {['owner','hr'].includes(user.role) && (
                  <button onClick={()=>nav(`/tasks/edit/${selected.id}`)} style={{padding:'5px 10px',borderRadius:6,border:`1px solid ${C.accent}44`,background:`${C.accent}15`,color:C.accent,fontSize:11,fontWeight:700,cursor:'pointer'}}>✏️ Edit</button>
                )}
                <button onClick={()=>setSelected(null)} style={{background:`${C.red}22`,border:`1px solid ${C.red}44`,color:C.red,borderRadius:8,width:32,height:32,fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
              </div>
            </div>

            <StatusStepper current={selected.status} />

            {selected.description&&<div style={{color:C.muted,fontSize:13,marginBottom:14,lineHeight:1.6,background:C.surface,padding:'12px 14px',borderRadius:10}}>{selected.description}</div>}

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16,fontSize:12}}>
              {selected.project_name&&<div><span style={{color:C.muted}}>Project:</span> 📁 {selected.project_name}</div>}
              {selected.due_date&&<div><span style={{color:C.muted}}>Due:</span> {new Date(selected.due_date).toLocaleDateString('en-IN')}{selected.due_time?` ${selected.due_time.slice(0,5)}`:''}</div>}
              {selected.estimated_hours&&<div><span style={{color:C.muted}}>Estimated:</span> {selected.estimated_hours}h</div>}
              <div><span style={{color:C.muted}}>Priority:</span> <span style={{color:priorityColors[selected.priority],fontWeight:700,textTransform:'capitalize'}}>{selected.priority}</span></div>
            </div>

            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
              {selected.status==='todo'&&isAssignee(selected)&&<Btn onClick={()=>startTask(selected)} color={C.accent} small>⚙️ Start Working</Btn>}
              {selected.status==='in_progress'&&isAssignee(selected)&&<Btn onClick={()=>markDone(selected)} color={C.green} small>✓ Mark as Done</Btn>}
              {selected.status==='review'&&canClose(selected)&&<Btn onClick={()=>closeTask(selected)} color={C.green} small>✅ Approve & Close</Btn>}
              {selected.status==='review'&&canClose(selected)&&<Btn onClick={()=>reopen(selected)} color={C.orange} outline small>↩ Send Back</Btn>}
              {selected.status==='done'&&canClose(selected)&&<Btn onClick={()=>reopen(selected)} color={C.orange} outline small>↩ Reopen</Btn>}
              {selected.status==='review'&&!canClose(selected)&&<div style={{fontSize:12,color:C.yellow,fontWeight:600,padding:'8px 0'}}>⏳ Waiting for {selected.given_by_name||'assigner'} to review</div>}
            </div>

            <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14}}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>Activity & Comments</div>
              <div style={{maxHeight:160,overflowY:'auto',marginBottom:10,display:'flex',flexDirection:'column',gap:8}}>
                {comments.map((c,i)=>(
                  <div key={i} style={{background:C.surface,borderRadius:8,padding:'8px 12px'}}>
                    <div style={{fontSize:11,color:C.accent,fontWeight:700,marginBottom:3}}>{c.name}</div>
                    <div style={{fontSize:12}}>{c.comment}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:3}}>{new Date(c.created_at).toLocaleDateString('en-IN')}</div>
                  </div>
                ))}
                {comments.length===0&&<div style={{color:C.muted,fontSize:12,textAlign:'center',padding:'8px 0'}}>No comments yet</div>}
              </div>
              <div style={{display:'flex',gap:8}}>
                <input value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder="Add comment..." onKeyPress={e=>e.key==='Enter'&&addComment()} style={{flex:1}} />
                <Btn onClick={addComment} small>Send</Btn>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
