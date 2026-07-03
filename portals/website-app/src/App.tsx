import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import {
  DashboardPage,
  CareersPage,
  NewsroomPage,
  BlogPage,
  NewsletterPage,
  ContactSubmissionsPage,
  FaqSubmissionsPage,
  JobApplicationsPage,
  NavigationPage,
} from './pages/website';
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
      <Route path="/careers" element={authed(<CareersPage />)} />
      <Route path="/newsroom" element={authed(<NewsroomPage />)} />
      <Route path="/blog" element={authed(<BlogPage />)} />
      <Route path="/newsletter" element={authed(<NewsletterPage />)} />
      <Route path="/contact-submissions" element={authed(<ContactSubmissionsPage />)} />
      <Route path="/faq-submissions" element={authed(<FaqSubmissionsPage />)} />
      <Route path="/job-applications" element={authed(<JobApplicationsPage />)} />
      <Route path="/navigation" element={authed(<NavigationPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
