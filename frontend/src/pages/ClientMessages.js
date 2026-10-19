import { useEffect, useState } from 'react';
import api from '../api';
import { C } from '../theme';
import { Spinner, Btn } from '../components/UI';

export default function ClientMessages() {
  const [messages, setMessages] = useState([]);
  const [clients,  setClients]  = useState([]);
  const [selClient,setSelClient]= useState(null);
  const [reply,    setReply]    = useState('');
  const [loading,  setLoading]  = useState(true);

  const load = async () => {
    const [m, u] = await Promise.all([api.get('/client/messages/all'), api.get('/settings/users')]);
    setMessages(m.data);
    setClients(u.data.filter(u => u.role === 'client'));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const sendReply = async () => {
    if (!reply.trim() || !selClient) return;
    await api.post('/client/messages/reply', { client_id: selClient.id, message: reply });
    setReply(''); load();
  };

  const clientThreads = clients.map(c => ({
    ...c, messages: messages.filter(m => m.client_id === c.id)
  })).filter(c => c.messages.length > 0);

  const selThread = selClient ? messages.filter(m => m.client_id === selClient.id) : [];

  if (loading) return <Spinner />;

  return (
    <div className="fade-in">
      <h1 style={{ fontSize:22, fontWeight:800, marginBottom:6 }}>Client Messages 💬</h1>
      <div style={{ color:C.muted, fontSize:13, marginBottom:22 }}>Conversations with your clients</div>

      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:18, height:'70vh' }}>
        {/* Thread list */}
        <div style={{ display:'flex', flexDirection:'column', gap:8, overflowY:'auto' }}>
          {clients.map(c => {
            const thread = messages.filter(m => m.client_id === c.id);
            const last = thread[0];
            const unread = thread.filter(m => !m.is_from_client && !m.is_read).length;
            return (
              <div key={c.id} onClick={() => setSelClient(c)} style={{
                background: selClient?.id === c.id ? `${C.accent}22` : C.card,
                border: `1px solid ${selClient?.id === c.id ? C.accent : C.border}`,
                borderRadius: 12, padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s'
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{c.name}</div>
                  {unread > 0 && <div style={{ background:C.red, color:'#fff', fontSize:10, fontWeight:800, borderRadius:10, padding:'1px 6px' }}>{unread}</div>}
                </div>
                {last && <div style={{ fontSize:11, color:C.muted, marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{last.message}</div>}
                {thread.length === 0 && <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>No messages</div>}
              </div>
            );
          })}
          {clientThreads.length === 0 && clients.length === 0 && (
            <div style={{ color:C.muted, fontSize:13, textAlign:'center', padding:20 }}>No client users yet</div>
          )}
          {/* Show all clients even without messages */}
          {clients.filter(c => !clientThreads.find(t => t.id === c.id)).map(c => (
            <div key={c.id} onClick={() => setSelClient(c)} style={{
              background: selClient?.id === c.id ? `${C.accent}22` : C.card,
              border: `1px solid ${selClient?.id === c.id ? C.accent : C.border}`,
              borderRadius: 12, padding: '12px 14px', cursor: 'pointer'
            }}>
              <div style={{ fontWeight:700, fontSize:13 }}>{c.name}</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>No messages yet</div>
            </div>
          ))}
        </div>

        {/* Chat area */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {!selClient ? (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:C.muted, fontSize:14 }}>
              Select a client to view messages
            </div>
          ) : (
            <>
              <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}`, fontWeight:700, fontSize:15 }}>
                {selClient.name}
              </div>
              <div style={{ flex:1, padding:'16px 20px', overflowY:'auto', display:'flex', flexDirection:'column', gap:10 }}>
                {selThread.length === 0 && <div style={{ textAlign:'center', color:C.muted, fontSize:13, marginTop:40 }}>No messages yet. Send a message to start.</div>}
                {[...selThread].reverse().map((m, i) => (
                  <div key={i} style={{ display:'flex', flexDirection: m.is_from_client ? 'row' : 'row-reverse', gap:10 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background: m.is_from_client ? `linear-gradient(135deg,${C.orange},${C.yellow})` : `linear-gradient(135deg,${C.accent},${C.green})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff', flexShrink:0 }}>
                      {m.sender_name?.slice(0,1)}
                    </div>
                    <div style={{ maxWidth:'70%' }}>
                      <div style={{ fontSize:10, color:C.muted, marginBottom:3, textAlign: m.is_from_client ? 'left' : 'right' }}>{m.sender_name}</div>
                      <div style={{ background: m.is_from_client ? C.surface : `${C.accent}22`, border:`1px solid ${m.is_from_client ? C.border : C.accent+'44'}`, borderRadius:12, padding:'10px 14px', fontSize:13 }}>{m.message}</div>
                      <div style={{ fontSize:10, color:C.muted, marginTop:3, textAlign: m.is_from_client ? 'left' : 'right' }}>
                        {new Date(m.created_at).toLocaleDateString('en-IN', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding:'14px 20px', borderTop:`1px solid ${C.border}`, display:'flex', gap:8 }}>
                <input value={reply} onChange={e=>setReply(e.target.value)} placeholder={`Reply to ${selClient.name}...`} onKeyPress={e=>e.key==='Enter'&&sendReply()} style={{ flex:1 }} />
                <Btn onClick={sendReply} small>Send</Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}