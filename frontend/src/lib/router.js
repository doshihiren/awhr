// Minimal client-side router covering exactly what this app uses:
// BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate, useLocation, useParams.
// Replaces react-router-dom so the app has fewer dependencies.
import { createContext, useContext, useEffect, useState, useCallback, Children, isValidElement } from 'react';

const LocCtx = createContext({ pathname: '/', navigate: () => {} });
const ParamCtx = createContext({});

export function BrowserRouter({ children }) {
  const [pathname, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const navigate = useCallback((to, opts = {}) => {
    if (typeof to === 'number') { window.history.go(to); return; }
    if (to === window.location.pathname) return;
    window.history[opts.replace ? 'replaceState' : 'pushState']({}, '', to);
    setPath(window.location.pathname);
    window.scrollTo(0, 0);
  }, []);
  return <LocCtx.Provider value={{ pathname, navigate }}>{children}</LocCtx.Provider>;
}

// Match "/tasks/edit/:id" against "/tasks/edit/12" → { id: '12' }; "*" matches anything.
export function matchPath(pattern, pathname) {
  if (pattern === '*') return {};
  const p = pattern.replace(/\/+$/, '').split('/');
  const a = pathname.replace(/\/+$/, '').split('/');
  if (p.length !== a.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return null;
  }
  return params;
}

export function Routes({ children }) {
  const { pathname } = useContext(LocCtx);
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;
    const params = matchPath(child.props.path, pathname);
    if (params) return <ParamCtx.Provider value={params}>{child.props.element}</ParamCtx.Provider>;
  }
  return null;
}

export const Route = () => null;

export function Navigate({ to, replace = true }) {
  const { navigate } = useContext(LocCtx);
  useEffect(() => { navigate(to, { replace }); }, [to, replace, navigate]);
  return null;
}

export function NavLink({ to, end, style, className, children, onClick }) {
  const { pathname, navigate } = useContext(LocCtx);
  const isActive = end || to === '/' ? pathname === to : pathname === to || pathname.startsWith(to + '/');
  return (
    <a
      href={to}
      className={typeof className === 'function' ? className({ isActive }) : className}
      style={typeof style === 'function' ? style({ isActive }) : style}
      onClick={e => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault(); onClick?.(e); navigate(to);
      }}
    >{children}</a>
  );
}

export const useNavigate = () => useContext(LocCtx).navigate;
export const useLocation = () => ({ pathname: useContext(LocCtx).pathname });
export const useParams = () => useContext(ParamCtx);
