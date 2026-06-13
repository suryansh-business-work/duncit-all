import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import NotFoundPage from '../pages/NotFoundPage';
import RegisterPage from '../pages/RegisterPage';
import LoginPage from '../pages/LoginPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import SignupSurveyPage from '../pages/SignupSurveyPage';
import SignupWhatsappPage from '../pages/SignupWhatsappPage';
import AccountPage from '../pages/AccountPage';
import ProfilePage from '../pages/ProfilePage';
import FollowPage from '../pages/FollowPage';
import PublicProfilePage from '../pages/PublicProfilePage';
import PodDetailsPage from '../pages/PodDetailsPage';
import ClubDetailsPage from '../pages/ClubDetailsPage';
import HostsVenuesPage from '../pages/HostsVenuesPage';
import SurveyGatePage from '../pages/survey-gate';
import HostManagePage from '../pages/HostManagePage';
import HostDashboardPage from '../pages/host-dashboard-page';
import VerificationPage from '../pages/verification-page';
import WalletPage from '../pages/wallet-page';
import VenueManagePage from '../pages/VenueManagePage';
import VenueDetailsPage from '../pages/VenueDetailsPage';
import FaqsPage from '../pages/FaqsPage';
import PolicyPage from '../pages/PolicyPage';
import PodIdeasPage from '../pages/PodIdeasPage';
import ReferralPage from '../pages/ReferralPage';
import PodPlansPage from '../pages/PodPlansPage';
import PodHistoryPage from '../pages/PodHistoryPage';
import PodHistoryDetailsPage from '../pages/PodHistoryDetailsPage';
import TicketDetailPage from '../pages/support-tickets/TicketDetailPage';
import SupportChatPage from '../pages/support-chat/SupportChatPage';
import {
  SupportHubPage,
  SosPage,
  CallbackPage,
  SupportTicketsPage,
  LiveTicketsPage,
  AllTicketsPage,
} from '../pages/support-hub';
import AccountHealthPage from '../pages/AccountHealthPage';
import VenueHealthPage from '../pages/VenueHealthPage';
import CheckoutPage from '../pages/CheckoutPage';
import ExplorePage from '../pages/ExplorePage';
import PreviousPodsPage from '../pages/PreviousPodsPage';
import HappeningNearbyPage from '../pages/HappeningNearbyPage';
import CreatePodPage from '../pages/create-pod-page';
import EarnPage from '../pages/earn-page';
import ProductsManagePage from '../pages/products-manage-page';
import SavedItemsPage from '../pages/SavedItemsPage';
import ClubsPage from '../pages/ClubsPage';
import ChatsPage from '../pages/ChatsPage';
import ChatRoomPage from '../pages/ChatRoomPage';
import { RedirectIfAuthed, RequireAuth } from './AuthGuards';

interface Props {
  superCategory: string;
  locationId: string;
  zoneName: string;
}

const withAuth = (element: JSX.Element) => <RequireAuth>{element}</RequireAuth>;
const redirectIfAuthed = (element: JSX.Element) => <RedirectIfAuthed>{element}</RedirectIfAuthed>;

function PartnerRedirect({ path }: { path: string }) {
  useEffect(() => {
    window.location.replace(`https://partners-app.duncit.com${path}`);
  }, [path]);
  return null;
}

