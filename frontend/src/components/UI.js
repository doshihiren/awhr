import { C, FONT_HEAD, onColor } from '../theme';

export const Card = ({ children, accent, style = {} }) => (
  <div style={{
    background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden',
    minWidth: 0, boxSizing: 'border-box', ...style
  }}>
    {accent && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:accent, opacity:.8 }} />}
    {children}
  </div>
);

export const StatCard = ({ label, value, icon, color, sub }) => (
  <Card style={{ minWidth: 0 }}>
    {icon && <div style={{ position:'absolute',top:16,right:16,width:34,height:34,borderRadius:10,
      background:`${color||C.accent}1f`,
      display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0 }}>{icon}</div>}
    <div style={{ fontSize:13,color:C.muted,marginBottom:6,paddingRight:40,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{label}</div>
    <div style={{ fontFamily:FONT_HEAD,fontSize:'clamp(20px,4.5vw,28px)',fontWeight:700,color:C.text,lineHeight:1.15,margin:'4px 0',wordBreak:'break-word',overflowWrap:'break-word' }}>{value}</div>
    {sub && <div style={{ fontSize:13,color:color||C.muted,marginTop:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{sub}</div>}
  </Card>
);

export const Badge = ({ children, color }) => (
  <span style={{ padding:'4px 10px',borderRadius:20,fontSize:12,fontWeight:600,
    background:`${color||C.muted}26`,color:color||C.muted,whiteSpace:'nowrap',display:'inline-block' }}>
    {children}
  </span>
);

export const Pill = ({ children, color }) => (
  <span style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:20,
    background:`${color||C.accent}1a`,color:color||C.accent,fontSize:12,fontWeight:600 }}>
    {children}
  </span>
);

export const ProgressBar = ({ pct, color }) => (
  <div style={{ height:8,borderRadius:8,background:C.border,overflow:'hidden',marginTop:8 }}>
    <div style={{ height:'100%',width:`${Math.max(0,Math.min(100,pct||0))}%`,
      background: color ? color : `linear-gradient(90deg,${C.accent},${C.blue})`,
      borderRadius:8,transition:'width 0.5s ease' }} />
  </div>
);

const AV_GRADS = [
  ['#f472b6', '#f59e0b'], ['#2dd4bf', '#38bdf8'], ['#a78bfa', '#38bdf8'],
  ['#22c55e', '#2dd4bf'], ['#fb923c', '#f43f5e'], ['#38bdf8', '#818cf8'],
];
export const Avatar = ({ initials, color, size = 32 }) => {
  const s = String(initials || '?');
  const g = AV_GRADS[(s.charCodeAt(0) + (s.charCodeAt(1) || 0)) % AV_GRADS.length];
  const bg = color ? `linear-gradient(135deg,${color},${color}99)` : `linear-gradient(135deg,${g[0]},${g[1]})`;
  return (
    <div style={{ width:size,height:size,borderRadius:'50%',background:bg,
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:size*0.36,fontWeight:700,color:'#1b0b12',flexShrink:0 }}>
      {s}
    </div>
  );
};

export const TableCard = ({ title, badge, children }) => (
  <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:'hidden' }}>
    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',
      padding:'16px 20px',borderBottom:`1px solid ${C.border}` }}>
      <div style={{ fontFamily:FONT_HEAD,fontSize:15,fontWeight:600 }}>{title}</div>
      {badge}
    </div>
    {children}
  </div>
);

export const Row = ({ children, i = 0, style = {} }) => (
  <div style={{ display:'flex',alignItems:'center',padding:'12px 20px',
    borderBottom:`1px solid ${C.border}`,gap:12,...style }}>
    {children}
  </div>
);

export const Btn = ({ children, onClick, color = C.accent, outline, small, type, disabled, style = {} }) => {
  const filledBg = color === C.accent
    ? `linear-gradient(135deg,${C.accent},${C.accent2})`
    : color;
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
      padding: small ? '6px 12px' : '10px 18px',
      borderRadius: 10, border: outline ? `1px solid ${color === C.accent ? C.border : color+'66'}` : 'none',
      background: outline ? 'transparent' : filledBg,
      color: outline ? (color === C.accent ? C.text : color) : onColor(color),
      fontSize: small ? 13 : 14, fontWeight: 600,
      transition: 'filter .15s, transform .15s', ...style
    }}
    onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; }}
    onMouseLeave={e => { e.currentTarget.style.filter = ''; }}
    >{children}</button>
  );
};

export const Modal = ({ title, onClose, children, width = 520 }) => (
  <div onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:1000,
    display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
    <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,
      padding:24,width:'100%',maxWidth:width,maxHeight:'90vh',overflowY:'auto' }} className="fade-in">
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18 }}>
        <div style={{ fontFamily:FONT_HEAD,fontSize:17,fontWeight:600 }}>{title}</div>
        <button onClick={onClose} aria-label="Close" style={{ background:'none',border:`1px solid ${C.border}`,borderRadius:8,width:30,height:30,color:C.muted,fontSize:14 }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

export const Field = ({ label, children }) => (
  <div style={{ marginBottom:14 }}>
    <label style={{ display:'block',fontSize:13,color:C.muted,marginBottom:6 }}>{label}</label>
    {children}
  </div>
);

export const Spinner = () => (
  <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:200 }}>
    <div style={{ width:34,height:34,borderRadius:'50%',border:`3px solid ${C.border}`,
      borderTopColor:C.accent,animation:'spin 0.8s linear infinite' }} />
  </div>
);

export const SectionTitle = ({ children, action }) => (
  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:14 }}>
    <div style={{ fontFamily:FONT_HEAD,fontSize:15,fontWeight:600 }}>{children}</div>
    {action}
  </div>
);

// Lightweight toast used by new screens: showToast('Saved')
export function showToast(text, color = C.accent) {
  const el = document.createElement('div');
  el.textContent = text;
  Object.assign(el.style, {
    position:'fixed', bottom:'24px', right:'24px', zIndex:2000, background:color, color:onColor(color),
    padding:'12px 20px', borderRadius:'10px', fontWeight:'600', fontSize:'14px',
    transform:'translateY(100px)', opacity:'0', transition:'.3s', maxWidth:'90vw',
  });
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.transform = 'none'; el.style.opacity = '1'; });
  setTimeout(() => { el.style.transform = 'translateY(100px)'; el.style.opacity = '0'; }, 2400);
  setTimeout(() => el.remove(), 2800);
}
