import { Navigate, Route, Routes } from 'react-router';
import { createAuthed, ProfilePage } from '@duncit/shell';
import LoginPage from './pages/LoginPage';
import PartnerLanding from './components/PartnerLanding';
import RegisterVenuePage from './pages/RegisterVenuePage';
import VenueAvailabilityPage from './pages/venue-availability-page/VenueAvailabilityPage';
import VenueDashboardPage from './pages/venue-dashboard-page/VenueDashboardPage';
import PodRequestDetailPage from './pages/pod-requests/detail/PodRequestDetailPage';
import NearbyHostsPage from './pages/pod-requests/search/NearbyHostsPage';
import NearbyVenuesPage from './pages/pod-requests/search/NearbyVenuesPage';
import SlotDecisionPage from './pages/slot-decision-page/SlotDecisionPage';
import BecomeHostPage from './pages/become-host-page/BecomeHostPage';
import HostDashboardPage from './pages/host-dashboard-page/HostDashboardPage';
import EcommBrandPage from './pages/ecomm-brand-page/EcommBrandPage';
import { BrandWizardRoute } from './pages/ecomm-brand-page/brand-wizard';
import BrandDetailsRoute from './pages/ecomm-brand-page/brand-details';
import BrandSettingsPage from './pages/ecomm-brand-page/brand-settings/BrandSettingsPage';
import IntegrationsPage from './pages/ecomm-brand-page/integrations/IntegrationsPage';
import ReturnsPage from './pages/ecomm-brand-page/returns';
import EcommDashboardPage from './pages/ecomm-dashboard-page/EcommDashboardPage';
import ListProductsPage from './pages/list-products-page/ListProductsPage';
import ProductListingEditorPage from './pages/list-products-page/ProductListingEditorPage';
import ProductDetailPage from './pages/list-products-page/ProductDetailPage';
import ProductSettingsPage from './pages/list-products-page/ProductSettingsPage';
import WalletPage from './pages/wallet-page';
import ClubAdminDashboardPage from './pages/club-admin-dashboard-page/ClubAdminDashboardPage';
import ClubAdminClubPodsPage from './pages/club-admin-club-pods-page/ClubAdminClubPodsPage';
import ClubAdminEditClubPage from './pages/club-admin-edit-club-page/ClubAdminEditClubPage';
import ClubAdminPodDetailsPage from './pages/club-admin-pod-details-page/ClubAdminPodDetailsPage';
import ClubAdminPodAttendancePage from './pages/club-admin-pod-attendance-page';
import ClubAdminPodEditorPage from './pages/club-admin-pod-editor-page';
import ClubAdminAutoPodEditorPage from './pages/club-admin-auto-pod-editor-page';
import VerificationPage from './pages/verification-page/VerificationPage';
import EarnPage from './pages/earn-page/EarnPage';
import {
  ClubsHub,
  HelpHub,
  HostPodsHub,
  HostRequestsHub,
  VenuePodsHub,
  VenueRequestsHub,
  VenuesHub,
} from './pages/studio-hubs';
import ChangeRequestsPage from './pages/change-requests-page';
import PartnerPoliciesPage from './pages/policies-page/PartnerPoliciesPage';
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
      {/* Each studio sidebar group is one page with tabs (pages/studio-hubs);
          every option keeps its own route, which opens the group on its tab. */}
      <Route path="/faqs" element={authed(<HelpHub />)} />
      <Route path="/register-venue" element={authed(<VenuesHub />)} />
      <Route path="/register-venue/new" element={authed(<RegisterVenuePage />)} />
      <Route path="/register-venue/current" element={authed(<RegisterVenuePage />)} />
      <Route path="/register-venue/:venueId" element={authed(<RegisterVenuePage />)} />
      <Route path="/venues/dashboard" element={authed(<VenueDashboardPage />)} />
      <Route path="/venues/requests" element={authed(<VenuePodsHub />)} />
      {/* Opened by the request email's Approve / Decline buttons (?action=…). */}
      <Route path="/venues/requests/:slotId" element={authed(<SlotDecisionPage />)} />
      {/* Pod Requests between venues and hosts — each studio scoped to its own side. */}
      <Route path="/venues/nearby-hosts" element={authed(<NearbyHostsPage />)} />
      <Route path="/venues/pod-requests" element={authed(<VenueRequestsHub />)} />
      <Route path="/venues/pod-requests/:id" element={authed(<PodRequestDetailPage side="VENUE" />)} />
      <Route path="/venues/pods" element={authed(<VenuePodsHub />)} />
      {/* Change Requests stays scoped per studio, so a venue owner who also
          hosts is never shown the wrong queue. */}
      <Route path="/venues/change-requests" element={authed(<VenueRequestsHub />)} />
      <Route path="/venues/auto-pods" element={authed(<VenueRequestsHub />)} />
      <Route path="/venues/settings" element={authed(<VenuesHub />)} />
      <Route path="/venues/:venueId/availability" element={authed(<VenueAvailabilityPage />)} />
      <Route path="/host" element={authed(<Navigate to="/host/dashboard" replace />)} />
      <Route path="/host/dashboard" element={authed(<HostDashboardPage />)} />
      <Route path="/host/pods" element={authed(<HostPodsHub />)} />
      <Route path="/host/change-requests" element={authed(<HostRequestsHub />)} />
      <Route path="/host/auto-pods" element={authed(<HostPodsHub />)} />
      <Route path="/host/nearby-venues" element={authed(<NearbyVenuesPage />)} />
      <Route path="/host/pod-requests" element={authed(<HostRequestsHub />)} />
      <Route path="/host/pod-requests/:id" element={authed(<PodRequestDetailPage side="HOST" />)} />
      <Route path="/become-host" element={authed(<BecomeHostPage />)} />
      {/* The two sidebar entries a not-yet-partner sees: each opens the Earn with
          Duncit page ON its own journey, so the click lands in the onboarding
          flow rather than on the menu that contains it. */}
      <Route path="/be-a-host" element={authed(<EarnPage focus="HOST" />)} />
      <Route path="/become-a-brand-partner" element={authed(<EarnPage focus="ECOMM" />)} />
      <Route path="/ecomm-brand" element={authed(<EcommBrandPage />)} />
      {/* The brand wizard: `new` mints an id on its first save and moves to `:brandId/edit`. */}
      <Route path="/ecomm-brand/new" element={authed(<BrandWizardRoute />)} />
      {/* The Razorpay / ShipRocket accounts a partner saves once and picks per brand. */}
      <Route path="/ecomm-brand/integrations" element={authed(<IntegrationsPage />)} />
      {/* Buyer returns on the partner's brands — under /ecomm-brand so SectionGate keeps it to ECOMM_MANAGER. */}
      <Route path="/ecomm-brand/returns" element={authed(<ReturnsPage />)} />
      {/* A brand row opens its details page (overview, logs, analytics). */}
      <Route path="/ecomm-brand/:brandId" element={authed(<BrandDetailsRoute />)} />
      <Route path="/ecomm-brand/:brandId/edit" element={authed(<BrandWizardRoute />)} />
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
      <Route path="/club-admin/clubs" element={authed(<ClubsHub />)} />
      <Route
        path="/club-admin/change-requests"
        element={authed(<ChangeRequestsPage role="CLUB_ADMIN" />)}
      />
      <Route path="/club-admin/clubs/:clubId" element={authed(<ClubAdminClubPodsPage />)} />
      <Route path="/club-admin/monitoring" element={authed(<ClubsHub />)} />
      <Route path="/club-admin/auto-pods" element={authed(<ClubsHub />)} />
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
      <Route path="/support" element={authed(<HelpHub />)} />
      <Route path="/policies" element={authed(<HelpHub />)} />
      <Route path="/policies/:slug" element={authed(<PartnerPoliciesPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}