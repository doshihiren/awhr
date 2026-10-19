import { useEffect, useState } from 'react';
import api from '../api';
import { C, stageColors } from '../theme';
import { Badge, Btn, Modal, Field, Spinner } from '../components/UI';

const STAGES = ['New Lead','Contacted','Demo','Proposal','Negotiation','Won','Lost'];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name:'', company:'', email:'', phone:'', value:'', stage:'New Lead', notes:'' });

  const load = () => api.get('/leads').then(r => { setLeads(r.data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (editing) await api.put(`/leads/${editing.id}`, form);
    else await api.post('/leads', form);
    setShowModal(false); setEditing(null);
    setForm({ name:'', company:'', email:'', phone:'', value:'', stage:'New Lead', notes:'' });
    load();
  };

  const moveStage = async (lead, direction) => {
    const idx = STAGES.indexOf(lead.stage);
    const newStage = STAGES[idx + direction];
    if (!newStage) return;
    await api.put(`/leads/${lead.id}`, { ...lead, stage: newStage });
    load();
  };

  const openEdit = (lead) => {
    setEditing(lead);
    setForm({ name:lead.name, company:lead.company, email:lead.email||'', phone:lead.phone||'',
      value:lead.value, stage:lead.stage, notes:lead.notes||'' });
    setShowModal(true);
  };

  if (loading) return <Spinner />;

  return (
    <div className="fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, letterSpacing:'-0.5px' }}>Lead Pipeline 🎯</h1>
          <div style={{ color:C.muted, fontSize:13, marginTop:3 }}>{leads.length} leads · ₹{(leads.reduce((s,l)=>s+Number(l.value),0)/100000).toFixed(1)}L total</div>
        </div>
        <Btn onClick={() => { setEditing(null); setShowModal(true); }}>+ New Lead</Btn>
      </div>

      {/* Stage summary bar */}
      <div style={{ display:'flex', gap:8, marginBottom:24, overflowX:'auto', paddingBottom:4 }}>
        {STAGES.map(stage => {
          const count = leads.filter(l=>l.stage===stage).length;
          const val = leads.filter(l=>l.stage===stage).reduce((s,l)=>s+Number(l.value),0);
          return (
            <div key={stage} style={{ flex:1, minWidth:110, background:C.card, border:`1px solid ${stageColors[stage]}33`,
              borderRadius:12, padding:'12px 14px', borderTop:`3px solid ${stageColors[stage]}` }}>
              <div style={{ fontSize:11, color:stageColors[stage], fontWeight:700, marginBottom:4 }}>{stage}</div>
              <div style={{ fontSize:20, fontWeight:800 }}>{count}</div>
              {val>0 && <div style={{ fontSize:11, color:C.muted }}>₹{(val/1000).toFixed(0)}K</div>}
            </div>
          );
        })}
      </div>

      {/* Leads table */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 1fr 1fr 1fr 120px',
          padding:'12px 20px', borderBottom:`1px solid ${C.border}`, fontSize:11, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px' }}>
          <span>Lead</span><span>Company</span><span>Value</span><span>Stage</span><span>Assigned</span><span>Actions</span>
        </div>
        {leads.map((l,i) => (
          <div key={l.id} style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 1fr 1fr 1fr 120px',
            padding:'14px 20px', borderBottom:`1px solid ${C.border}22`,
            alignItems:'center', transition:'background 0.15s' }}>
            <div>
              <div style={{ fontWeight:600, fontSize:13 }}>{l.name}</div>
              <div style={{ fontSize:11, color:C.muted }}>{l.email}</div>
            </div>
            <div style={{ fontSize:13 }}>{l.company}</div>
            <div style={{ fontWeight:700, fontSize:13 }}>₹{Number(l.value).toLocaleString()}</div>
            <Badge color={stageColors[l.stage]}>{l.stage}</Badge>
            <div style={{ fontSize:12, color:C.muted }}>{l.assigned_name}</div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => moveStage(l,-1)} title="Move back"
                style={{ padding:'4px 8px', borderRadius:6, border:`1px solid ${C.border}`, background:'none', color:C.muted, cursor:'pointer', fontSize:12 }}>←</button>
              <button onClick={() => openEdit(l)}
                style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${C.accent}44`, background:`${C.accent}15`, color:C.accent, cursor:'pointer', fontSize:12, fontWeight:600 }}>Edit</button>
              <button onClick={() => moveStage(l,1)} title="Move forward"
                style={{ padding:'4px 8px', borderRadius:6, border:`1px solid ${C.border}`, background:'none', color:C.muted, cursor:'pointer', fontSize:12 }}>→</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Lead' : 'New Lead'} onClose={() => { setShowModal(false); setEditing(null); }}>
          <Field label="Name"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Contact name" /></Field>
          <Field label="Company"><input value={form.company} onChange={e=>setForm({...form,company:e.target.value})} placeholder="Company" /></Field>
          <Field label="Email"><input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@company.com" /></Field>
          <Field label="Phone"><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Phone number" /></Field>
          <Field label="Deal Value (₹)"><input type="number" value={form.value} onChange={e=>setForm({...form,value:e.target.value})} placeholder="0" /></Field>
          <Field label="Stage">
            <select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})}>
              {STAGES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Notes"><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3} placeholder="Add notes..." /></Field>
          <div style={{ display:'flex', gap:10, marginTop:8 }}>
            <Btn onClick={save} style={{ flex:1 }}>{editing ? 'Update Lead' : 'Create Lead'}</Btn>
            <Btn onClick={() => { setShowModal(false); setEditing(null); }} color={C.muted} outline style={{ flex:1 }}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
