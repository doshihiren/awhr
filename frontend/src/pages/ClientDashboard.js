import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';
import { StatCard, Badge, ProgressBar, Spinner, Btn } from '../components/UI';
import useIsMobile from '../hooks/useIsMobile';

const statusColor = { active:C.green, at_risk:C.orange, completed:C.accent, on_hold:C.muted };
const invColor    = { paid:C.green, sent:C.accent, partial:C.orange, overdue:C.red, draft:C.muted };

export default function ClientDashboard() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('projects');
  const [message, setMessage] = useState('');
  const [selProject, setSelProject] = useState('');

  useEffect(() => {
    api.get('/client/dashboard').then(r => { setData(r.data); setLoading(false); });
  }, []);

  const sendMessage = async () => {
    if (!message.trim()) return;
    await api.post('/client/messages', { message, project_id: selProject || null });
    setMessage('');
    const { data: d } = await api.get('/client/dashboard');
    setData(d);
  };

  if (loading) return <Spinner />;
  const { projects = [], invoices = [], messages = [] } = data || {};

  const tabs = [
    { key: 'projects', label: '🚀 Projects' },
    { key: 'invoices', label: '🧾 Invoices' },
    { key: 'messages', label: `💬 Messages${data?.unread > 0 ? ` (${data.unread})` : ''}` },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Welcome, {user?.name?.split(' ')[0]} 👋</h1>
        <div style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>Client Portal — View your projects & invoices</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 22 }}>
        <StatCard label="Active Projects" value={projects.filter(p=>p.status==='active').length} icon="🚀" color={C.accent} />
        <StatCard label="Invoices" value={invoices.length} icon="🧾" color={C.green} />
        <StatCard label="Outstanding" value={`₹${(invoices.filter(i=>i.status!=='paid').reduce((s,i)=>s+parseFloat(i.balance_due||0),0)/1000).toFixed(0)}K`} icon="⏳" color={C.orange} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: C.card, padding: '5px 6px', borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, padding: '8px 14px', borderRadius: 8, border: 'none', background: tab === t.key ? C.accent : 'transparent', color: tab === t.key ? '#fff' : C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Projects Tab */}
      {tab === 'projects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {projects.map(p => (
            <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{p.name}</div>
                  {p.description && <div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{p.description}</div>}
                </div>
                <Badge color={statusColor[p.status]}>{p.status?.replace('_', ' ')}</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: C.muted }}>Progress</span>
                <span style={{ fontWeight: 700, color: p.progress > 60 ? C.green : C.orange }}>{p.progress}%</span>
              </div>
              <ProgressBar pct={p.progress} color={p.status === 'at_risk' ? C.orange : C.green} />
              <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12 }}>
                {p.due_date && <span style={{ color: C.muted }}>Due: <span style={{ color: C.text }}>{new Date(p.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></span>}
                {p.total_tasks > 0 && <span style={{ color: C.muted }}>Tasks: <span style={{ color: C.green }}>{p.done_tasks}/{p.total_tasks} done</span></span>}
              </div>
              {p.total_tasks > 0 && (
                <div style={{ marginTop: 8 }}>
                  <ProgressBar pct={(p.done_tasks / p.total_tasks) * 100} color={C.accent} />
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>Task completion</div>
                </div>
              )}
            </div>
          ))}
          {projects.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>No projects yet</div>}
        </div>
      )}

      {/* Invoices Tab */}
      {tab === 'invoices' && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 80px', padding: '12px 20px', borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Invoice #</span><span>Date</span><span>Amount</span><span>Balance</span><span>Status</span>
          </div>
          {invoices.map((inv, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 80px', padding: '14px 20px', borderBottom: `1px solid ${C.border}22`, alignItems: 'center' }}>
              <div style={{ fontWeight: 700, color: C.accent, fontSize: 13 }}>{inv.invoice_number}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{new Date(inv.issue_date).toLocaleDateString('en-IN')}</div>
              <div style={{ fontWeight: 700 }}>₹{Number(inv.total).toLocaleString()}</div>
              <div style={{ color: inv.balance_due > 0 ? C.orange : C.green, fontWeight: 600 }}>₹{Number(inv.balance_due || 0).toLocaleString()}</div>
              <Badge color={invColor[inv.status]}>{inv.status}</Badge>
            </div>
          ))}
          {invoices.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: C.muted }}>No invoices yet</div>}
        </div>
      )}

      {/* Messages Tab */}
      {tab === 'messages' && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, fontSize: 15, fontWeight: 700 }}>
            Messages with Awelion Team
          </div>
          <div style={{ padding: '16px 20px', maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && <div style={{ textAlign: 'center', color: C.muted, padding: '20px 0', fontSize: 13 }}>No messages yet. Start a conversation below.</div>}
            {[...messages].reverse().map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: m.is_from_client ? 'row-reverse' : 'row', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: m.is_from_client ? `linear-gradient(135deg,${C.accent},${C.green})` : `linear-gradient(135deg,${C.orange},${C.yellow})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {m.sender_name?.slice(0, 1)}
                </div>
                <div style={{ maxWidth: '70%' }}>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 3, textAlign: m.is_from_client ? 'right' : 'left' }}>{m.sender_name}</div>
                  <div style={{ background: m.is_from_client ? `${C.accent}22` : C.surface, border: `1px solid ${m.is_from_client ? C.accent + '44' : C.border}`, borderRadius: 12, padding: '10px 14px', fontSize: 13 }}>
                    {m.message}
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 3, textAlign: m.is_from_client ? 'right' : 'left' }}>
                    {new Date(m.created_at).toLocaleDateString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}` }}>
            <div style={{ marginBottom: 8 }}>
              <select value={selProject} onChange={e => setSelProject(e.target.value)} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, marginBottom: 8, width: '100%' }}>
                <option value="">General inquiry</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your message..." onKeyPress={e => e.key === 'Enter' && sendMessage()} style={{ flex: 1 }} />
              <Btn onClick={sendMessage} small>Send</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}