export default function AppRoutes({ superCategory, locationId, zoneName }: Readonly<Props>) {
  return (
    <Routes>
      <Route
        path="/"
        element={withAuth(
          <HomePage superCategorySlug={superCategory} locationId={locationId} zoneName={zoneName} />
        )}
      />
      <Route path="/profile" element={withAuth(<ProfilePage />)} />
      <Route path="/follow" element={withAuth(<FollowPage superCategorySlug={superCategory} />)} />
      <Route path="/account" element={withAuth(<AccountPage />)} />
      <Route path="/club/:clubSlug" element={withAuth(<ClubDetailsPage />)} />
      <Route path="/venue/:venueId" element={<VenueDetailsPage />} />
      <Route
        path="/club/:clubSlug/pod/:podSlug"
        element={withAuth(<PodDetailsPage />)}
      />
      <Route path="/u/:userId" element={withAuth(<PublicProfilePage />)} />
      <Route path="/become-host" element={<PartnerRedirect path="/become-host" />} />
      <Route path="/register-venue" element={<PartnerRedirect path="/register-venue" />} />
      <Route path="/survey/:kind" element={withAuth(<SurveyGatePage />)} />
      <Route path="/hosts-venues" element={withAuth(<HostsVenuesPage />)} />
      <Route path="/host/dashboard" element={withAuth(<HostDashboardPage />)} />
      <Route path="/verification" element={withAuth(<VerificationPage />)} />
      <Route path="/host/manage" element={withAuth(<HostManagePage />)} />
      <Route path="/host/wallet" element={withAuth(<WalletPage />)} />
      <Route path="/create-pod" element={withAuth(<CreatePodPage />)} />
      <Route path="/create-pod/:draftId" element={withAuth(<CreatePodPage />)} />
      <Route path="/earn" element={withAuth(<EarnPage />)} />
      <Route path="/products/manage" element={withAuth(<ProductsManagePage />)} />
      <Route path="/venues/manage" element={withAuth(<VenueManagePage />)} />
      <Route path="/faqs" element={withAuth(<FaqsPage />)} />
      <Route path="/policies/:slug" element={withAuth(<PolicyPage />)} />
      <Route path="/pod-ideas" element={withAuth(<PodIdeasPage />)} />
      <Route path="/referral" element={withAuth(<ReferralPage />)} />
      <Route path="/pod-plans" element={withAuth(<PodPlansPage />)} />
      <Route path="/pod-history" element={withAuth(<PodHistoryPage />)} />
      <Route path="/pod-history/:membershipId" element={withAuth(<PodHistoryDetailsPage />)} />
      <Route path="/support" element={withAuth(<SupportHubPage />)} />
      <Route path="/support/sos" element={withAuth(<SosPage />)} />
      <Route path="/support/callback" element={withAuth(<CallbackPage />)} />
      <Route path="/support/tickets" element={withAuth(<SupportTicketsPage />)} />
      <Route path="/support/live" element={withAuth(<LiveTicketsPage />)} />
      <Route path="/support/all" element={withAuth(<AllTicketsPage />)} />
      <Route path="/tickets/:id" element={withAuth(<TicketDetailPage />)} />
      <Route path="/live-chat" element={withAuth(<SupportChatPage />)} />
      <Route path="/tickets" element={<Navigate to="/support/live" replace />} />
      <Route path="/bouncers" element={<Navigate to="/support" replace />} />
      <Route path="/account/health" element={withAuth(<AccountHealthPage />)} />
      <Route path="/venues/:venueId/health" element={withAuth(<VenueHealthPage />)} />
      <Route path="/signup-survey" element={withAuth(<SignupSurveyPage />)} />
      <Route path="/signup-whatsapp" element={withAuth(<SignupWhatsappPage />)} />
      <Route path="/checkout" element={withAuth(<CheckoutPage />)} />
      <Route path="/checkout/:podId" element={withAuth(<CheckoutPage />)} />
      <Route path="/explore" element={withAuth(<ExplorePage superCategorySlug={superCategory} locationId={locationId} zoneName={zoneName} />)} />
      <Route path="/previous-pods" element={withAuth(<PreviousPodsPage superCategorySlug={superCategory} locationId={locationId} zoneName={zoneName} />)} />
      <Route path="/happening-nearby" element={withAuth(<HappeningNearbyPage superCategorySlug={superCategory} locationId={locationId} zoneName={zoneName} />)} />
      <Route path="/saved" element={withAuth(<SavedItemsPage />)} />
      <Route path="/clubs" element={withAuth(<ClubsPage superCategorySlug={superCategory} />)} />
      <Route path="/chats" element={withAuth(<ChatsPage superCategorySlug={superCategory} />)} />
      <Route path="/chats/:id" element={withAuth(<ChatRoomPage />)} />
      <Route path="/register" element={redirectIfAuthed(<RegisterPage />)} />
      <Route path="/login" element={redirectIfAuthed(<LoginPage />)} />
      <Route path="/forgot-password" element={redirectIfAuthed(<ForgotPasswordPage />)} />
      <Route path="/reset-password" element={redirectIfAuthed(<ResetPasswordPage />)} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}