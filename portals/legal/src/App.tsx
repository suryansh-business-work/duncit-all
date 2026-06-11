import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsListPage from './pages/documents/DocumentsListPage';
import DocumentDetailPage from './pages/documents/DocumentDetailPage';
import PoliciesPage from './pages/policies/PoliciesPage';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';
import { redirectPathFromLocation } from './utils/redirect';

function RequireAuth({ children }: Readonly<{ children: JSX.Element }>) {
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
      <Route path="/documents" element={authed(<DocumentsListPage />)} />
      <Route path="/documents/:id" element={authed(<DocumentDetailPage />)} />
      <Route path="/policies" element={authed(<PoliciesPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
