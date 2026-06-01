import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import EnvironmentPage from './pages/environment';
import PortalModesPage from './pages/portal-modes';
import FeatureFlagsPage from './pages/feature-flags-page/FeatureFlagsPage';
import AuthenticationPage from './pages/AuthenticationPage';
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
        <Route path="/" element={authed(<EnvironmentPage />)} />
        <Route path="/portal-modes" element={authed(<PortalModesPage />)} />
        <Route path="/feature-flags" element={authed(<FeatureFlagsPage />)} />
        <Route path="/authentication" element={authed(<AuthenticationPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NotifyHost />
    </>
  );
}
