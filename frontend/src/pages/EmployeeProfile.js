import { useEffect, useState } from 'react';
import { useParams } from '../lib/router';
import api from '../api';
import { C } from '../theme';
import { Btn, Modal, Field, Spinner, Badge } from '../components/UI';

const tabs = ['Personal','Bank & Identity','Employment','Reimbursements'];

export default function EmployeeProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [reimbursements, setReimb] = useState([]);
  const [tab, setTab] = useState('Personal');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [showResign, setShowResign] = useState(false);
  const [resignForm, setResignForm] = useState({resignation_date:'',last_working_date:'',resignation_reason:''});

  const load = async () => {
    const [p, r] = await Promise.all([api.get(`/employees/${id}/profile`), api.get('/employees/reimbursements').catch(()=>({data:[]}))]);
    setProfile(p.data); setForm(p.data);
    setReimb(r.data.filter(x=>x.user_id===parseInt(id)));
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const save = async () => {
    await api.put(`/employees/${id}/details`, form);
    setEditing(false); load();
  };
  const resign = async () => {
    await api.post(`/employees/${id}/resign`, resignForm);
    setShowResign(false); load();
  };

  if (loading) return <Spinner />;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'20px 22px',marginBottom:18}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
          <div style={{display:'flex',gap:14,alignItems:'center'}}>
            <div style={{width:56,height:56,borderRadius:'50%',background:`linear-gradient(135deg,${C.accent},${C.green})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,color:'#fff'}}>
              {profile?.avatar||profile?.name?.slice(0,2)}
            </div>
            <div>
              <div style={{fontSize:20,fontWeight:800}}>{profile?.name}</div>
              <div style={{color:C.muted,fontSize:13}}>{profile?.designation} · {profile?.department}</div>
              <div style={{marginTop:6,display:'flex',gap:8,flexWrap:'wrap'}}>
                <Badge color={profile?.status==='active'?C.green:C.red}>{profile?.status||'active'}</Badge>
                {profile?.is_on_probation&&<Badge color={C.yellow}>On Probation</Badge>}
                <Badge color={C.accent}>{profile?.role}</Badge>
              </div>
            </div>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <Btn onClick={()=>setEditing(!editing)} color={C.accent} outline small>{editing?'Cancel':'Edit Profile'}</Btn>
            {editing&&<Btn onClick={save} color={C.green} small>Save</Btn>}
            {profile?.status!=='resigned'&&<Btn onClick={()=>setShowResign(true)} color={C.red} outline small>Mark Resigned</Btn>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:C.card,padding:'5px 6px',borderRadius:12,border:`1px solid ${C.border}`,marginBottom:18,overflowX:'auto'}}>
        {tabs.map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:tab===t?C.accent:'transparent',color:tab===t?'#fff':C.muted,fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
            {t}
          </button>
        ))}
      </div>

      {tab==='Personal' && (
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'20px 22px'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14}}>
            {[
              ['Date of Birth','date_of_birth','date'],['Gender','gender','select',['male','female','other']],
              ['Blood Group','blood_group','text'],['Personal Email','personal_email','email'],
              ['Phone','phone','text'],['Address','address','text'],
              ['City','city','text'],['State','state','text'],['Pincode','pincode','text'],
              ['Emergency Contact','emergency_contact_name','text'],['Emergency Phone','emergency_contact_phone','text'],
              ['Relation','emergency_contact_relation','text'],
            ].map(([label,key,type,opts])=>(
              <div key={key}>
                <div style={{fontSize:11,color:C.muted,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'0.5px'}}>{label}</div>
                {editing?(
                  type==='select'?
                  <select value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})}>
                    <option value="">Select</option>
                    {opts.map(o=><option key={o}>{o}</option>)}
                  </select>:
                  <input type={type} value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})} />
                ):(
                  <div style={{fontSize:13,fontWeight:500,color:profile?.[key]?C.text:C.muted}}>{profile?.[key]||'Not set'}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='Bank & Identity' && (
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'20px 22px'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14}}>
            {[
              ['Aadhar Number','aadhar_number'],['PAN Number','pan_number'],
              ['Bank Name','bank_name'],['Account Number','bank_account_number'],
              ['IFSC Code','bank_ifsc'],['Branch','bank_branch'],
            ].map(([label,key])=>(
              <div key={key}>
                <div style={{fontSize:11,color:C.muted,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'0.5px'}}>{label}</div>
                {editing?<input value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})} />:
                <div style={{fontSize:13,fontWeight:500,color:profile?.[key]?C.text:C.muted}}>{profile?.[key]||'Not set'}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='Employment' && (
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'20px 22px'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14}}>
            {[
              ['Joining Date','date_of_joining'],['Probation End','probation_end_date'],
              ['Basic Salary','basic_salary'],['HRA','hra'],['Other Allowance','other_allowance'],
              ['Leave Balance','leave_balance'],
            ].map(([label,key])=>(
              <div key={key}>
                <div style={{fontSize:11,color:C.muted,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'0.5px'}}>{label}</div>
                <div style={{fontSize:13,fontWeight:500}}>{profile?.[key]||'—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='Reimbursements' && (
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:'hidden'}}>
          {reimbursements.length===0&&<div style={{padding:24,textAlign:'center',color:C.muted,fontSize:13}}>No reimbursements yet</div>}
          {reimbursements.map((r,i)=>(
            <div key={i} style={{padding:'14px 18px',borderBottom:`1px solid ${C.border}22`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{r.title}</div>
                <div style={{fontSize:11,color:C.muted}}>{r.category} · {r.date}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:700,color:C.green}}>₹{Number(r.amount).toLocaleString()}</div>
                <Badge color={r.status==='approved'?C.green:r.status==='rejected'?C.red:C.yellow}>{r.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {showResign && (
        <Modal title="Mark as Resigned" onClose={()=>setShowResign(false)}>
          <Field label="Resignation Date"><input type="date" value={resignForm.resignation_date} onChange={e=>setResignForm({...resignForm,resignation_date:e.target.value})} /></Field>
          <Field label="Last Working Date"><input type="date" value={resignForm.last_working_date} onChange={e=>setResignForm({...resignForm,last_working_date:e.target.value})} /></Field>
          <Field label="Reason"><textarea value={resignForm.resignation_reason} onChange={e=>setResignForm({...resignForm,resignation_reason:e.target.value})} rows={3} /></Field>
          <Btn onClick={resign} color={C.red} style={{width:'100%'}}>Confirm Resignation</Btn>
        </Modal>
      )}
    </div>
  );
}