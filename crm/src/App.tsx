import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/dashboard';
import VenueLeadsPage from './pages/venue-leads/VenueLeadsPage';
import VenueLeadEditorPage from './pages/venue-leads/VenueLeadEditorPage';
import VenueLeadDetailPage from './pages/venue-leads/VenueLeadDetailPage';
import HostLeadsPage from './pages/host-leads/HostLeadsPage';
import HostLeadEditorPage from './pages/host-leads/HostLeadEditorPage';
import HostLeadDetailPage from './pages/host-leads/HostLeadDetailPage';
import ManageServicesPage from './pages/ManageServicesPage';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';
import { redirectPathFromLocation } from './utils/redirect';

function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  if (!getToken()) {
    const redirect = encodeURIComponent(redirectPathFromLocation(location));
    return <Navigate to={`/login?redirect=${redirect}`} replace state={{ from: location }} />;
  }
  return children;
}

const authed = (element: JSX.Element) => (
  <RequireAuth>
    <AppShell>{element}</AppShell>
  </RequireAuth>
);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={authed(<DashboardPage />)} />
      <Route path="/venue-leads" element={authed(<VenueLeadsPage />)} />
      <Route path="/venue-leads/services" element={authed(<ManageServicesPage kind="VENUE" />)} />
      <Route path="/venue-leads/new" element={authed(<VenueLeadEditorPage />)} />
      <Route path="/venue-leads/:id/view" element={authed(<VenueLeadDetailPage />)} />
      <Route path="/venue-leads/:id" element={authed(<VenueLeadEditorPage />)} />
      <Route path="/host-leads" element={authed(<HostLeadsPage />)} />
      <Route path="/host-leads/services" element={authed(<ManageServicesPage kind="HOST" />)} />
      <Route path="/host-leads/new" element={authed(<HostLeadEditorPage />)} />
      <Route path="/host-leads/:id/view" element={authed(<HostLeadDetailPage />)} />
      <Route path="/host-leads/:id" element={authed(<HostLeadEditorPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
