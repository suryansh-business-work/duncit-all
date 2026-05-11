import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import LoginPage from './pages/LoginPage';
import HubPage from './pages/HubPage';
import UsersPage from './pages/UsersPage';
import UserDetailsPage from './pages/UserDetailsPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import RolesPage from './pages/RolesPage';
import ResourcesPage from './pages/ResourcesPage';
import ActionsPage from './pages/ActionsPage';
import PermissionsPage from './pages/PermissionsPage';
import FeatureFlagsPage from './pages/FeatureFlagsPage';
import CategoriesPage from './pages/CategoriesPage';
import LocationsPage from './pages/LocationsPage';
import ClubsPage from './pages/ClubsPage';
import PodsPage from './pages/PodsPage';
import InventoryPage from './pages/InventoryPage';
import SlidersPage from './pages/SlidersPage';
import BrandingPage from './pages/BrandingPage';
import NotificationsPage from './pages/NotificationsPage';
import InterviewRequestsPage from './pages/InterviewRequestsPage';
import FaqsPage from './pages/FaqsPage';
import FaqSubmissionsPage from './pages/FaqSubmissionsPage';
import NewsletterSubscribersPage from './pages/NewsletterSubscribersPage';
import ContactSubmissionsPage from './pages/ContactSubmissionsPage';
import SupportLogsPage from './pages/SupportLogsPage';
import PoliciesPage from './pages/PoliciesPage';
import EmailTemplatesPage from './pages/EmailTemplatesPage';
import PodIdeasPage from './pages/PodIdeasPage';
import BadgesPage from './pages/BadgesPage';
import VenuesPage from './pages/VenuesPage';
import HostsPage from './pages/HostsPage';
import PodPlansPage from './pages/PodPlansPage';
import FinanceDashboardPage from './pages/finance/FinanceDashboardPage';
import FinanceSettingsPage from './pages/finance/FinanceSettingsPage';
import PaymentLogsPage from './pages/finance/PaymentLogsPage';
import PlatformFeesPage from './pages/finance/PlatformFeesPage';
import GstManagementPage from './pages/finance/GstManagementPage';
import InvoiceManagementPage from './pages/finance/InvoiceManagementPage';
import LedgerPage from './pages/finance/LedgerPage';
import VenueFinancePage from './pages/finance/VenueFinancePage';
import InsuranceManagementPage from './pages/finance/InsuranceManagementPage';
import PayoutCyclesPage from './pages/finance/PayoutCyclesPage';

function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
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
                <Route path="/pods" element={<PodsPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/sliders" element={<SlidersPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/interview-requests" element={<InterviewRequestsPage />} />
                <Route path="/faqs" element={<FaqsPage />} />
                <Route path="/faq-submissions" element={<FaqSubmissionsPage />} />
                <Route path="/newsletter" element={<NewsletterSubscribersPage />} />
                <Route path="/contact-submissions" element={<ContactSubmissionsPage />} />
                <Route path="/support-logs" element={<SupportLogsPage />} />
                <Route path="/policies" element={<PoliciesPage />} />
                <Route path="/email-templates" element={<EmailTemplatesPage />} />
                <Route path="/pod-ideas" element={<PodIdeasPage />} />
                <Route path="/badges" element={<BadgesPage />} />
                <Route path="/venues" element={<VenuesPage />} />
                <Route path="/hosts" element={<HostsPage />} />
                <Route path="/pod-plans" element={<PodPlansPage />} />
                <Route path="/finance/dashboard" element={<FinanceDashboardPage />} />
                <Route path="/finance/settings" element={<FinanceSettingsPage />} />
                <Route path="/finance/payment-logs" element={<PaymentLogsPage />} />
                <Route path="/finance/platform-fees" element={<PlatformFeesPage />} />
                <Route path="/finance/gst" element={<GstManagementPage />} />
                <Route path="/finance/invoices" element={<InvoiceManagementPage />} />
                <Route path="/finance/ledger" element={<LedgerPage />} />
                <Route path="/finance/venue" element={<VenueFinancePage />} />
                <Route path="/finance/insurance" element={<InsuranceManagementPage />} />
                <Route path="/finance/payouts" element={<PayoutCyclesPage />} />
                <Route path="/branding" element={<BrandingPage />} />
                <Route path="/rbac/roles" element={<RolesPage />} />
                <Route path="/rbac/permissions" element={<PermissionsPage />} />
                <Route path="/rbac/resources" element={<ResourcesPage />} />
                <Route path="/rbac/actions" element={<ActionsPage />} />
                <Route path="/feature-flags" element={<FeatureFlagsPage />} />
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
