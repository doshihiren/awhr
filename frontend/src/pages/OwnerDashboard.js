import { useEffect, useState } from 'react';
import api from '../api';
import { C, stageColors, statusColors } from '../theme';
import { StatCard, TableCard, Row, Badge, Pill, ProgressBar, Avatar, Spinner } from '../components/UI';
import useIsMobile from '../hooks/useIsMobile';
import { useAuth } from '../context/AuthContext';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening'; };

export default function OwnerDashboard() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard/owner').then(r => setData(r.data));
  }, []);

  if (!data) return <Spinner />;
  const { stats, projects, leads, attendance, activity } = data;

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const onLeave = attendance.filter(a => a.status === 'leave').length;

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>{greeting()}, {user?.name?.split(' ')[0] || 'there'} 👋</h1>
        <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
          Here's what's happening across the business today
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:18, marginBottom:22 }}>
        <StatCard label="Monthly Payroll" value={`₹${((stats.monthly_payroll||0)/100000).toFixed(1)}L`} icon="💰" color={C.green} sub="Current month" />
        <StatCard label="Active Projects" value={stats.active_projects} icon="🚀" color={C.accent} sub="Across all clients" />
        <StatCard label="Open Leads" value={stats.open_leads} icon="🎯" color={C.orange} sub={`₹${((stats.pipeline_value||0)/100000).toFixed(1)}L pipeline`} />
        <StatCard label="Team Size" value={stats.total_employees} icon="👥" color={C.yellow} sub={`${onLeave} on leave today`} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap:18, marginBottom:22 }}>
        {/* Projects */}
        <TableCard title="Active Projects" badge={<Pill color={C.accent}>{projects.length} total</Pill>}>
          {projects.map((p, i) => (
            <Row key={i} i={i}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:13 }}>{p.name}</div>
                <div style={{ color:C.muted, fontSize:11, marginTop:2 }}>{p.client_name} · Due {new Date(p.due_date).toLocaleDateString('en-IN',{month:'short',day:'numeric'})}</div>
                <ProgressBar pct={p.progress} color={p.status==='at_risk'?C.orange:C.green} />
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontWeight:700, color:p.status==='at_risk'?C.orange:C.green, fontSize:13 }}>{p.progress}%</div>
                <Badge color={statusColors[p.status]}>{p.status?.replace('_',' ')}</Badge>
              </div>
            </Row>
          ))}
        </TableCard>

        {/* Leads */}
        <TableCard title="Lead Pipeline" badge={<Pill color={C.orange}>{leads.length} leads</Pill>}>
          {leads.map((l, i) => (
            <Row key={i} i={i}>
              <Avatar initials={l.name[0]} color={stageColors[l.stage]} size={32} />
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:13 }}>{l.name}</div>
                <div style={{ color:C.muted, fontSize:11 }}>{l.company}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontWeight:700, fontSize:13 }}>₹{(l.value/1000).toFixed(0)}K</div>
                <Badge color={stageColors[l.stage]}>{l.stage}</Badge>
              </div>
            </Row>
          ))}
        </TableCard>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap:18 }}>
        {/* Attendance */}
        <TableCard title="Today's Attendance" badge={<Pill color={C.green}>{presentCount} in</Pill>}>
          {attendance.slice(0,6).map((a, i) => (
            <Row key={i} i={i}>
              <Avatar initials={a.avatar || a.name?.slice(0,2)} size={30} />
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:13 }}>{a.name}</div>
                <div style={{ color:C.muted, fontSize:11 }}>{a.check_in || '--'}</div>
              </div>
              <Badge color={a.status==='present'?C.green:a.status==='leave'?C.yellow:C.red}>
                {a.status||'Absent'}
              </Badge>
            </Row>
          ))}
        </TableCard>

        {/* Revenue split */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:'20px 22px' }}>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Revenue Split</div>
          {[
            { label:'Projects', pct:62, val:'₹11.4L', color:C.accent },
            { label:'Retainers', pct:24, val:'₹4.4L', color:C.green },
            { label:'Closed Leads', pct:14, val:'₹2.6L', color:C.orange },
          ].map((r,i) => (
            <div key={i} style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:2 }}>
                <span style={{ color:C.muted }}>{r.label}</span>
                <span style={{ color:r.color, fontWeight:700 }}>{r.val}</span>
              </div>
              <ProgressBar pct={r.pct} color={r.color} />
            </div>
          ))}
        </div>

        {/* Activity */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:'20px 22px' }}>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Recent Activity</div>
          {activity.slice(0,6).map((a, i) => (
            <div key={i} style={{ display:'flex', gap:12, paddingBottom:14 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:C.accent,
                marginTop:4, flexShrink:0, boxShadow:`0 0 6px ${C.accent}` }} />
              <div>
                <div style={{ fontSize:12, fontWeight:500 }}>{a.text}</div>
                <div style={{ fontSize:11, color:C.muted }}>{new Date(a.time).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
