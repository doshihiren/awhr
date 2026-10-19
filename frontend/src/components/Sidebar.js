import { useState, useEffect } from 'react';
import { NavLink, useLocation } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import { C, FONT_HEAD } from '../theme';
import useIsMobile from '../hooks/useIsMobile';
import { Avatar } from './UI';

export const SIDEBAR_W = 250;
export const roleLabel = r => ({ owner: 'Owner', hr: 'HR', team: 'Team', client: 'Client' }[r] || r);

export const navItems = {
  owner: [
    { section: 'Overview' },
    { path:'/', icon:'🏠', label:'Dashboard' },
    { path:'/leads', icon:'🎯', label:'Leads' },
    { path:'/projects', icon:'🚀', label:'Projects' },
    { path:'/tasks', icon:'📋', label:'Tasks' },
    { section: 'People' },
    { path:'/hr', icon:'👥', label:'HR' },
    { path:'/attendance', icon:'🗓️', label:'Attendance' },
    { path:'/face-attendance', icon:'🙂', label:'Face Attendance' },
    { path:'/payroll', icon:'💳', label:'Payroll' },
    { path:'/salary-slips', icon:'💰', label:'Salary Slips' },
    { section: 'Finance' },
    { path:'/billing', icon:'🧾', label:'Billing' },
    { path:'/accounts', icon:'📊', label:'Accounts' },
    { path:'/ledger', icon:'📒', label:'Ledger' },
    { path:'/bank', icon:'🏦', label:'Bank' },
    { section: 'More' },
    { path:'/client-messages', icon:'💬', label:'Messages' },
    { path:'/settings', icon:'⚙️', label:'Settings' },
  ],
  hr: [
    { path:'/', icon:'🏠', label:'Dashboard' },
    { path:'/hr', icon:'👥', label:'HR' },
    { path:'/attendance', icon:'🗓️', label:'Attendance' },
    { path:'/face-attendance', icon:'🙂', label:'Face Attendance' },
    { path:'/payroll', icon:'💳', label:'Payroll' },
    { path:'/tasks', icon:'📋', label:'Tasks' },
    { path:'/projects', icon:'🚀', label:'Projects' },
    { path:'/settings', icon:'⚙️', label:'Settings' },
  ],
  team: [
    { path:'/', icon:'🏠', label:'Dashboard' },
    { path:'/my-attendance', icon:'⏱️', label:'My Attendance' },
    { path:'/tasks', icon:'📋', label:'My Tasks' },
    { path:'/projects', icon:'🚀', label:'Projects' },
    { path:'/settings', icon:'👤', label:'My Profile' },
  ],
  client: [
    { path:'/', icon:'🏠', label:'Dashboard' },
    { path:'/projects', icon:'🚀', label:'My Projects' },
    { path:'/settings', icon:'⚙️', label:'Settings' },
  ],
};

// Page title for the top bar, taken from the nav (falls back to sensible names).
export function titleFor(pathname, role) {
  const items = (navItems[role] || navItems.team).filter(i => i.path);
  const exact = items.find(i => i.path === pathname);
  if (exact) return exact.label;
  const extra = [
    ['/tasks/new', 'New Task'], ['/tasks/edit', 'Edit Task'],
    ['/projects/new', 'New Project'], ['/projects/edit', 'Edit Project'],
    ['/employees/', 'Employee Profile'],
  ].find(([p]) => pathname.startsWith(p));
  if (extra) return extra[1];
  const prefix = items.filter(i => i.path !== '/').find(i => pathname.startsWith(i.path));
  return prefix ? prefix.label : 'Awelion';
}

export const Logo = ({ size = 34 }) => (
  <div style={{ width:size, height:size, borderRadius:size*0.3, flexShrink:0,
    background:`linear-gradient(135deg,${C.accent},${C.blue})`,
    display:'grid', placeItems:'center', color:C.onAccent, fontWeight:700,
    fontFamily:FONT_HEAD, fontSize:size*0.45 }}>A</div>
);

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile(900);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  if (!user) return null;
  const items = navItems[user.role] || navItems.team;

  return (
    <>
      {isMobile && (
        <button
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen(!open)}
          style={{
            position:'fixed', top:12, left:12, zIndex:300,
            width:42, height:42, borderRadius:10,
            border:`1px solid ${C.border}`, background:C.surface,
            color:C.text, fontSize:18, display:'flex',
            alignItems:'center', justifyContent:'center',
          }}
        >{open ? '✕' : '☰'}</button>
      )}

      {isMobile && open && (
        <div onClick={() => setOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:200 }} />
      )}

      <aside style={{
        width:SIDEBAR_W, background:C.surface, borderRight:`1px solid ${C.border}`,
        height:'100vh', position:'fixed', left:0, top:0, zIndex:250,
        display:'flex', flexDirection:'column', padding:'22px 14px',
        transform: isMobile ? (open ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition:'transform 0.25s ease',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0 10px 20px', marginTop: isMobile ? 44 : 0 }}>
          <Logo />
          <div>
            <div style={{ fontFamily:FONT_HEAD, fontSize:19, fontWeight:700 }}>Awelion</div>
            <div style={{ fontSize:12, color:C.muted }}>{roleLabel(user.role)} panel</div>
          </div>
        </div>

        <nav style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:2 }}>
          {items.map((item, i) => item.section ? (
            <div key={'s'+i} style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'.08em',
              padding: i === 0 ? '0 12px 6px' : '14px 12px 6px' }}>{item.section}</div>
          ) : (
            <NavLink
              key={item.path + item.label}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => isActive ? '' : 'nav-link'}
              style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:12,
                padding:'10px 12px', borderRadius:10,
                textDecoration:'none', fontSize:14, fontWeight: isActive ? 600 : 500,
                background: isActive ? 'rgba(45,212,191,.12)' : 'transparent',
                color: isActive ? C.accent : C.muted,
                transition:'background .15s, color .15s',
              })}
            >
              <span style={{ fontSize:15, width:20, textAlign:'center', flexShrink:0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ paddingTop:12, borderTop:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10 }}>
          <Avatar initials={user.avatar || user.name?.slice(0,2).toUpperCase()} size={34} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.name}</div>
            <div style={{ fontSize:12, color:C.muted }}>{roleLabel(user.role)}</div>
          </div>
          <button onClick={logout} title="Log out"
            style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 10px', color:C.muted, fontSize:12, fontWeight:600 }}>Log out</button>
        </div>
      </aside>
    </>
  );
}
