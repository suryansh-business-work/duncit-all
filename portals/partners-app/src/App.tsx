import { Navigate, Route, Routes } from 'react-router';
import { createAuthed, ProfilePage } from '@duncit/shell';
import LoginPage from './pages/LoginPage';
import PartnerLanding from './components/PartnerLanding';
import PartnerFaqsPage from './pages/PartnerFaqsPage';
import RegisterVenuePage from './pages/RegisterVenuePage';
import VenueListingsPage from './pages/venue-listings-page/VenueListingsPage';
import VenueAvailabilityPage from './pages/venue-availability-page/VenueAvailabilityPage';
import VenueDashboardPage from './pages/venue-dashboard-page/VenueDashboardPage';
import SlotRequestsPage from './pages/slot-requests-page/SlotRequestsPage';
import ChangeRequestsPage from './pages/change-requests-page';
import SlotDecisionPage from './pages/slot-decision-page/SlotDecisionPage';
import VenuePodsPage from './pages/venue-pods-page/VenuePodsPage';
import VenueAutoPodsPage from './pages/venue-auto-pods-page/VenueAutoPodsPage';
import VenueSettingsPage from './pages/venue-settings-page/VenueSettingsPage';
import BecomeHostPage from './pages/become-host-page/BecomeHostPage';
import HostDashboardPage from './pages/host-dashboard-page/HostDashboardPage';
import HostPodsPage from './pages/host-pods-page/HostPodsPage';
import HostAutoPodsPage from './pages/host-auto-pods-page/HostAutoPodsPage';
import EcommBrandPage from './pages/ecomm-brand-page/EcommBrandPage';
import BrandSettingsPage from './pages/ecomm-brand-page/brand-settings/BrandSettingsPage';
import EcommDashboardPage from './pages/ecomm-dashboard-page/EcommDashboardPage';
import ListProductsPage from './pages/list-products-page/ListProductsPage';
import ProductListingEditorPage from './pages/list-products-page/ProductListingEditorPage';
import ProductDetailPage from './pages/list-products-page/ProductDetailPage';
import ProductSettingsPage from './pages/list-products-page/ProductSettingsPage';
import PartnerPoliciesPage from './pages/policies-page/PartnerPoliciesPage';
import SupportPage from './pages/support-page/SupportPage';
import WalletPage from './pages/wallet-page';
import ClubAdminDashboardPage from './pages/club-admin-dashboard-page/ClubAdminDashboardPage';
import ClubAdminClubsPage from './pages/club-admin-clubs-page/ClubAdminClubsPage';
import ClubAdminClubPodsPage from './pages/club-admin-club-pods-page/ClubAdminClubPodsPage';
import ClubAdminEditClubPage from './pages/club-admin-edit-club-page/ClubAdminEditClubPage';
import ClubAdminPodDetailsPage from './pages/club-admin-pod-details-page/ClubAdminPodDetailsPage';
import ClubAdminPodAttendancePage from './pages/club-admin-pod-attendance-page';
import ClubAdminPodEditorPage from './pages/club-admin-pod-editor-page';
import ClubAdminAutoPodEditorPage from './pages/club-admin-auto-pod-editor-page';
import ClubAdminPodMonitoringPage from './pages/club-admin-monitoring-page/ClubAdminPodMonitoringPage';
import ClubAdminAutoPodsPage from './pages/club-admin-auto-pods-page/ClubAdminAutoPodsPage';
import VerificationPage from './pages/verification-page/VerificationPage';
import EarnPage from './pages/earn-page/EarnPage';
import AppShell from './components/AppShell';
import SectionGate from './components/SectionGate';
import { getToken } from './lib/session';

