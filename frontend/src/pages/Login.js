import { useState } from 'react';
import { useNavigate } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';
import { Btn } from '../components/UI';
import { Logo } from '../components/Sidebar';

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [show,     setShow]     = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email.trim() || !password) { setError('Email and password are required'); return; }
    setLoading(true); setError('');
    try {
      await login(email.trim().toLowerCase(), password);
      nav('/');
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:16,
      background:`radial-gradient(circle at 20% 20%, #12403c 0, transparent 40%), radial-gradient(circle at 80% 80%, #0c3350 0, transparent 40%), ${C.bg}` }}>
      <div className="fade-in" style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20,
        padding:'40px 32px', width:'min(440px, 100%)' }}>
        <div style={{ textAlign:'center', marginBottom:26 }}>
          <div style={{ display:'flex', justifyContent:'center' }}><Logo size={54} /></div>
          <h1 style={{ fontSize:28, fontWeight:700, margin:'12px 0 6px' }}>Awelion</h1>
          <p style={{ color:C.muted, fontSize:14 }}>HR · Attendance · Payroll · Accounts — all in one place</p>
        </div>

        {error && (
          <div role="alert" style={{ background:`${C.red}1f`, color:C.red, borderRadius:10, padding:'10px 14px', fontSize:13, marginBottom:16 }}>{error}</div>
        )}

        <form onSubmit={handleLogin} style={{ display:'grid', gap:14 }}>
          <label style={{ fontSize:13, color:C.muted, display:'grid', gap:6 }}>
            Email address
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com" required autoComplete="email" />
          </label>
          <label style={{ fontSize:13, color:C.muted, display:'grid', gap:6 }}>
            Password
            <div style={{ position:'relative' }}>
              <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required autoComplete="current-password" style={{ paddingRight:64 }} />
              <button type="button" onClick={() => setShow(!show)}
                style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', background:'none', border:'none',
                  color:C.muted, fontSize:12, padding:'6px 8px' }}>{show ? 'Hide' : 'Show'}</button>
            </div>
          </label>
          <Btn type="submit" disabled={loading} style={{ width:'100%', padding:'13px', marginTop:6, fontSize:15 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Btn>
        </form>

        <div style={{ textAlign:'center', fontSize:12, color:C.muted, marginTop:20, lineHeight:1.7 }}>
          Forgot your password? Ask your administrator.<br />
          <a href="/kiosk" style={{ color:C.accent, textDecoration:'none' }}>Open face attendance kiosk →</a>
        </div>
      </div>
    </div>
  );
}
