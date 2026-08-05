import { Navigate, Route, Routes } from 'react-router-dom';
import { ProfilePage, createAuthed } from '@duncit/shell';
import { NotifyHost } from '@duncit/dialogs';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/dashboard-page/DashboardPage';
import AudienceListsPage from './pages/target-audience-page/AudienceListsPage';
import CreateAudienceListPage from './pages/target-audience-page/CreateAudienceListPage';
import AudienceListDetailPage from './pages/target-audience-page/AudienceListDetailPage';
import MarketingCampaignsPage from './pages/marketing-campaigns-page/MarketingCampaignsPage';
import CreateCampaignPage from './pages/marketing-campaigns-page/CreateCampaignPage';
import WhatsappCampaignsPage from './pages/whatsapp-campaigns-page';
import ShortLinksPage from './pages/short-links-page/ShortLinksPage';
import ShortLinkDetailPage from './pages/short-links-page/ShortLinkDetailPage';
import NotificationsPage from './pages/notifications-page/NotificationsPage';
import AdsApprovalsPage from './pages/ads-approvals-page/AdsApprovalsPage';
import LiveAdsPage from './pages/live-ads-page/LiveAdsPage';
import AdsSettingsPage from './pages/ads-settings-page/AdsSettingsPage';
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
        <Route path="/audience" element={authed(<AudienceListsPage />)} />
        <Route path="/audience/new" element={authed(<CreateAudienceListPage />)} />
        <Route path="/audience/:listId" element={authed(<AudienceListDetailPage />)} />
        <Route path="/campaigns/email" element={authed(<MarketingCampaignsPage />)} />
        <Route path="/campaigns/email/new" element={authed(<CreateCampaignPage />)} />
        <Route path="/campaigns/whatsapp" element={authed(<WhatsappCampaignsPage />)} />
        <Route path="/short-links" element={authed(<ShortLinksPage />)} />
        <Route path="/short-links/:linkId" element={authed(<ShortLinkDetailPage />)} />
        <Route path="/notifications" element={authed(<NotificationsPage />)} />
        <Route path="/ads-approvals" element={authed(<AdsApprovalsPage />)} />
        <Route path="/live-ads" element={authed(<LiveAdsPage />)} />
        <Route path="/ads-settings" element={authed(<AdsSettingsPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NotifyHost />
    </>
  );
}
