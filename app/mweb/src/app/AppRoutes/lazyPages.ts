import { lazy } from 'react';

// Route-level code splitting: every page is loaded on demand so the initial
// bundle stays small (first paint downloads only the shell + the landing route)
// instead of shipping all ~50 pages — and their heavy deps (react-quill, slick,
// lottie) — up front. Each page becomes its own cacheable chunk.
export const HomePage = lazy(() => import('../../pages/HomePage'));
export const NotFoundPage = lazy(() => import('../../pages/NotFoundPage'));
export const RegisterPage = lazy(() => import('../../pages/RegisterPage'));
export const LoginPage = lazy(() => import('../../pages/LoginPage'));
export const ForgotPasswordPage = lazy(() => import('../../pages/ForgotPasswordPage'));
export const SignupSurveyPage = lazy(() => import('../../pages/SignupSurveyPage'));
export const SignupReferralPage = lazy(() => import('../../pages/signup-referral-page'));
export const AccountPage = lazy(() => import('../../pages/AccountPage'));
export const ProfilePage = lazy(() => import('../../pages/ProfilePage'));
export const PostPage = lazy(() => import('../../pages/PostPage'));
export const FollowPage = lazy(() => import('../../pages/FollowPage'));
export const PublicProfilePage = lazy(() => import('../../pages/PublicProfilePage'));
export const PodDetailsPage = lazy(() => import('../../pages/PodDetailsPage'));
export const PodFeedbackPage = lazy(() => import('../../pages/pod-feedback-page'));
export const PodMediaPage = lazy(() => import('../../pages/pod-media-page'));
export const ClubDetailsPage = lazy(() => import('../../pages/ClubDetailsPage'));
export const HostsVenuesPage = lazy(() => import('../../pages/HostsVenuesPage'));
export const SurveyGatePage = lazy(() => import('../../pages/survey-gate'));
export const HostManagePage = lazy(() => import('../../pages/HostManagePage'));
export const PodAttendancePage = lazy(() => import('../../pages/pod-attendance-page'));
export const HostApplyPage = lazy(() => import('../../pages/host-apply-page'));
export const HostDashboardPage = lazy(() => import('../../pages/host-dashboard-page'));
export const VerificationPage = lazy(() => import('../../pages/verification-page'));
export const WalletPage = lazy(() => import('../../pages/wallet-page'));
export const VenueManagePage = lazy(() => import('../../pages/VenueManagePage'));
export const VenueEarningsPage = lazy(() => import('../../pages/venue-earnings-page'));
export const VenueSlotRequestsPage = lazy(() => import('../../pages/venue-slot-requests-page'));
export const ChangeRequestsPage = lazy(() => import('../../pages/change-requests-page'));
export const VenueAvailabilityPage = lazy(() => import('../../pages/venue-availability-page'));
export const VenueSettingsPage = lazy(() => import('../../pages/venue-settings-page'));
export const VenueDetailsPage = lazy(() => import('../../pages/VenueDetailsPage'));
export const VenuesPage = lazy(() => import('../../pages/venues-page'));
export const FaqsPage = lazy(() => import('../../pages/FaqsPage'));
export const BadgesPage = lazy(() => import('../../pages/badges-page'));
export const PolicyPage = lazy(() => import('../../pages/PolicyPage'));
export const PodIdeasPage = lazy(() => import('../../pages/PodIdeasPage'));
export const ReferralPage = lazy(() => import('../../pages/referral-page'));
export const DuncitCoinPage = lazy(() => import('../../pages/duncit-coin-page'));
export const LeaderboardPage = lazy(() => import('../../pages/leaderboard-page'));
export const MembershipPage = lazy(() => import('../../pages/membership-page'));
export const GiftCardsPage = lazy(() => import('../../pages/gift-cards-page'));
export const GiftCardCheckoutPage = lazy(() => import('../../pages/gift-card-checkout-page'));
export const GiftCardRedeemPage = lazy(() => import('../../pages/gift-card-redeem-page'));
export const GiftCardClaimPage = lazy(() => import('../../pages/gift-card-claim-page'));
export const PodPlansPage = lazy(() => import('../../pages/PodPlansPage'));
export const PodHistoryPage = lazy(() => import('../../pages/PodHistoryPage'));
export const PodHistoryDetailsPage = lazy(() => import('../../pages/PodHistoryDetailsPage'));
export const TicketDetailPage = lazy(() => import('../../pages/support-tickets/TicketDetailPage'));
export const SupportChatPage = lazy(() => import('../../pages/support-chat/SupportChatPage'));
export const SupportHubPage = lazy(() =>
  import('../../pages/support-hub').then((m) => ({ default: m.SupportHubPage })),
);
export const SosPage = lazy(() => import('../../pages/support-hub').then((m) => ({ default: m.SosPage })));
export const CallbackPage = lazy(() =>
  import('../../pages/support-hub').then((m) => ({ default: m.CallbackPage })),
);
export const SupportTicketsPage = lazy(() =>
  import('../../pages/support-hub').then((m) => ({ default: m.SupportTicketsPage })),
);
export const LiveTicketsPage = lazy(() =>
  import('../../pages/support-hub').then((m) => ({ default: m.LiveTicketsPage })),
);
export const AllTicketsPage = lazy(() =>
  import('../../pages/support-hub').then((m) => ({ default: m.AllTicketsPage })),
);
export const FeedbackPage = lazy(() =>
  import('../../pages/support-hub').then((m) => ({ default: m.FeedbackPage })),
);
export const GrievancePage = lazy(() =>
  import('../../pages/support-hub').then((m) => ({ default: m.GrievancePage })),
);
export const CommPreferencePage = lazy(() => import('../../pages/comm-preference-page'));
export const MailPreferencePage = lazy(() => import('../../pages/mail-preference-page'));
export const WhatsAppPreferencePage = lazy(() => import('../../pages/whatsapp-preference-page'));
export const SmsPreferencePage = lazy(() => import('../../pages/sms-preference-page'));
export const PrivacyPage = lazy(() => import('../../pages/privacy-page'));
export const AccountHealthPage = lazy(() => import('../../pages/AccountHealthPage'));
export const VenueHealthPage = lazy(() => import('../../pages/VenueHealthPage'));
export const CheckoutPage = lazy(() => import('../../pages/CheckoutPage'));
export const ProductCheckoutPage = lazy(() => import('../../pages/product-checkout-page'));
export const CartPage = lazy(() => import('../../pages/CartPage'));
export const ShopPage = lazy(() => import('../../pages/shop-page'));
export const ProductDetailPage = lazy(() => import('../../pages/ProductDetailPage'));
export const OrdersHistoryPage = lazy(() => import('../../pages/OrdersHistoryPage'));
export const AddressBookPage = lazy(() => import('../../pages/AddressBookPage'));
export const ExplorePage = lazy(() => import('../../pages/ExplorePage'));
export const SearchPage = lazy(() => import('../../pages/search-page'));
export const PreviousPodsPage = lazy(() => import('../../pages/PreviousPodsPage'));
export const HappeningNearbyPage = lazy(() => import('../../pages/HappeningNearbyPage'));
export const CityLaunchPage = lazy(() => import('../../pages/city-launch-page'));
export const CreatePodPage = lazy(() => import('../../pages/create-pod-page'));
export const PodPendingPage = lazy(() => import('../../pages/pod-pending-page'));
export const BookingPage = lazy(() => import('../../pages/booking-page'));
export const EarnPage = lazy(() => import('../../pages/earn-page'));
export const TourGuidePage = lazy(() => import('../../pages/tour-guide-page'));
export const ProductsManagePage = lazy(() => import('../../pages/products-manage-page'));
export const SavedItemsPage = lazy(() => import('../../pages/SavedItemsPage'));
export const ContactsPage = lazy(() => import('../../pages/contacts-page'));
export const ClubsPage = lazy(() => import('../../pages/ClubsPage'));
export const ClubStudioPage = lazy(() => import('../../pages/club-studio'));
export const ClubAdminDashboardPage = lazy(() => import('../../pages/club-admin-dashboard-page'));
export const ClubMonitoringPage = lazy(() => import('../../pages/club-monitoring-page'));
export const ClubPodsPage = lazy(() => import('../../pages/club-pods-page'));
export const ClubPodEditorPage = lazy(() => import('../../pages/club-pod-editor-page'));
export const ClubPodDetailsPage = lazy(() => import('../../pages/club-pod-details-page'));
export const ClubAutoPodEditorPage = lazy(() => import('../../pages/club-auto-pod-editor-page'));
export const ClubEditPage = lazy(() => import('../../pages/club-edit-page'));
export const ChatsPage = lazy(() => import('../../pages/ChatsPage'));
export const ChatRoomPage = lazy(() => import('../../pages/ChatRoomPage'));
export const MenuPage = lazy(() => import('../../pages/menu-page'));
export const VenueAutoPodsPage = lazy(() => import('../../pages/venue-auto-pods-page'));
export const HostAutoPodsPage = lazy(() => import('../../pages/host-auto-pods-page'));
export const ClubAutoPodsPage = lazy(() => import('../../pages/club-auto-pods-page'));
