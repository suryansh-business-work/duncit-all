import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ProfilePage } from '@duncit/shell';
import AppShell from './components/AppShell';
import LoginPage from './pages/LoginPage';
import HubPage from './pages/HubPage';
import UsersPage from './pages/UsersPage';
import UserDetailsPage from './pages/UserDetailsPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import RolesPage from './pages/RolesPage';
import CategoriesPage from './pages/CategoriesPage';
import LocationsPage from './pages/LocationsPage';
import ClubsPage from './pages/ClubsPage';
import VenuesPage from './pages/VenuesPage';
import PartnersPage from './pages/PartnersPage';
import ClubDetailsPage from './pages/ClubDetailsPage';
import PodsPage from './pages/PodsPage';
import PodDetailsPage from './pages/PodDetailsPage';
import CouponsPage from './pages/CouponsPage';
import ReferralsPage from './pages/referrals-page/ReferralsPage';
import EventTicketsPage from './pages/EventTicketsPage';
import BrandingPage from './pages/BrandingPage';
import FaqsPage from './pages/FaqsPage';
import PodIdeasPage from './pages/PodIdeasPage';
import BadgesPage from './pages/BadgesPage';
import PartnerFaqsPage from './pages/PartnerFaqsPage';
import PodPlansPage from './pages/PodPlansPage';
import ApprovalsPage from './pages/approvals-page';
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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="*"
        element={
          <RequireAuth>
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
                <Route path="/clubs/:id" element={<ClubDetailsPage />} />
                <Route path="/pods" element={<PodsPage />} />
                <Route path="/pods/:id" element={<PodDetailsPage />} />
                <Route path="/coupons" element={<CouponsPage />} />
                <Route path="/referrals" element={<ReferralsPage />} />
                <Route path="/event-tickets" element={<EventTicketsPage />} />
                <Route path="/faqs" element={<FaqsPage />} />
                <Route path="/pod-ideas" element={<PodIdeasPage />} />
                <Route path="/badges" element={<BadgesPage />} />
                <Route path="/partners/faqs" element={<PartnerFaqsPage />} />
                <Route path="/pod-plans" element={<PodPlansPage />} />
                <Route path="/approvals" element={<ApprovalsPage />} />
                <Route path="/branding" element={<BrandingPage />} />
                <Route path="/rbac/roles" element={<RolesPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/hub" replace />} />
              </Routes>
            </AppShell>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