const authed = createAuthed({
  getToken,
  wrap: (el) => (
    <AppShell>
      <SectionGate>{el}</SectionGate>
    </AppShell>
  ),
});

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/profile" element={authed(<ProfilePage />)} />
      <Route path="/" element={authed(<PartnerLanding />)} />
      <Route path="/faqs" element={authed(<PartnerFaqsPage />)} />
      <Route path="/register-venue" element={authed(<VenueListingsPage />)} />
      <Route path="/register-venue/new" element={authed(<RegisterVenuePage />)} />
      <Route path="/register-venue/current" element={authed(<RegisterVenuePage />)} />
      <Route path="/register-venue/:venueId" element={authed(<RegisterVenuePage />)} />
      <Route path="/venues/dashboard" element={authed(<VenueDashboardPage />)} />
      <Route path="/venues/requests" element={authed(<SlotRequestsPage />)} />
      {/* Opened by the request email's Approve / Decline buttons (?action=…). */}
      <Route path="/venues/requests/:slotId" element={authed(<SlotDecisionPage />)} />
      <Route path="/venues/pods" element={authed(<VenuePodsPage />)} />
      {/* One page, three routes: each studio scopes the board to its own role
          so a venue owner who also hosts is never shown the wrong queue. */}
      <Route
        path="/venues/change-requests"
        element={authed(<ChangeRequestsPage role="VENUE" />)}
      />
      <Route path="/venues/auto-pods" element={authed(<VenueAutoPodsPage />)} />
      <Route path="/venues/settings" element={authed(<VenueSettingsPage />)} />
      <Route path="/venues/:venueId/availability" element={authed(<VenueAvailabilityPage />)} />
      <Route path="/host" element={authed(<Navigate to="/host/dashboard" replace />)} />
      <Route path="/host/dashboard" element={authed(<HostDashboardPage />)} />
      <Route path="/host/pods" element={authed(<HostPodsPage />)} />
      <Route path="/host/change-requests" element={authed(<ChangeRequestsPage role="HOST" />)} />
      <Route path="/host/auto-pods" element={authed(<HostAutoPodsPage />)} />
      <Route path="/become-host" element={authed(<BecomeHostPage />)} />
      <Route path="/ecomm-brand" element={authed(<EcommBrandPage />)} />
      <Route path="/ecomm/dashboard" element={authed(<EcommDashboardPage />)} />
      <Route path="/ecomm-brand/:brandId/settings" element={authed(<BrandSettingsPage />)} />
      <Route path="/pods" element={<Navigate to="/host/pods" replace />} />
      <Route path="/ecomm-brand/:brandId/products" element={authed(<ListProductsPage />)} />
      <Route path="/ecomm-brand/:brandId/products/new" element={authed(<ProductListingEditorPage />)} />
      <Route path="/ecomm-brand/:brandId/products/:productId/view" element={authed(<ProductDetailPage />)} />
      <Route path="/ecomm-brand/:brandId/products/:productId/settings" element={authed(<ProductSettingsPage />)} />
      <Route path="/ecomm-brand/:brandId/products/:productId" element={authed(<ProductListingEditorPage />)} />
      <Route path="/list-products" element={<Navigate to="/ecomm-brand" replace />} />
      <Route path="/club-admin" element={authed(<Navigate to="/club-admin/dashboard" replace />)} />
      <Route path="/club-admin/dashboard" element={authed(<ClubAdminDashboardPage />)} />
      <Route path="/club-admin/clubs" element={authed(<ClubAdminClubsPage />)} />
      <Route
        path="/club-admin/change-requests"
        element={authed(<ChangeRequestsPage role="CLUB_ADMIN" />)}
      />
      <Route path="/club-admin/clubs/:clubId" element={authed(<ClubAdminClubPodsPage />)} />
      <Route path="/club-admin/monitoring" element={authed(<ClubAdminPodMonitoringPage />)} />
      <Route path="/club-admin/auto-pods" element={authed(<ClubAdminAutoPodsPage />)} />
      <Route path="/club-admin/clubs/:clubId/edit" element={authed(<ClubAdminEditClubPage />)} />
      {/* Static before dynamic so /pods/new is never read as a pod id —
          React Router ranks it first either way, and the order says so. */}
      <Route path="/club-admin/clubs/:clubId/pods/new" element={authed(<ClubAdminPodEditorPage />)} />
      <Route path="/club-admin/clubs/:clubId/auto-pods/new" element={authed(<ClubAdminAutoPodEditorPage />)} />
      <Route path="/club-admin/clubs/:clubId/pods/:id" element={authed(<ClubAdminPodDetailsPage />)} />
      <Route path="/club-admin/clubs/:clubId/pods/:id/edit" element={authed(<ClubAdminPodEditorPage />)} />
      <Route
        path="/club-admin/clubs/:clubId/pods/:id/attendance"
        element={authed(<ClubAdminPodAttendancePage />)}
      />
      <Route path="/wallet" element={authed(<WalletPage />)} />
      <Route path="/earn" element={authed(<EarnPage />)} />
      <Route path="/verification" element={authed(<VerificationPage />)} />
      <Route path="/support" element={authed(<SupportPage />)} />
      <Route path="/policies" element={authed(<PartnerPoliciesPage />)} />
      <Route path="/policies/:slug" element={authed(<PartnerPoliciesPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}