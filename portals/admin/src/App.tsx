import { Routes, Route, Navigate } from 'react-router-dom';
import { ProfilePage, RequireAuth } from '@duncit/shell';
import { useFeatureFlag } from '@duncit/app-settings';
import AppShell from './components/AppShell';
import LoginPage from './pages/LoginPage';
import HubPage from './pages/HubPage';
import UsersPage from './pages/UsersPage';
import UserDetailsPage from './pages/UserDetailsPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import PortalAppSettingsPage from './pages/portal-app-settings';
import RolesPage from './pages/RolesPage';
import CategoriesPage from './pages/CategoriesPage';
import LocationsPage from './pages/LocationsPage';
import ClubsPage from './pages/ClubsPage';
import VenuesPage from './pages/VenuesPage';
import PartnersPage from './pages/PartnersPage';
import ClubDetailsPage from './pages/ClubDetailsPage';
import ClubEditorPage from './pages/clubs-page/club-editor-page';
import PodsPage from './pages/PodsPage';
import PodEditorPage from './pages/pods-page/pod-editor-page';
import AutoPodsPage from './pages/auto-pods-page';
import PodDetailsPage from './pages/PodDetailsPage';
import PodSettingsPage from './pages/PodSettingsPage';
import PortalsUploadSettingPage from './pages/upload-settings/PortalsUploadSettingPage';
import MobileUploadSettingPage from './pages/upload-settings/MobileUploadSettingPage';
import MwebUploadSettingPage from './pages/upload-settings/MwebUploadSettingPage';
import PodMonitoringPage from './pages/pod-monitoring/PodMonitoringPage';
import PodsDashboardPage from './pages/pods-dashboard/PodsDashboardPage';
import EventTicketsPage from './pages/EventTicketsPage';
import BrandingPage from './pages/BrandingPage';
import LocalesPage from './pages/localization-page/LocalesPage';
import TranslationsPage from './pages/localization-page/TranslationsPage';
import FaqsPage from './pages/FaqsPage';
import PodIdeasPage from './pages/PodIdeasPage';
import BadgesPage from './pages/BadgesPage';
import SomethingForYouPage from './pages/something-for-you/SomethingForYouPage';
import PartnerFaqsPage from './pages/PartnerFaqsPage';
import PodPlansPage from './pages/PodPlansPage';
import { MembershipPlansPage, MembershipSubscribersPage } from './pages/membership';
import ApprovalsPage from './pages/approvals-page';
import PortalAccessPage from './pages/portal-access-page';
import WhatsappPage from './pages/whatsapp-page';
import { getToken } from './lib/session';

/**
 * Auto Pods ship behind the `auto_pods` flag. With it off the route falls back
 * to All Pods rather than 404-ing, which is what a stale bookmark or a link in
 * an older email hits.
 */
function AutoPodsRoute() {
  const enabled = useFeatureFlag('auto_pods');
  if (!enabled) return <Navigate to="/pods" replace />;
  return <AutoPodsPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="*"
        element={
          <RequireAuth getToken={getToken}>
            <AppShell>
              <Routes>
                <Route path="/hub" element={<HubPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/users/:user_id" element={<UserDetailsPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/locations" element={<LocationsPage />} />
                <Route path="/clubs" element={<ClubsPage />} />
                <Route path="/venues" element={<VenuesPage />} />
                <Route path="/partners" element={<PartnersPage />} />
                {/* Static before dynamic so /clubs/new is never read as a club
                    id — React Router ranks it first either way, and the order
                    says so out loud. */}
                <Route path="/clubs/new" element={<ClubEditorPage />} />
                <Route path="/clubs/:id" element={<ClubDetailsPage />} />
                <Route path="/clubs/:id/edit" element={<ClubEditorPage />} />
                <Route path="/pods" element={<PodsPage />} />
                {/* Static before dynamic so /pods/dashboard is never read as a
                    pod id — React Router ranks it first either way, and the
                    order says so out loud. */}
                <Route path="/pods/dashboard" element={<PodsDashboardPage />} />
                <Route path="/pods/new" element={<PodEditorPage />} />
                <Route path="/pods/:id" element={<PodDetailsPage />} />
                <Route path="/pods/:id/edit" element={<PodEditorPage />} />
                <Route path="/auto-pods" element={<AutoPodsRoute />} />
                <Route path="/pod-settings" element={<PodSettingsPage />} />
                <Route path="/pod-monitoring" element={<PodMonitoringPage />} />
                <Route path="/event-tickets" element={<EventTicketsPage />} />
                <Route path="/faqs" element={<FaqsPage />} />
                <Route path="/pod-ideas" element={<PodIdeasPage />} />
                <Route path="/badges" element={<BadgesPage />} />
                <Route path="/something-for-you" element={<SomethingForYouPage />} />
                <Route path="/partners/faqs" element={<PartnerFaqsPage />} />
                <Route path="/pod-plans" element={<PodPlansPage />} />
                <Route path="/membership/plans" element={<MembershipPlansPage />} />
                <Route path="/membership/subscribers" element={<MembershipSubscribersPage />} />
                <Route path="/approvals" element={<ApprovalsPage />} />
                <Route path="/portal-access" element={<PortalAccessPage />} />
                <Route path="/upload-settings/portals" element={<PortalsUploadSettingPage />} />
                <Route path="/upload-settings/mobile" element={<MobileUploadSettingPage />} />
                <Route path="/upload-settings/mweb" element={<MwebUploadSettingPage />} />
                <Route path="/whatsapp" element={<WhatsappPage />} />
                <Route path="/branding" element={<BrandingPage />} />
                <Route path="/rbac/roles" element={<RolesPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/portal-app-settings" element={<PortalAppSettingsPage />} />
                <Route path="/localization/locales" element={<LocalesPage />} />
                <Route path="/localization/translations" element={<TranslationsPage />} />
                <Route path="*" element={<Navigate to="/hub" replace />} />
              </Routes>
            </AppShell>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
