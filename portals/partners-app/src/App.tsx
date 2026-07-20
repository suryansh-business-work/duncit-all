import { Navigate, Route, Routes } from 'react-router-dom';
import { createAuthed, ProfilePage } from '@duncit/shell';
import LoginPage from './pages/LoginPage';
import PartnerDashboardPage from './pages/dashboard-page/PartnerDashboardPage';
import PartnerFaqsPage from './pages/PartnerFaqsPage';
import RegisterVenuePage from './pages/RegisterVenuePage';
import VenueListingsPage from './pages/venue-listings-page/VenueListingsPage';
import VenueAvailabilityPage from './pages/venue-availability-page/VenueAvailabilityPage';
import VenueDashboardPage from './pages/venue-dashboard-page/VenueDashboardPage';
import SlotRequestsPage from './pages/slot-requests-page/SlotRequestsPage';
import BecomeHostPage from './pages/become-host-page/BecomeHostPage';
import EcommBrandPage from './pages/ecomm-brand-page/EcommBrandPage';
import ListProductsPage from './pages/list-products-page/ListProductsPage';
import ProductListingEditorPage from './pages/list-products-page/ProductListingEditorPage';
import ProductDetailPage from './pages/list-products-page/ProductDetailPage';
import PartnerPoliciesPage from './pages/policies-page/PartnerPoliciesPage';
import SupportPage from './pages/support-page/SupportPage';
import ClubAdminDashboardPage from './pages/club-admin-dashboard-page/ClubAdminDashboardPage';
import ClubAdminClubsPage from './pages/club-admin-clubs-page/ClubAdminClubsPage';
import ClubAdminClubPodsPage from './pages/club-admin-club-pods-page/ClubAdminClubPodsPage';
import ClubAdminEditClubPage from './pages/club-admin-edit-club-page/ClubAdminEditClubPage';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';

const authed = createAuthed({ getToken, wrap: (el) => <AppShell>{el}</AppShell> });

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/profile" element={authed(<ProfilePage />)} />
      <Route path="/" element={authed(<PartnerDashboardPage />)} />
      <Route path="/faqs" element={authed(<PartnerFaqsPage />)} />
      <Route path="/register-venue" element={authed(<VenueListingsPage />)} />
      <Route path="/register-venue/new" element={authed(<RegisterVenuePage />)} />
      <Route path="/register-venue/current" element={authed(<RegisterVenuePage />)} />
      <Route path="/register-venue/:venueId" element={authed(<RegisterVenuePage />)} />
      <Route path="/venues/dashboard" element={authed(<VenueDashboardPage />)} />
      <Route path="/venues/requests" element={authed(<SlotRequestsPage />)} />
      <Route path="/venues/:venueId/availability" element={authed(<VenueAvailabilityPage />)} />
      <Route path="/become-host" element={authed(<BecomeHostPage />)} />
      <Route path="/ecomm-brand" element={authed(<EcommBrandPage />)} />
      <Route path="/pods" element={<Navigate to="/become-host" replace />} />
      <Route path="/ecomm-brand/:brandId/products" element={authed(<ListProductsPage />)} />
      <Route path="/ecomm-brand/:brandId/products/new" element={authed(<ProductListingEditorPage />)} />
      <Route path="/ecomm-brand/:brandId/products/:productId/view" element={authed(<ProductDetailPage />)} />
      <Route path="/ecomm-brand/:brandId/products/:productId" element={authed(<ProductListingEditorPage />)} />
      <Route path="/list-products" element={<Navigate to="/ecomm-brand" replace />} />
      <Route path="/club-admin" element={authed(<Navigate to="/club-admin/dashboard" replace />)} />
      <Route path="/club-admin/dashboard" element={authed(<ClubAdminDashboardPage />)} />
      <Route path="/club-admin/clubs" element={authed(<ClubAdminClubsPage />)} />
      <Route path="/club-admin/clubs/:clubId" element={authed(<ClubAdminClubPodsPage />)} />
      <Route path="/club-admin/clubs/:clubId/edit" element={authed(<ClubAdminEditClubPage />)} />
      <Route path="/support" element={authed(<SupportPage />)} />
      <Route path="/policies" element={authed(<PartnerPoliciesPage />)} />
      <Route path="/policies/:slug" element={authed(<PartnerPoliciesPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}