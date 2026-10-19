import { useEffect, useState } from 'react';
import { useNavigate } from '../lib/router';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { C, priorityColors } from '../theme';
import { StatCard, TableCard, Row, Badge, Pill, ProgressBar, Avatar, Spinner, Btn } from '../components/UI';
import TodayAttendance from '../components/TodayAttendance';
import useIsMobile from '../hooks/useIsMobile';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function TeamDashboard() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const nav = useNavigate();
  const [data,        setData]        = useState(null);
  const [todayRec,    setTodayRec]    = useState(null);
  const [dayStatus,   setDayStatus]   = useState('working');
  const [checkingIn,  setCheckingIn]  = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [notifications, setNotifs]   = useState([]);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear  = now.getFullYear();

  const loadAll = async () => {
    const [dash, tod, notif] = await Promise.all([
      api.get('/dashboard/team'),
      api.get('/attendance/today'),
      api.get('/notifications').catch(() => ({ data: [] })),
    ]);
    setData(dash.data);
    setTodayRec(tod.data.record);
    setDayStatus(tod.data.dayStatus);
    setNotifs(notif.data.slice(0, 5));
  };
  useEffect(() => { loadAll(); }, []);

  const checkIn = async () => {
    setCheckingIn(true);
    try {
      const { data: res } = await api.post('/attendance/checkin');
      setTodayRec(prev => ({ ...(prev||{}), check_in: res.time, status:'present' }));
      await loadAll();
    } catch (e) { alert(e.response?.data?.message || 'Check-in failed'); }
    setCheckingIn(false);
  };

  const checkOut = async () => {
    setCheckingOut(true);
    try {
      const { data: res } = await api.post('/attendance/checkout');
      setTodayRec(prev => ({ ...(prev||{}), check_out: res.time, status: res.status || 'present' }));
      alert(res.message);
      await loadAll();
    } catch (e) { alert(e.response?.data?.message || 'Check-out failed'); }
    setCheckingOut(false);
  };

  if (!data) return <Spinner />;
  const { tasks, projects, employee, attendance } = data;

  const done          = tasks.filter(t => t.status === 'done').length;
  const leaveBalance  = employee?.leave_balance ?? 0;
  const isHoliday     = dayStatus === 'holiday';
  const hasCheckedIn  = !!todayRec?.check_in;
  const hasCheckedOut = !!todayRec?.check_out;

  // Attendance dots — current month only, correct day mapping
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const todayDate   = now.getDate();
  const attendanceDots = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayAtt = attendance?.find(a => a.date?.startsWith(dateStr));
    if (dayAtt) {
      if (dayAtt.status === 'present')  return 'P';
      if (dayAtt.status === 'half_day' || dayAtt.status === 'half_day_first' || dayAtt.status === 'half_day_second') return 'H';
      if (dayAtt.status === 'leave')    return 'L';
      if (dayAtt.status === 'holiday')  return '🎉';
      return 'A';
    }
    if (day < todayDate) return 'A'; // past day, no record = absent
    return '';                        // today or future = blank
  });

  // Unread notifications count
  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div className="fade-in">
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:24, fontWeight:800, letterSpacing:'-0.5px' }}>
          My Workspace — {user?.name?.split(' ')[0]} 👋
        </h1>
        <div style={{ color:C.muted, fontSize:13, marginTop:4 }}>
          Your tasks, attendance and leave at a glance
        </div>
      </div>

      {/* Clickable KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14, marginBottom:20 }}>
        <div onClick={() => nav('/tasks')} style={{cursor:'pointer'}}>
          <StatCard label="My Tasks" value={tasks.length} icon="📋" color={C.accent} sub={`${tasks.filter(t=>t.status!=='done').length} pending`} />
        </div>
        <div onClick={() => nav('/tasks')} style={{cursor:'pointer'}}>
          <StatCard label="Tasks Done" value={done} icon="✅" color={C.green} sub={`${tasks.length ? Math.round(done/tasks.length*100) : 0}% complete`} />
        </div>
        <div onClick={() => nav('/my-attendance')} style={{cursor:'pointer'}}>
          <StatCard label="Leave Balance" value={leaveBalance} icon="🌴" color={C.yellow} sub="days remaining" />
        </div>
        <div onClick={() => nav('/projects')} style={{cursor:'pointer'}}>
          <StatCard label="Active Projects" value={projects.length} icon="🚀" color={C.orange} sub="Assigned to you" />
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap:18, marginBottom:18 }}>
        {/* Tasks */}
        <TableCard title="My Tasks" badge={<Pill color={C.accent}>{tasks.length} total</Pill>}>
          {tasks.map((t,i) => (
            <Row key={i} i={i} style={{ opacity: t.status==='done'?0.5:1, cursor:'pointer' }} onClick={() => nav('/tasks')}>
              <div style={{ width:18,height:18,borderRadius:4,border:`2px solid ${t.status==='done'?C.green:C.border}`,background:t.status==='done'?C.green:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'#fff',fontSize:10 }}>
                {t.status==='done'?'✓':''}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600,fontSize:13,textDecoration:t.status==='done'?'line-through':'none' }}>{t.title}</div>
                <div style={{ fontSize:11,color:C.muted }}>{t.project_name} · Due {t.due_date ? new Date(t.due_date).toLocaleDateString('en-IN',{month:'short',day:'numeric'}) : '—'}</div>
              </div>
              <Badge color={priorityColors[t.priority]}>{t.priority}</Badge>
            </Row>
          ))}
          {tasks.length === 0 && <div style={{ padding:20,color:C.muted,textAlign:'center',fontSize:13 }}>No tasks assigned 🎉</div>}
        </TableCard>

        {/* Check In / Lunch / Check Out — shown first on phones */}
        <div style={{ display:'flex',flexDirection:'column',gap:16,order:isMobile?-1:0 }}>
          <TodayAttendance onChange={loadAll} />

          {/* Leave Balance — clickable */}
          <div onClick={() => nav('/leave')} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20,cursor:'pointer' }}>
            <div style={{ fontSize:15,fontWeight:600,marginBottom:10 }}>My Leave Balance <span style={{ fontSize:12,color:C.accent,fontWeight:500 }}>→</span></div>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'baseline' }}>
              <span style={{ color:C.muted,fontSize:13 }}>Earned leave</span>
              <span style={{ fontSize:22,fontWeight:700,color:C.green }}>{leaveBalance} <span style={{ fontSize:13,color:C.muted,fontWeight:500 }}>days</span></span>
            </div>
            <ProgressBar pct={Math.min(100,(leaveBalance/18)*100)} color={C.green} />
            <div style={{ fontSize:12,color:C.muted,marginTop:8 }}>+1.5 days added on the 1st of every month</div>
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap:18 }}>
        {/* My Projects — clickable */}
        <div onClick={() => nav('/projects')} style={{ cursor:'pointer' }}>
          <TableCard title="My Projects ↗">
            {projects.map((p,i) => (
              <div key={i} style={{ padding:'12px 18px',borderBottom:`1px solid ${C.border}22` }}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                  <div style={{ fontWeight:600,fontSize:13 }}>{p.name}</div>
                  <span style={{ color:p.progress>60?C.green:C.orange,fontWeight:700,fontSize:13 }}>{p.progress}%</span>
                </div>
                <div style={{ color:C.muted,fontSize:11,marginBottom:6 }}>Due {p.due_date ? new Date(p.due_date).toLocaleDateString('en-IN',{month:'short',day:'numeric'}) : '—'}</div>
                <ProgressBar pct={p.progress} color={p.status==='at_risk'?C.orange:C.green} />
              </div>
            ))}
            {projects.length === 0 && <div style={{ padding:20,color:C.muted,textAlign:'center',fontSize:13 }}>No projects assigned</div>}
          </TableCard>
        </div>

        {/* Attendance Calendar — current month, clickable */}
        <div onClick={() => nav('/my-attendance')} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'20px 22px',cursor:'pointer' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
            <div style={{ fontSize:15,fontWeight:700 }}>{MONTHS[currentMonth-1]} {currentYear}</div>
            <span style={{ fontSize:12,color:C.accent }}>View all →</span>
          </div>
          <div style={{ display:'flex',flexWrap:'wrap',gap:4 }}>
            {attendanceDots.map((s,i) => {
              const c = s==='P'?C.green:s==='H'?C.orange:s==='L'?C.yellow:s==='A'?C.red:s==='🎉'?C.accent:C.border;
              return (
                <div key={i} style={{ width:24,height:24,borderRadius:4,background:`${c}22`,border:`1.5px solid ${c}55`,color:c,fontSize:8,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center' }}>
                  {s==='P'?'✓':s==='A'?'✗':s==='H'?'½':s==='L'?'L':s==='🎉'?'★':String(i+1)}
                </div>
              );
            })}
          </div>
          <div style={{ display:'flex',gap:10,marginTop:10,flexWrap:'wrap' }}>
            {[['✓',C.green,'Present'],['½',C.orange,'Half Day'],['L',C.yellow,'Leave'],['✗',C.red,'Absent']].map(([k,c,v])=>(
              <span key={k} style={{ fontSize:10,color:c,fontWeight:600 }}>{k}={v}</span>
            ))}
          </div>
        </div>

        {/* Notifications — clickable */}
        <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'20px 22px' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
            <div style={{ fontSize:15,fontWeight:700 }}>Notifications {unread>0 && <span style={{ background:C.red,color:'#fff',borderRadius:20,padding:'1px 7px',fontSize:11,fontWeight:700,marginLeft:6 }}>{unread}</span>}</div>
          </div>
          {notifications.length === 0 && (
            <div style={{ color:C.muted,fontSize:13,textAlign:'center',padding:'12px 0' }}>No notifications yet</div>
          )}
          {notifications.map((n,i) => (
            <div key={i} style={{ display:'flex',gap:10,marginBottom:12,opacity:n.is_read?0.6:1 }}>
              <span style={{ fontSize:18,flexShrink:0 }}>{n.type==='task'?'📋':n.type==='leave'?'🌴':n.type==='announcement'?'📢':'🔔'}</span>
              <div>
                <div style={{ fontSize:12,fontWeight:n.is_read?500:700 }}>{n.title}</div>
                <div style={{ fontSize:11,color:C.muted }}>{n.message}</div>
                <div style={{ fontSize:10,color:C.muted,marginTop:2 }}>{new Date(n.created_at).toLocaleDateString('en-IN',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
