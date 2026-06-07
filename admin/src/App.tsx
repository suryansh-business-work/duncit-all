import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import LoginPage from './pages/LoginPage';
import HubPage from './pages/HubPage';
import UsersPage from './pages/UsersPage';
import UserDetailsPage from './pages/UserDetailsPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import RolesPage from './pages/RolesPage';
import CategoriesPage from './pages/CategoriesPage';
import LocationsPage from './pages/LocationsPage';
import ClubsPage from './pages/ClubsPage';
import ClubDetailsPage from './pages/ClubDetailsPage';
import PodsPage from './pages/PodsPage';
import PodDetailsPage from './pages/PodDetailsPage';
import CouponsPage from './pages/CouponsPage';
import EventTicketsPage from './pages/EventTicketsPage';
import SlidersPage from './pages/SlidersPage';
import BrandingPage from './pages/BrandingPage';
import InterviewRequestsPage from './pages/InterviewRequestsPage';
import FaqsPage from './pages/FaqsPage';
import SupportLogsPage from './pages/SupportLogsPage';
import EmailTemplatesPage from './pages/EmailTemplatesPage';
import PodIdeasPage from './pages/PodIdeasPage';
import BadgesPage from './pages/BadgesPage';
import PartnerFaqsPage from './pages/PartnerFaqsPage';
import PodPlansPage from './pages/PodPlansPage';
import { redirectPathFromLocation } from './utils/redirect';

function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const token = localStorage.getItem('admin_token');
  if (!token) {
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
            <AdminLayout>
              <Routes>
                <Route path="/hub" element={<HubPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/users/:user_id" element={<UserDetailsPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/locations" element={<LocationsPage />} />
                <Route path="/clubs" element={<ClubsPage />} />
                <Route path="/clubs/:id" element={<ClubDetailsPage />} />
                <Route path="/pods" element={<PodsPage />} />
                <Route path="/pods/:id" element={<PodDetailsPage />} />
                <Route path="/coupons" element={<CouponsPage />} />
                <Route path="/event-tickets" element={<EventTicketsPage />} />
                <Route path="/sliders" element={<SlidersPage />} />
                <Route path="/interview-requests" element={<InterviewRequestsPage />} />
                <Route path="/faqs" element={<FaqsPage />} />
                <Route path="/support-logs" element={<SupportLogsPage />} />
                <Route path="/email-templates" element={<EmailTemplatesPage />} />
                <Route path="/pod-ideas" element={<PodIdeasPage />} />
                <Route path="/badges" element={<BadgesPage />} />
                <Route path="/partners/faqs" element={<PartnerFaqsPage />} />
                <Route path="/pod-plans" element={<PodPlansPage />} />
                <Route path="/branding" element={<BrandingPage />} />
                <Route path="/rbac/roles" element={<RolesPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/hub" replace />} />
              </Routes>
            </AdminLayout>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
