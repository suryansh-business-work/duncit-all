import { Navigate, Route, Routes } from 'react-router';
import { ProfilePage, createAuthed } from '@duncit/shell';
import { NotifyHost } from '@duncit/dialogs';
import { CouponDetailPage, CouponsPage } from '@duncit/coupons';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/dashboard-page/DashboardPage';
import ContactsDashboardPage from './pages/contacts-page';
import AnalyticsOverviewPage from './pages/analytics-overview-page';
import AnalyticsSocialPage from './pages/analytics-social-page';
import AnalyticsContentPage from './pages/analytics-content-page';
import AnalyticsFunnelPage from './pages/analytics-funnel-page';
import AnalyticsAutomationPage from './pages/analytics-automation-page';
import AudienceListsPage from './pages/target-audience-page/AudienceListsPage';
import CreateAudienceListPage from './pages/target-audience-page/CreateAudienceListPage';
import AudienceListDetailPage from './pages/target-audience-page/AudienceListDetailPage';
import MarketingCampaignsPage from './pages/marketing-campaigns-page/MarketingCampaignsPage';
import CreateCampaignPage from './pages/marketing-campaigns-page/CreateCampaignPage';
import MailPreferenceAnalyticsPage from './pages/mail-preference-analytics-page';
import ShortLinksPage from './pages/short-links-page/ShortLinksPage';
import ShortLinkDetailPage from './pages/short-links-page/ShortLinkDetailPage';
import ExternalLinksPage from './pages/external-links-page';
import NotificationsPage from './pages/notifications-page/NotificationsPage';
import AppPopupsPage from './pages/app-popups-page/AppPopupsPage';
import StatusPage from './pages/status-page/StatusPage';
import SocialAccountsPage from './pages/social-accounts-page';
import SocialCalendarPage from './pages/social-calendar-page';
import InboxPage from './pages/inbox-page';
import LeadsPage from './pages/leads-page';
import InstagramLeadsPage from './pages/instagram-leads-page';
import OutreachPage from './pages/outreach-page';
import AgentsPage from './pages/agents-page';
import OccasionsPage from './pages/occasions-page';
import OccasionThemeEditorPage from './pages/occasions-page/editor';
import AdsApprovalsPage from './pages/ads-approvals-page/AdsApprovalsPage';
import LiveAdsPage from './pages/live-ads-page/LiveAdsPage';
import AdsSettingsPage from './pages/ads-settings-page/AdsSettingsPage';
import IntegrationsPage from './pages/settings-page/IntegrationsPage';
import ActivityPage from './pages/activity-page';
import ApprovalsPage from './pages/approvals-page';
import TasksPage from './pages/tasks-page';
import ReelProjectsPage from './pages/reels/projects-list';
import ReelStudioPage from './pages/reels/studio/lazy';
import AppShell from './components/AppShell';
import Redirect from './components/Redirect';
import { getToken } from './lib/session';

const authed = createAuthed({ getToken, wrap: (el) => <AppShell>{el}</AppShell> });

/**
 * The route table. Pages live under the section that owns them (Social,
 * Publishing, Leads, Campaigns, Analytics, Settings); the old flat addresses
 * redirect, query string included, so bookmarks and the OAuth callback keep
 * landing.
 */
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/profile" element={authed(<ProfilePage />)} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={authed(<DashboardPage />)} />
        {/* Overview: what is waiting on a person, and the record of every run */}
        <Route path="/tasks" element={authed(<TasksPage />)} />
        <Route path="/approvals" element={authed(<ApprovalsPage />)} />
        <Route path="/activity" element={authed(<ActivityPage />)} />
        {/* Social media */}
        <Route path="/social/accounts" element={authed(<SocialAccountsPage />)} />
        <Route path="/social/inbox" element={authed(<InboxPage />)} />
        <Route path="/social-accounts" element={<Redirect to="/social/accounts" />} />
        {/* Publishing */}
        <Route path="/publish/calendar" element={authed(<SocialCalendarPage />)} />
        <Route path="/social-calendar" element={<Redirect to="/publish/calendar" />} />
        {/* Create: Reel Studio — the studio itself is fetched when a reel is opened */}
        <Route path="/studio/reels" element={authed(<ReelProjectsPage />)} />
        <Route path="/studio/reels/:projectId" element={authed(<ReelStudioPage />)} />
        {/* Leads */}
        <Route path="/leads" element={authed(<LeadsPage />)} />
        <Route path="/leads/instagram" element={authed(<InstagramLeadsPage />)} />
        <Route path="/instagram-leads" element={<Redirect to="/leads/instagram" />} />
        {/* Outreach: multi-step sequences to the leads */}
        <Route path="/outreach/sequences" element={authed(<OutreachPage />)} />
        {/* Automation: the agents that plan with Claude and act through code */}
        <Route path="/automation/agents" element={authed(<AgentsPage />)} />
        {/* Campaigns and the channels they go out on */}
        <Route path="/audience" element={authed(<AudienceListsPage />)} />
        <Route path="/audience/new" element={authed(<CreateAudienceListPage />)} />
        <Route path="/audience/:listId" element={authed(<AudienceListDetailPage />)} />
        <Route path="/campaigns/email" element={authed(<MarketingCampaignsPage />)} />
        <Route path="/campaigns/email/new" element={authed(<CreateCampaignPage />)} />
        <Route path="/campaigns/mail-preferences" element={authed(<MailPreferenceAnalyticsPage />)} />
        <Route path="/coupons" element={authed(<CouponsPage />)} />
        <Route path="/coupons/:couponId" element={authed(<CouponDetailPage />)} />
        <Route path="/short-links" element={authed(<ShortLinksPage />)} />
        <Route path="/short-links/:linkId" element={authed(<ShortLinkDetailPage />)} />
        <Route path="/external-links" element={authed(<ExternalLinksPage />)} />
        {/* The same detail page: an external link's analytics are the same
            analytics, and it reads which list to go Back to off the path. */}
        <Route path="/external-links/:linkId" element={authed(<ShortLinkDetailPage />)} />
        <Route path="/occasions" element={authed(<OccasionsPage />)} />
        <Route path="/occasions/themes/new" element={authed(<OccasionThemeEditorPage />)} />
        <Route path="/occasions/themes/:key" element={authed(<OccasionThemeEditorPage />)} />
        <Route path="/notifications" element={authed(<NotificationsPage />)} />
        <Route path="/app-popups" element={authed(<AppPopupsPage />)} />
        <Route path="/status" element={authed(<StatusPage />)} />
        <Route path="/ads-approvals" element={authed(<AdsApprovalsPage />)} />
        <Route path="/live-ads" element={authed(<LiveAdsPage />)} />
        <Route path="/ads-settings" element={authed(<AdsSettingsPage />)} />
        {/* Analytics */}
        <Route path="/analytics/overview" element={authed(<AnalyticsOverviewPage />)} />
        <Route path="/analytics/social" element={authed(<AnalyticsSocialPage />)} />
        <Route path="/analytics/content" element={authed(<AnalyticsContentPage />)} />
        <Route path="/analytics/funnel" element={authed(<AnalyticsFunnelPage />)} />
        <Route path="/analytics/automation" element={authed(<AnalyticsAutomationPage />)} />
        <Route path="/analytics/contacts" element={authed(<ContactsDashboardPage />)} />
        <Route path="/contacts" element={<Redirect to="/analytics/contacts" />} />
        {/* Settings */}
        <Route path="/settings/integrations" element={authed(<IntegrationsPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NotifyHost />
    </>
  );
}
