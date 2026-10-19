import { BrowserRouter, Routes, Route, Navigate } from './lib/router';
import { AuthProvider, useAuth } from './context/AuthContext';
import { globalCSS, C } from './theme';
import Sidebar, { SIDEBAR_W, Logo, roleLabel } from './components/Sidebar';
import { Avatar } from './components/UI';
import useIsMobile from './hooks/useIsMobile';
import FaceAttendance from './pages/FaceAttendance';
import Kiosk from './pages/Kiosk';
import Login from './pages/Login';
import OwnerDashboard from './pages/OwnerDashboard';
import HRDashboard from './pages/HRDashboard';
import TeamDashboard from './pages/TeamDashboard';
import ClientDashboard from './pages/ClientDashboard';
import Leads from './pages/Leads';
import Tasks from './pages/Tasks';
import TaskForm from './pages/TaskForm';
import Attendance from './pages/Attendance';
import MyAttendance from './pages/MyAttendance';
import EmployeeProfile from './pages/EmployeeProfile';
import Billing from './pages/Billing';
import AccountsDashboard from './pages/AccountsDashboard';
import Ledger from './pages/Ledger';
import BankStatement from './pages/BankStatement';
import SalarySlips from './pages/SalarySlips';
import Settings from './pages/Settings';
import ClientMessages from './pages/ClientMessages';
import HR from './pages/HR';
import { Projects, Payroll } from './pages/Modules';
import ProjectForm from './pages/ProjectForm';

function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'owner')  return <OwnerDashboard />;
  if (user.role === 'hr')     return <HRDashboard />;
  if (user.role === 'client') return <ClientDashboard />;
  return <TeamDashboard />;
}

function TopBar() {
  const { user } = useAuth();
  const isMobile = useIsMobile(900);
  const today = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12,
      marginBottom: isMobile ? 16 : 22, paddingLeft: isMobile ? 54 : 0, minHeight:42 }}>
      <small style={{ color:C.muted, fontSize:13 }}>{today}</small>
      {!isMobile && (
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ textAlign:'right', lineHeight:1.3 }}>
            <b style={{ fontSize:14 }}>{user.name}</b><br />
            <small style={{ color:C.muted }}>{user.designation || roleLabel(user.role)}</small>
          </div>
          <Avatar initials={user.avatar || user.name?.slice(0,2).toUpperCase()} size={38} />
        </div>
      )}
    </div>
  );
}

function ProtectedLayout({ children, roles }) {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile(900);
  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:C.bg}}>
      <div style={{textAlign:'center'}}>
        <div style={{display:'flex',justifyContent:'center',marginBottom:14,animation:'pulse 1.2s infinite'}}><Logo size={48} /></div>
        <div style={{color:C.muted,fontSize:14}}>Loading Awelion…</div>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return (
    <div>
      <Sidebar />
      <main style={{
        marginLeft: isMobile ? 0 : SIDEBAR_W,
        padding: isMobile ? '12px 16px 40px' : '26px 32px',
        minHeight: '100vh',
        background: C.bg,
      }}>
        <TopBar />
        <div className="fade-in">{children}</div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <>
      <style>{globalCSS}</style>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login"              element={<Login />} />
            <Route path="/kiosk"              element={<Kiosk />} />
            <Route path="/face-attendance"    element={<ProtectedLayout roles={['owner','hr']}><FaceAttendance /></ProtectedLayout>} />
            <Route path="/"                   element={<ProtectedLayout><DashboardRouter /></ProtectedLayout>} />
            <Route path="/leads"              element={<ProtectedLayout roles={['owner','hr','team']}><Leads /></ProtectedLayout>} />
            <Route path="/tasks"              element={<ProtectedLayout><Tasks /></ProtectedLayout>} />
            <Route path="/tasks/new"          element={<ProtectedLayout roles={['owner','hr','team']}><TaskForm /></ProtectedLayout>} />
            <Route path="/tasks/edit/:id"     element={<ProtectedLayout roles={['owner','hr','team']}><TaskForm /></ProtectedLayout>} />
            <Route path="/projects"           element={<ProtectedLayout><Projects /></ProtectedLayout>} />
            <Route path="/projects/new"       element={<ProtectedLayout roles={['owner','hr']}><ProjectForm /></ProtectedLayout>} />
            <Route path="/projects/edit/:id"  element={<ProtectedLayout><ProjectForm /></ProtectedLayout>} />
            <Route path="/payroll"            element={<ProtectedLayout roles={['owner','hr']}><Payroll /></ProtectedLayout>} />
            <Route path="/attendance"         element={<ProtectedLayout roles={['owner','hr']}><Attendance /></ProtectedLayout>} />
            <Route path="/my-attendance"      element={<ProtectedLayout><MyAttendance /></ProtectedLayout>} />
            <Route path="/hr"                 element={<ProtectedLayout roles={['owner','hr']}><HR /></ProtectedLayout>} />
            <Route path="/billing"            element={<ProtectedLayout roles={['owner','hr']}><Billing /></ProtectedLayout>} />
            <Route path="/accounts"           element={<ProtectedLayout roles={['owner','hr']}><AccountsDashboard /></ProtectedLayout>} />
            <Route path="/ledger"             element={<ProtectedLayout roles={['owner','hr']}><Ledger /></ProtectedLayout>} />
            <Route path="/bank"               element={<ProtectedLayout roles={['owner','hr']}><BankStatement /></ProtectedLayout>} />
            <Route path="/salary-slips"       element={<ProtectedLayout roles={['owner','hr']}><SalarySlips /></ProtectedLayout>} />
            <Route path="/client-messages"    element={<ProtectedLayout roles={['owner','hr']}><ClientMessages /></ProtectedLayout>} />
            <Route path="/settings"           element={<ProtectedLayout><Settings /></ProtectedLayout>} />
            <Route path="/employees/:id"      element={<ProtectedLayout roles={['owner','hr']}><EmployeeProfile /></ProtectedLayout>} />
            <Route path="*"                   element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </>
  );
}
