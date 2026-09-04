import { JSX, Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { Box, CircularProgress } from '@mui/material';
import { useProductVisibility } from '@duncit/app-settings';
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
const SignupSurveyPage = lazy(() => import('../pages/SignupSurveyPage'));
const SignupWhatsappPage = lazy(() => import('../pages/SignupWhatsappPage'));
const SignupReferralPage = lazy(() => import('../pages/signup-referral-page'));
const AccountPage = lazy(() => import('../pages/AccountPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const PostPage = lazy(() => import('../pages/PostPage'));
const FollowPage = lazy(() => import('../pages/FollowPage'));
const PublicProfilePage = lazy(() => import('../pages/PublicProfilePage'));
const PodDetailsPage = lazy(() => import('../pages/PodDetailsPage'));
const PodFeedbackPage = lazy(() => import('../pages/pod-feedback-page'));
const PodMediaPage = lazy(() => import('../pages/pod-media-page'));
const ClubDetailsPage = lazy(() => import('../pages/ClubDetailsPage'));
const HostsVenuesPage = lazy(() => import('../pages/HostsVenuesPage'));
const SurveyGatePage = lazy(() => import('../pages/survey-gate'));
const HostManagePage = lazy(() => import('../pages/HostManagePage'));
const PodAttendancePage = lazy(() => import('../pages/pod-attendance-page'));
const HostApplyPage = lazy(() => import('../pages/host-apply-page'));
const HostDashboardPage = lazy(() => import('../pages/host-dashboard-page'));
const VerificationPage = lazy(() => import('../pages/verification-page'));
const WalletPage = lazy(() => import('../pages/wallet-page'));
const VenueManagePage = lazy(() => import('../pages/VenueManagePage'));
const VenueEarningsPage = lazy(() => import('../pages/venue-earnings-page'));
const VenueSlotRequestsPage = lazy(() => import('../pages/venue-slot-requests-page'));
const ChangeRequestsPage = lazy(() => import('../pages/change-requests-page'));
const VenueAvailabilityPage = lazy(() => import('../pages/venue-availability-page'));
const VenueSettingsPage = lazy(() => import('../pages/venue-settings-page'));
const VenueDetailsPage = lazy(() => import('../pages/VenueDetailsPage'));
const VenuesPage = lazy(() => import('../pages/venues-page'));
const FaqsPage = lazy(() => import('../pages/FaqsPage'));
const BadgesPage = lazy(() => import('../pages/badges-page'));
const PolicyPage = lazy(() => import('../pages/PolicyPage'));
const PodIdeasPage = lazy(() => import('../pages/PodIdeasPage'));
const ReferralPage = lazy(() => import('../pages/referral-page'));
const DuncitCoinPage = lazy(() => import('../pages/duncit-coin-page'));
const LeaderboardPage = lazy(() => import('../pages/leaderboard-page'));
const MembershipPage = lazy(() => import('../pages/membership-page'));
const GiftCardsPage = lazy(() => import('../pages/gift-cards-page'));
const GiftCardCheckoutPage = lazy(() => import('../pages/gift-card-checkout-page'));
const GiftCardRedeemPage = lazy(() => import('../pages/gift-card-redeem-page'));
const GiftCardClaimPage = lazy(() => import('../pages/gift-card-claim-page'));
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
const FeedbackPage = lazy(() =>
  import('../pages/support-hub').then((m) => ({ default: m.FeedbackPage })),
);
const GrievancePage = lazy(() =>
  import('../pages/support-hub').then((m) => ({ default: m.GrievancePage })),
);
const CommPreferencePage = lazy(() => import('../pages/comm-preference-page'));
const MailPreferencePage = lazy(() => import('../pages/mail-preference-page'));
const WhatsAppPreferencePage = lazy(() => import('../pages/whatsapp-preference-page'));
const SmsPreferencePage = lazy(() => import('../pages/sms-preference-page'));
const AccountHealthPage = lazy(() => import('../pages/AccountHealthPage'));
const VenueHealthPage = lazy(() => import('../pages/VenueHealthPage'));
const CheckoutPage = lazy(() => import('../pages/CheckoutPage'));
const ProductCheckoutPage = lazy(() => import('../pages/product-checkout-page'));
const CartPage = lazy(() => import('../pages/CartPage'));
const ShopPage = lazy(() => import('../pages/shop-page'));
const ProductDetailPage = lazy(() => import('../pages/ProductDetailPage'));
const OrdersHistoryPage = lazy(() => import('../pages/OrdersHistoryPage'));
const AddressBookPage = lazy(() => import('../pages/AddressBookPage'));
const ExplorePage = lazy(() => import('../pages/ExplorePage'));
const SearchPage = lazy(() => import('../pages/search-page'));
const PreviousPodsPage = lazy(() => import('../pages/PreviousPodsPage'));
const HappeningNearbyPage = lazy(() => import('../pages/HappeningNearbyPage'));
const CreatePodPage = lazy(() => import('../pages/create-pod-page'));
const PodPendingPage = lazy(() => import('../pages/pod-pending-page'));
const BookingPage = lazy(() => import('../pages/booking-page'));
const EarnPage = lazy(() => import('../pages/earn-page'));
const TourGuidePage = lazy(() => import('../pages/tour-guide-page'));
const ProductsManagePage = lazy(() => import('../pages/products-manage-page'));
const SavedItemsPage = lazy(() => import('../pages/SavedItemsPage'));
const ClubsPage = lazy(() => import('../pages/ClubsPage'));
const ClubStudioPage = lazy(() => import('../pages/club-studio'));
const ClubAdminDashboardPage = lazy(() => import('../pages/club-admin-dashboard-page'));
const ClubMonitoringPage = lazy(() => import('../pages/club-monitoring-page'));
const ClubPodsPage = lazy(() => import('../pages/club-pods-page'));
const ClubPodEditorPage = lazy(() => import('../pages/club-pod-editor-page'));
const ClubPodDetailsPage = lazy(() => import('../pages/club-pod-details-page'));
const ClubEditPage = lazy(() => import('../pages/club-edit-page'));
const ChatsPage = lazy(() => import('../pages/ChatsPage'));
const ChatRoomPage = lazy(() => import('../pages/ChatRoomPage'));
const MenuPage = lazy(() => import('../pages/menu-page'));
const VenueAutoPodsPage = lazy(() => import('../pages/venue-auto-pods-page'));
const HostAutoPodsPage = lazy(() => import('../pages/host-auto-pods-page'));
const ClubAutoPodsPage = lazy(() => import('../pages/club-auto-pods-page'));

interface Props {
  superCategory: string;
  locationId: string;
  zoneName: string;
}

const withAuth = (element: JSX.Element) => <RequireAuth>{element}</RequireAuth>;
const redirectIfAuthed = (element: JSX.Element) => <RedirectIfAuthed>{element}</RedirectIfAuthed>;

function PartnerRedirect({ path }: Readonly<{ path: string }>) {
  useEffect(() => {
    globalThis.window.location.replace(`https://partners-app.duncit.com${path}`);
  }, [path]);
  return null;
}

const routeFallback = (
  <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '40dvh' }}>
    <CircularProgress />
  </Box>
);

/**
 * Product routes exist only while the `is_product_visible` system flag is on.
 * With it off they are not 404s — they are pages the app currently has no
 * feature for — so they send the visitor home instead of to Not Found.
 *
 * It waits on `pending`: the flag set arrives a beat after the first paint, and
 * redirecting on that beat would bounce every bookmarked /shop link home even
 * when products are switched on.
 */
function RequireProducts({ children }: Readonly<{ children: JSX.Element }>) {
  const { pending, visible } = useProductVisibility();
  if (pending) return routeFallback;
  if (!visible) return <Navigate to="/" replace />;
  return children;
}

/** Signed-in AND products on — every product page needs both. */
const withProducts = (element: JSX.Element) => withAuth(<RequireProducts>{element}</RequireProducts>);


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
        {/* The account menu is a page, not a drawer — Back/refresh just work. */}
        <Route path="/menu" element={withAuth(<MenuPage />)} />
        <Route path="/profile" element={withAuth(<ProfilePage />)} />
        <Route path="/post/:postId" element={withAuth(<PostPage />)} />
        <Route path="/follow" element={withAuth(<FollowPage superCategorySlug={superCategory} />)} />
        <Route path="/account" element={withAuth(<AccountPage />)} />
        <Route path="/club/:clubSlug" element={withAuth(<ClubDetailsPage />)} />
        <Route path="/venue/:venueId" element={<VenueDetailsPage />} />
        <Route path="/venues" element={withAuth(<VenuesPage locationId={locationId} />)} />
        <Route path="/club/:clubSlug/pod/:podSlug" element={withAuth(<PodDetailsPage />)} />
        {/* The rating link a host shares with their guests. Auth-gated like
            every other page, so an unread link parks in `?redirect` and opens
            straight after sign-in. */}
        <Route path="/pod/:podId/feedback" element={withAuth(<PodFeedbackPage />)} />
        {/* The link a host shares so the people who came can add their photos.
            Signed-in like the rating link: the server answers on who was
            marked present, which it can only do for someone it knows. */}
        <Route path="/pod/:podId/media" element={withAuth(<PodMediaPage />)} />
        <Route path="/u/:handle" element={withAuth(<PublicProfilePage />)} />
        <Route path="/become-host" element={<PartnerRedirect path="/become-host" />} />
        <Route path="/register-venue" element={<PartnerRedirect path="/register-venue" />} />
        <Route path="/survey/:kind" element={withAuth(<SurveyGatePage />)} />
        <Route path="/hosts-venues" element={withAuth(<HostsVenuesPage />)} />
        <Route path="/host/dashboard" element={withAuth(<HostDashboardPage />)} />
        <Route path="/verification" element={withAuth(<VerificationPage />)} />
        <Route path="/host/manage" element={withAuth(<HostManagePage />)} />
        <Route
          path="/host/pod/:podId/attendance"
          element={withAuth(<PodAttendancePage />)}
        />
        <Route path="/host/apply" element={withAuth(<HostApplyPage />)} />
        <Route path="/host/wallet" element={withAuth(<WalletPage />)} />
        <Route path="/create-pod" element={withAuth(<CreatePodPage />)} />
        <Route path="/create-pod/:draftId" element={withAuth(<CreatePodPage />)} />
        <Route path="/host/pod-pending/:podId" element={withAuth(<PodPendingPage />)} />
        <Route path="/earn" element={withAuth(<EarnPage />)} />
        <Route path="/tour-guide" element={withAuth(<TourGuidePage />)} />
        <Route path="/products/manage" element={withProducts(<ProductsManagePage />)} />
        <Route path="/venues/manage" element={withAuth(<VenueManagePage />)} />
        <Route path="/venues/earnings" element={withAuth(<VenueEarningsPage />)} />
        <Route path="/venues/slot-requests" element={withAuth(<VenueSlotRequestsPage />)} />
        {/* One route for all three roles: a person can be a venue owner AND a
            host, and it is where the offer email, the WhatsApp CTA and the
            notification all land. */}
        <Route path="/change-requests" element={withAuth(<ChangeRequestsPage />)} />
        <Route path="/venues/availability" element={withAuth(<VenueAvailabilityPage />)} />
        <Route path="/venues/settings" element={withAuth(<VenueSettingsPage />)} />
        {/* Club Studio. `/clubs/manage` and NOT `/club/manage`, which would sit
            under the `/club/:clubSlug` pattern and shadow a real club slug. */}
        <Route path="/clubs/manage" element={withAuth(<ClubStudioPage />)} />
        {/* The Club Admin's own pages — the Partners console's club-admin
            console, on the phone. `/clubs/...` for the same reason. */}
        <Route path="/clubs/dashboard" element={withAuth(<ClubAdminDashboardPage />)} />
        <Route path="/clubs/monitoring" element={withAuth(<ClubMonitoringPage />)} />
        <Route path="/clubs/:clubId/pods" element={withAuth(<ClubPodsPage />)} />
        <Route path="/clubs/:clubId/pods/new" element={withAuth(<ClubPodEditorPage />)} />
        <Route path="/clubs/:clubId/pods/:id/edit" element={withAuth(<ClubPodEditorPage />)} />
        <Route path="/clubs/:clubId/pods/:id" element={withAuth(<ClubPodDetailsPage />)} />
        <Route path="/clubs/:clubId/edit" element={withAuth(<ClubEditPage />)} />
        {/* Auto Pods — one queue per enrolment. Reached through the flag-gated
            drawer row, and `/clubs/...` for the same reason Club Studio is. */}
        <Route path="/venues/auto-pods" element={withAuth(<VenueAutoPodsPage locationId={locationId} />)} />
        <Route path="/host/auto-pods" element={withAuth(<HostAutoPodsPage locationId={locationId} />)} />
        <Route path="/clubs/auto-pods" element={withAuth(<ClubAutoPodsPage locationId={locationId} />)} />
        <Route path="/faqs" element={withAuth(<FaqsPage />)} />
        <Route path="/badges" element={withAuth(<BadgesPage />)} />
        <Route path="/policies/:slug" element={withAuth(<PolicyPage />)} />
        <Route path="/pod-ideas" element={withAuth(<PodIdeasPage />)} />
        <Route path="/referral" element={withAuth(<ReferralPage />)} />
        <Route path="/duncit-coin" element={withAuth(<DuncitCoinPage />)} />
        <Route path="/leaderboard" element={withAuth(<LeaderboardPage />)} />
        <Route path="/membership" element={withAuth(<MembershipPage />)} />
        <Route path="/gift-cards" element={withAuth(<GiftCardsPage />)} />
        <Route path="/gift-cards/checkout" element={withAuth(<GiftCardCheckoutPage />)} />
        <Route path="/gift-cards/redeem" element={withAuth(<GiftCardRedeemPage />)} />
        {/* The shared claim link — singular, like /club/:clubSlug. Auth-gated,
            so an unread link parks in `?redirect` and opens after sign-in. */}
        <Route path="/gift-card/:code" element={withAuth(<GiftCardClaimPage />)} />
        <Route path="/pod-plans" element={withAuth(<PodPlansPage />)} />
        <Route path="/pod-history" element={withAuth(<PodHistoryPage />)} />
        <Route path="/pod-history/:membershipId" element={withAuth(<PodHistoryDetailsPage />)} />
        {/* Booking deep link from the payment-receipt email — resolves the
            booking server-side and forwards to its pod detail page. */}
        <Route path="/booking/:bookingId" element={withAuth(<BookingPage />)} />
        <Route path="/support" element={withAuth(<SupportHubPage />)} />
        <Route path="/support/sos" element={withAuth(<SosPage />)} />
        <Route path="/support/callback" element={withAuth(<CallbackPage />)} />
        <Route path="/support/tickets" element={withAuth(<SupportTicketsPage />)} />
        <Route path="/support/live" element={withAuth(<LiveTicketsPage />)} />
        <Route path="/support/all" element={withAuth(<AllTicketsPage />)} />
        <Route path="/support/feedback" element={withAuth(<FeedbackPage />)} />
        <Route path="/support/grievance" element={withAuth(<GrievancePage />)} />
        <Route path="/tickets/:id" element={withAuth(<TicketDetailPage />)} />
        <Route path="/live-chat" element={withAuth(<SupportChatPage />)} />
        <Route path="/tickets" element={<Navigate to="/support/live" replace />} />
        {/* Native uses /support/chat for the same feature; keep the path working
            on mWeb instead of 404ing (route parity, BUG-02). */}
        <Route path="/support/chat" element={<Navigate to="/support/live" replace />} />
        <Route path="/bouncers" element={<Navigate to="/support" replace />} />
        <Route path="/account/health" element={withAuth(<AccountHealthPage />)} />
        {/* The one door to the three channels — Profile Settings links here,
            and each channel screen is a door off this one. */}
        <Route path="/account/communication" element={withAuth(<CommPreferencePage />)} />
        <Route path="/account/mail-preference" element={withAuth(<MailPreferencePage />)} />
        {/* The one-click door out of an email. NOT auth-gated: the person
            clicking it is reading their inbox, and the signature in the link is
            what proves whose preferences these are. */}
        <Route path="/unsubscribe" element={<MailPreferencePage fromLink />} />
        <Route
          path="/account/whatsapp-preference"
          element={withAuth(<WhatsAppPreferencePage />)}
        />
        <Route path="/account/sms-preference" element={withAuth(<SmsPreferencePage />)} />
        <Route path="/venues/:venueId/health" element={withAuth(<VenueHealthPage />)} />
        <Route path="/signup-survey" element={withAuth(<SignupSurveyPage />)} />
        <Route path="/signup-whatsapp" element={withAuth(<SignupWhatsappPage />)} />
        <Route path="/signup-referral" element={withAuth(<SignupReferralPage />)} />
        <Route path="/checkout" element={withAuth(<CheckoutPage />)} />
        <Route path="/checkout/:podId" element={withAuth(<CheckoutPage />)} />
        <Route path="/product-checkout" element={withProducts(<ProductCheckoutPage />)} />
        <Route path="/cart" element={withProducts(<CartPage />)} />
        <Route path="/shop" element={withProducts(<ShopPage />)} />
        <Route path="/product/:productId" element={withProducts(<ProductDetailPage />)} />
        <Route path="/orders" element={withProducts(<OrdersHistoryPage />)} />
        <Route path="/address-book" element={withAuth(<AddressBookPage />)} />
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
        <Route path="/search" element={withAuth(<SearchPage />)} />
        <Route path="/saved" element={withAuth(<SavedItemsPage />)} />
        <Route
          path="/clubs"
          element={withAuth(
            <ClubsPage superCategorySlug={superCategory} locationId={locationId} zoneName={zoneName} />,
          )}
        />
        <Route path="/chats" element={withAuth(<ChatsPage superCategorySlug={superCategory} />)} />
        <Route path="/chats/:id" element={withAuth(<ChatRoomPage />)} />
        <Route path="/register" element={redirectIfAuthed(<RegisterPage />)} />
        <Route path="/login" element={redirectIfAuthed(<LoginPage />)} />
        <Route path="/forgot-password" element={redirectIfAuthed(<ForgotPasswordPage />)} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
