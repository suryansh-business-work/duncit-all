import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SosListPage from './pages/sos/SosListPage';
import SosDetailsPage from './pages/sos/SosDetailsPage';
import CallbacksListPage from './pages/callbacks/CallbacksListPage';
import CallbackDetailsPage from './pages/callbacks/CallbackDetailsPage';
import FeedbackListPage from './pages/feedback/FeedbackListPage';
import FeedbackDetailsPage from './pages/feedback/FeedbackDetailsPage';
import TicketsListPage from './pages/tickets/TicketsListPage';
import TicketDetailPage from './pages/tickets/TicketDetailPage';
import LiveChatPage from './pages/live-chat/LiveChatPage';
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
      <Route path="/sos" element={authed(<SosListPage />)} />
      <Route path="/sos/:id" element={authed(<SosDetailsPage />)} />
      <Route path="/callbacks" element={authed(<CallbacksListPage />)} />
      <Route path="/callbacks/:id" element={authed(<CallbackDetailsPage />)} />
      <Route path="/feedback" element={authed(<FeedbackListPage />)} />
      <Route path="/feedback/:id" element={authed(<FeedbackDetailsPage />)} />
      <Route path="/tickets" element={authed(<TicketsListPage />)} />
      <Route path="/tickets/:id" element={authed(<TicketDetailPage />)} />
      <Route path="/live-chat" element={authed(<LiveChatPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
