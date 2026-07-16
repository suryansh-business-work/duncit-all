import { Navigate, Route, Routes } from 'react-router-dom';
import { ProfilePage, createAuthed } from '@duncit/shell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SosListPage from './pages/sos/SosListPage';
import SosDetailsPage from './pages/sos/SosDetailsPage';
import CallbacksListPage from './pages/callbacks/CallbacksListPage';
import CallbackDetailsPage from './pages/callbacks/CallbackDetailsPage';
import TicketsListPage from './pages/tickets/TicketsListPage';
import TicketDetailPage from './pages/tickets/TicketDetailPage';
import LiveChatPage from './pages/live-chat/LiveChatPage';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';

const authed = createAuthed({ getToken, wrap: (el) => <AppShell>{el}</AppShell> });

export default function App() {
  return (
    <Routes>
        <Route path="/profile" element={authed(<ProfilePage />)} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={authed(<DashboardPage />)} />
      <Route path="/sos" element={authed(<SosListPage />)} />
      <Route path="/sos/:id" element={authed(<SosDetailsPage />)} />
      <Route path="/callbacks" element={authed(<CallbacksListPage />)} />
      <Route path="/callbacks/:id" element={authed(<CallbackDetailsPage />)} />
      <Route path="/tickets" element={authed(<TicketsListPage />)} />
      <Route path="/tickets/:id" element={authed(<TicketDetailPage />)} />
      <Route path="/live-chat" element={authed(<LiveChatPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
