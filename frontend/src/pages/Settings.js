import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';
import { Btn, Field, Spinner, Badge, Modal } from '../components/UI';

const tabs = ['Company','SMTP / Email','Invoice Defaults','Users','Security','Announcements'];

export default function Settings() {
  const { user } = useAuth();
  const [tab,      setTab]     = useState('Company');
  const [settings, setSettings]= useState({});
  const [users,    setUsers]   = useState([]);
  const [loading,  setLoading] = useState(true);
  const [saving,   setSaving]  = useState(false);
  const [saved,    setSaved]   = useState(false);
  const [pwForm,   setPwForm]  = useState({current_password:'',new_password:'',confirm:''});
  const [pwError,  setPwError] = useState('');
  const [announce, setAnnounce]= useState({title:'',body:'',target_role:'all'});
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/settings'),
      user.role === 'owner' ? api.get('/settings/users') : Promise.resolve({data:[]}),
      api.get('/notifications/announcements'),
    ]).then(([s, u, a]) => {
      setSettings(s.data || {}); setUsers(u.data || []); setAnnouncements(a.data || []);
      setLoading(false);
    });
  }, []);

  const [saveError, setSaveError] = useState('');

  const save = async () => {
    setSaving(true); setSaved(false); setSaveError('');
    try {
      await api.put('/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save. Please try again.');
    } finally { setSaving(false); }
  };

  const changePassword = async () => {
    setPwError('');
    if (!pwForm.current_password) { setPwError('Current password is required'); return; }
    if (pwForm.new_password !== pwForm.confirm) { setPwError('New passwords do not match'); return; }
    if (pwForm.new_password.length < 6) { setPwError('New password must be at least 6 characters'); return; }
    try {
      await api.put('/settings/change-password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password
      });
      setPwForm({current_password:'',new_password:'',confirm:''});
      // Must force re-login — old JWT is still valid but user needs to authenticate with new password
      alert('Password changed successfully! Please log in again with your new password.');
      localStorage.removeItem('awelion_token');
      window.location.href = '/login';
    } catch (err) { setPwError(err.response?.data?.message || 'Error changing password'); }
  };

  const sendAnnouncement = async () => {
    await api.post('/notifications/announce', announce);
    setAnnounce({title:'',body:'',target_role:'all'});
    alert('Announcement sent!');
  };

  const updateRole = async (id, role) => {
    await api.put(`/settings/users/${id}/role`, { role });
    const { data } = await api.get('/settings/users');
    setUsers(data);
  };

  if (loading) return <Spinner />;

  const F = ({ label, k, type='text', placeholder='' }) => (
    <Field label={label}>
      <input type={type} value={settings[k]||''} onChange={e=>setSettings({...settings,[k]:e.target.value})} placeholder={placeholder} />
    </Field>
  );

  return (
    <div className="fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800 }}>Settings ⚙️</h1>
          <div style={{ color:C.muted, fontSize:13, marginTop:2 }}>Company configuration & preferences</div>
        </div>
        {['Company','SMTP / Email','Invoice Defaults'].includes(tab) && (
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
            <Btn onClick={save} color={saved?C.green:C.accent} small>{saving?'Saving...':saved?'✓ Saved':'Save Changes'}</Btn>
            {saveError && <div style={{fontSize:11,color:C.red}}>{saveError}</div>}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:C.card, padding:'5px 6px', borderRadius:12, border:`1px solid ${C.border}`, marginBottom:22, overflowX:'auto' }}>
        {(user.role==='owner'?tabs:['Security','Announcements']).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'7px 14px', borderRadius:8, border:'none', background:tab===t?C.accent:'transparent', color:tab===t?'#fff':C.muted, fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>{t}</button>
        ))}
      </div>

      {/* Company */}
      {tab==='Company' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <F label="Company Name" k="company_name" />
          <F label="GSTIN" k="gstin" placeholder="22AAAAA0000A1Z5" />
          <F label="PAN" k="pan" placeholder="AAAAA0000A" />
          <F label="Phone" k="phone" />
          <F label="Email" k="email" type="email" />
          <F label="State" k="state" />
          <F label="State Code" k="state_code" placeholder="24 for Gujarat" />
          <F label="Pincode" k="pincode" />
          <div style={{ gridColumn:'1/-1' }}><Field label="Address"><textarea value={settings.address||''} onChange={e=>setSettings({...settings,address:e.target.value})} rows={2} /></Field></div>
          <div style={{ gridColumn:'1/-1', fontSize:14, fontWeight:700, color:C.muted, paddingTop:8 }}>Bank Details</div>
          <F label="Bank Name" k="bank_name" />
          <F label="Account Number" k="bank_account" />
          <F label="IFSC Code" k="bank_ifsc" />
          <F label="Branch" k="bank_branch" />
        </div>
      )}

      {/* SMTP */}
      {tab==='SMTP / Email' && (
        <div>
          <div style={{ background:`${C.accent}15`, border:`1px solid ${C.accent}33`, borderRadius:12, padding:'12px 16px', marginBottom:16, fontSize:13 }}>
            💡 Configure SMTP to send invoices and notifications via email. Use Gmail App Password or any SMTP provider.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <F label="SMTP Host" k="smtp_host" placeholder="smtp.gmail.com" />
            <F label="SMTP Port" k="smtp_port" placeholder="587" />
            <F label="SMTP Username" k="smtp_user" placeholder="your@gmail.com" />
            <F label="SMTP Password" k="smtp_pass" type="password" placeholder="App password" />
            <div style={{ gridColumn:'1/-1' }}><F label="From Email" k="smtp_from" placeholder="noreply@awelion.com" /></div>
          </div>
        </div>
      )}

      {/* Invoice Defaults */}
      {tab==='Invoice Defaults' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <Field label="Default Invoice Terms">
            <textarea value={settings.invoice_terms||''} onChange={e=>setSettings({...settings,invoice_terms:e.target.value})} rows={3} placeholder="Payment due within 30 days..." />
          </Field>
          <Field label="Default Invoice Notes">
            <textarea value={settings.invoice_notes||''} onChange={e=>setSettings({...settings,invoice_notes:e.target.value})} rows={3} placeholder="Thank you for your business!" />
          </Field>
          <Field label="Email Signature">
            <textarea value={settings.signature||''} onChange={e=>setSettings({...settings,signature:e.target.value})} rows={4} placeholder="Regards,&#10;Team Awelion" />
          </Field>
        </div>
      )}

      {/* Users */}
      {tab==='Users' && user.role==='owner' && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 1fr 1fr', padding:'12px 20px', borderBottom:`1px solid ${C.border}`, fontSize:11, color:C.muted, fontWeight:700, textTransform:'uppercase' }}>
            <span>User</span><span>Email</span><span>Role</span><span>Status</span>
          </div>
          {users.map((u,i)=>(
            <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 1fr 1fr', padding:'13px 20px', borderBottom:`1px solid ${C.border}22`, alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:30, height:30, borderRadius:'50%', background:`linear-gradient(135deg,${C.accent},${C.green})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff' }}>
                  {u.avatar||u.name?.slice(0,2)}
                </div>
                <div style={{ fontWeight:600, fontSize:13 }}>{u.name}</div>
              </div>
              <div style={{ fontSize:12, color:C.muted }}>{u.email}</div>
              <select value={u.role} onChange={e=>updateRole(u.id,e.target.value)} style={{ padding:'4px 8px', borderRadius:6, fontSize:12, width:'auto' }}>
                {['owner','hr','team','client'].map(r=><option key={r}>{r}</option>)}
              </select>
              <Badge color={u.emp_status==='resigned'?C.red:C.green}>{u.emp_status||'active'}</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Security */}
      {tab==='Security' && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:'24px' }}>
          <div style={{ fontSize:16, fontWeight:800, marginBottom:18 }}>Change Password</div>
          {pwError && <div style={{ background:`${C.red}15`, border:`1px solid ${C.red}33`, color:C.red, borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:14 }}>{pwError}</div>}
          <div style={{ display:'flex', flexDirection:'column', gap:12, maxWidth:400 }}>
            <Field label="Current Password">
              <input type="password" value={pwForm.current_password} onChange={e=>setPwForm({...pwForm,current_password:e.target.value})} />
            </Field>
            <Field label="New Password">
              <input type="password" value={pwForm.new_password} onChange={e=>setPwForm({...pwForm,new_password:e.target.value})} />
            </Field>
            <Field label="Confirm Password">
              <input type="password" value={pwForm.confirm} onChange={e=>setPwForm({...pwForm,confirm:e.target.value})} />
            </Field>
            <Btn onClick={changePassword} color={C.green}>Change Password</Btn>
          </div>
        </div>
      )}

      {/* Announcements */}
      {tab==='Announcements' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:'20px 22px' }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Send Announcement</div>
            <Field label="Title"><input value={announce.title} onChange={e=>setAnnounce({...announce,title:e.target.value})} placeholder="Announcement title" /></Field>
            <Field label="Message"><textarea value={announce.body} onChange={e=>setAnnounce({...announce,body:e.target.value})} rows={4} placeholder="Your announcement..." /></Field>
            <Field label="Send To">
              <select value={announce.target_role} onChange={e=>setAnnounce({...announce,target_role:e.target.value})}>
                {['all','team','hr','client'].map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Btn onClick={sendAnnouncement} style={{ width:'100%' }}>📢 Send Announcement</Btn>
          </div>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`, fontSize:15, fontWeight:700 }}>Past Announcements</div>
            {announcements.map((a,i)=>(
              <div key={i} style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}22` }}>
                <div style={{ fontWeight:600, fontSize:13 }}>{a.title}</div>
                <div style={{ color:C.muted, fontSize:12, marginTop:3 }}>{a.body?.slice(0,80)}...</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:6, display:'flex', gap:8 }}>
                  <Badge color={C.accent}>{a.target_role}</Badge>
                  <span>{new Date(a.created_at).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}