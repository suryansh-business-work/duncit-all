import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import WelcomePage from './pages/WelcomePage';
import MarketingCampaignsPage from './pages/marketing-campaigns-page/MarketingCampaignsPage';
import NotificationsPage from './pages/notifications-page/NotificationsPage';
import AppShell from './components/AppShell';
import { NotifyHost } from './components/notify';
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
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={authed(<WelcomePage />)} />
        <Route path="/campaigns/email" element={authed(<MarketingCampaignsPage defaultChannel="EMAIL" />)} />
        <Route path="/campaigns/whatsapp" element={authed(<MarketingCampaignsPage defaultChannel="WHATSAPP" />)} />
        <Route path="/notifications" element={authed(<NotificationsPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NotifyHost />
    </>
  );
}
