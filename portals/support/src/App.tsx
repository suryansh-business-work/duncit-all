import { Navigate, Route, Routes } from 'react-router-dom';
import { ProfilePage, createAuthed } from '@duncit/shell';
import { NotifyHost } from '@duncit/dialogs';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SosListPage from './pages/sos/SosListPage';
import SosDetailsPage from './pages/sos/SosDetailsPage';
import CallbacksListPage from './pages/callbacks/CallbacksListPage';
import CallbackDetailsPage from './pages/callbacks/CallbackDetailsPage';
import ReportedProblemsPage from './pages/reported-problems/ReportedProblemsPage';
import ReportedProblemDetailPage from './pages/reported-problems/ReportedProblemDetailPage';
import ReportProblemSettingsPage from './pages/reported-problems/ReportProblemSettingsPage';
import TicketsListPage from './pages/tickets/TicketsListPage';
import TicketDetailPage from './pages/tickets/TicketDetailPage';
import LiveChatPage from './pages/live-chat/LiveChatPage';
import MailAutomationPage from './pages/mail-automation';
import FaqsPage from './pages/faqs/FaqsPage';
import PartnerFaqsPage from './pages/faqs/PartnerFaqsPage';
import { FaqSubmissionsPage } from './pages/faqs/faq-submissions';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';

const authed = createAuthed({ getToken, wrap: (el) => <AppShell>{el}</AppShell> });

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/profile" element={authed(<ProfilePage />)} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={authed(<DashboardPage />)} />
      <Route path="/sos" element={authed(<SosListPage />)} />
      <Route path="/sos/:id" element={authed(<SosDetailsPage />)} />
      <Route path="/callbacks" element={authed(<CallbacksListPage />)} />
      <Route path="/callbacks/:id" element={authed(<CallbackDetailsPage />)} />
      {/* /settings before /:id so the literal wins over the param route. */}
      <Route path="/reported-problems" element={authed(<ReportedProblemsPage />)} />
      <Route path="/reported-problems/settings" element={authed(<ReportProblemSettingsPage />)} />
      <Route path="/reported-problems/:id" element={authed(<ReportedProblemDetailPage />)} />
      <Route path="/tickets" element={authed(<TicketsListPage />)} />
      <Route path="/tickets/:id" element={authed(<TicketDetailPage />)} />
      <Route path="/live-chat" element={authed(<LiveChatPage />)} />
      {/* The reply and the queue. Connecting a mailbox is the Tech portal's. */}
        <Route path="/mail-automation" element={authed(<MailAutomationPage />)} />
        {/* The three FAQ screens: the app's answers, the partner surfaces'
            answers, and the queue of questions duncit.com has no answer for. */}
        <Route path="/faqs" element={authed(<FaqsPage />)} />
        <Route path="/faqs/submissions" element={authed(<FaqSubmissionsPage />)} />
        <Route path="/partners/faqs" element={authed(<PartnerFaqsPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* Without this, every notify() in the portal is a silent no-op — it only
          dispatches an event, and this is the sole listener. */}
      <NotifyHost />
    </>
  );
}
