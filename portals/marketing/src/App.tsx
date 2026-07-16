import { Navigate, Route, Routes } from 'react-router-dom';
import { ProfilePage, createAuthed } from '@duncit/shell';
import { NotifyHost } from '@duncit/dialogs';
import LoginPage from './pages/LoginPage';
import WelcomePage from './pages/WelcomePage';
import MarketingCampaignsPage from './pages/marketing-campaigns-page/MarketingCampaignsPage';
import NotificationsPage from './pages/notifications-page/NotificationsPage';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';

const authed = createAuthed({ getToken, wrap: (el) => <AppShell>{el}</AppShell> });

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/profile" element={authed(<ProfilePage />)} />
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
