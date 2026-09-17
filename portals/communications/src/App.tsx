import { Navigate, Route, Routes } from 'react-router';
import { createAuthed, ProfilePage, WelcomePage } from '@duncit/shell';
import EmailsDashboardPage from './pages/emails-dashboard';
import EmailTemplatesPage from './pages/email-templates-page/EmailTemplatesPage';
import EmailFragmentsPage from './pages/email-fragments-page';
import EmailLogsPage from './pages/email-logs-page';
import MailAutomationPage from './pages/mail-automation';
import WhatsappPage from './pages/whatsapp-page';
import SlackSettingsPage from './pages/slack/SlackSettingsPage';
import Msg91LogsPage from './pages/msg91-otp/logs';
import Msg91AnalyticsPage from './pages/msg91-otp/analytics';
import { appConfig } from './config/app-config';
import { runtime } from './runtime';

const { AppShell, LoginPage, session } = runtime;
const authed = createAuthed({ getToken: session.getToken, wrap: (el) => <AppShell>{el}</AppShell> });

/** Every channel Duncit speaks through — email, WhatsApp, Slack and SMS codes. */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={authed(<WelcomePage config={appConfig} />)} />
      <Route path="/profile" element={authed(<ProfilePage />)} />
      <Route path="/emails" element={<Navigate to="/emails/dashboard" replace />} />
      <Route path="/emails/dashboard" element={authed(<EmailsDashboardPage />)} />
      <Route path="/emails/templates" element={authed(<EmailTemplatesPage />)} />
      <Route path="/emails/fragments" element={authed(<EmailFragmentsPage />)} />
      <Route path="/emails/logs" element={authed(<EmailLogsPage />)} />
      {/* Connecting a mailbox only. What it replies with lives in Support. */}
      <Route path="/mail-automation" element={authed(<MailAutomationPage />)} />
      <Route path="/whatsapp" element={authed(<WhatsappPage />)} />
      <Route path="/slack" element={authed(<SlackSettingsPage />)} />
      <Route path="/msg91-otp" element={<Navigate to="/msg91-otp/logs" replace />} />
      <Route path="/msg91-otp/logs" element={authed(<Msg91LogsPage />)} />
      <Route path="/msg91-otp/analytics" element={authed(<Msg91AnalyticsPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
