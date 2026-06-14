import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { RedirectIfAuthed, RequireAuth } from './AuthGuards';

// Route-level code splitting: every page is loaded on demand so the initial
// bundle stays small (first paint downloads only the shell + the landing route)
// instead of shipping all ~50 pages — and their heavy deps (react-quill, slick,
// lottie) — up front. Each page becomes its own cacheable chunk.
const HomePage = lazy(() => import('../pages/HomePage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'));
const SignupSurveyPage = lazy(() => import('../pages/SignupSurveyPage'));
const SignupWhatsappPage = lazy(() => import('../pages/SignupWhatsappPage'));
const AccountPage = lazy(() => import('../pages/AccountPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const FollowPage = lazy(() => import('../pages/FollowPage'));
const PublicProfilePage = lazy(() => import('../pages/PublicProfilePage'));
const PodDetailsPage = lazy(() => import('../pages/PodDetailsPage'));
const ClubDetailsPage = lazy(() => import('../pages/ClubDetailsPage'));
const HostsVenuesPage = lazy(() => import('../pages/HostsVenuesPage'));
const SurveyGatePage = lazy(() => import('../pages/survey-gate'));
const HostManagePage = lazy(() => import('../pages/HostManagePage'));
const HostDashboardPage = lazy(() => import('../pages/host-dashboard-page'));
const VerificationPage = lazy(() => import('../pages/verification-page'));
const WalletPage = lazy(() => import('../pages/wallet-page'));
const VenueManagePage = lazy(() => import('../pages/VenueManagePage'));
const VenueDetailsPage = lazy(() => import('../pages/VenueDetailsPage'));
const FaqsPage = lazy(() => import('../pages/FaqsPage'));
const PolicyPage = lazy(() => import('../pages/PolicyPage'));
const PodIdeasPage = lazy(() => import('../pages/PodIdeasPage'));
const ReferralPage = lazy(() => import('../pages/ReferralPage'));
const PodPlansPage = lazy(() => import('../pages/PodPlansPage'));
const PodHistoryPage = lazy(() => import('../pages/PodHistoryPage'));
const PodHistoryDetailsPage = lazy(() => import('../pages/PodHistoryDetailsPage'));
const TicketDetailPage = lazy(() => import('../pages/support-tickets/TicketDetailPage'));
const SupportChatPage = lazy(() => import('../pages/support-chat/SupportChatPage'));
const SupportHubPage = lazy(() =>
  import('../pages/support-hub').then((m) => ({ default: m.SupportHubPage })),
);
const SosPage = lazy(() => import('../pages/support-hub').then((m) => ({ default: m.SosPage })));
const CallbackPage = lazy(() =>
  import('../pages/support-hub').then((m) => ({ default: m.CallbackPage })),
);
const SupportTicketsPage = lazy(() =>
  import('../pages/support-hub').then((m) => ({ default: m.SupportTicketsPage })),
);
const LiveTicketsPage = lazy(() =>
  import('../pages/support-hub').then((m) => ({ default: m.LiveTicketsPage })),
);
const AllTicketsPage = lazy(() =>
  import('../pages/support-hub').then((m) => ({ default: m.AllTicketsPage })),
);
const AccountHealthPage = lazy(() => import('../pages/AccountHealthPage'));
const VenueHealthPage = lazy(() => import('../pages/VenueHealthPage'));
const CheckoutPage = lazy(() => import('../pages/CheckoutPage'));
const ExplorePage = lazy(() => import('../pages/ExplorePage'));
const PreviousPodsPage = lazy(() => import('../pages/PreviousPodsPage'));
const HappeningNearbyPage = lazy(() => import('../pages/HappeningNearbyPage'));
const CreatePodPage = lazy(() => import('../pages/create-pod-page'));
const EarnPage = lazy(() => import('../pages/earn-page'));
const ProductsManagePage = lazy(() => import('../pages/products-manage-page'));
const SavedItemsPage = lazy(() => import('../pages/SavedItemsPage'));
const ClubsPage = lazy(() => import('../pages/ClubsPage'));
const ChatsPage = lazy(() => import('../pages/ChatsPage'));
const ChatRoomPage = lazy(() => import('../pages/ChatRoomPage'));

interface Props {
  superCategory: string;
  locationId: string;
  zoneName: string;
}

const withAuth = (element: JSX.Element) => <RequireAuth>{element}</RequireAuth>;
const redirectIfAuthed = (element: JSX.Element) => <RedirectIfAuthed>{element}</RedirectIfAuthed>;

function PartnerRedirect({ path }: Readonly<{ path: string }>) {
  useEffect(() => {
    window.location.replace(`https://partners-app.duncit.com${path}`);
  }, [path]);
  return null;
}

const routeFallback = (
  <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '40dvh' }}>
    <CircularProgress />
  </Box>
);

export default function AppRoutes({ superCategory, locationId, zoneName }: Readonly<Props>) {
  return (
    <Suspense fallback={routeFallback}>
      <Routes>
        <Route
          path="/"
          element={withAuth(
            <HomePage
              superCategorySlug={superCategory}
              locationId={locationId}
              zoneName={zoneName}
            />,
          )}
        />
        <Route path="/profile" element={withAuth(<ProfilePage />)} />
        <Route path="/follow" element={withAuth(<FollowPage superCategorySlug={superCategory} />)} />
        <Route path="/account" element={withAuth(<AccountPage />)} />
        <Route path="/club/:clubSlug" element={withAuth(<ClubDetailsPage />)} />
        <Route path="/venue/:venueId" element={<VenueDetailsPage />} />
        <Route path="/club/:clubSlug/pod/:podSlug" element={withAuth(<PodDetailsPage />)} />
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
        <Route
          path="/explore"
          element={withAuth(
            <ExplorePage
              superCategorySlug={superCategory}
              locationId={locationId}
              zoneName={zoneName}
            />,
          )}
        />
        <Route
          path="/previous-pods"
          element={withAuth(
            <PreviousPodsPage
              superCategorySlug={superCategory}
              locationId={locationId}
              zoneName={zoneName}
            />,
          )}
        />
        <Route
          path="/happening-nearby"
          element={withAuth(
            <HappeningNearbyPage
              superCategorySlug={superCategory}
              locationId={locationId}
              zoneName={zoneName}
            />,
          )}
        />
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
    </Suspense>
  );
}
