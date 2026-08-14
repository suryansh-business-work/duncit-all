import { useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MainTabs } from '@/navigation/MainTabs';
import { BookingScreen } from '@/screens/BookingScreen';
import { AccountScreen } from '@/screens/AccountScreen';
import { AccountHealthScreen } from '@/screens/AccountHealthScreen';
import { MailPreferenceScreen } from '@/screens/MailPreferenceScreen';
import { WhatsAppPreferenceScreen } from '@/screens/WhatsAppPreferenceScreen';
import { VenueHealthScreen } from '@/screens/VenueHealthScreen';
import { BecomeHostScreen } from '@/screens/BecomeHostScreen';
import { ChatRoomScreen } from '@/screens/ChatRoomScreen';
import { ClubDetailsScreen } from '@/screens/ClubDetailsScreen';
import { HappeningNearbyScreen } from '@/screens/HappeningNearbyScreen';
import { HostsVenuesScreen } from '@/screens/HostsVenuesScreen';
import { VenuesScreen } from '@/screens/VenuesScreen';
import { PublicProfileScreen } from '@/screens/PublicProfileScreen';
import { PostDetailScreen } from '@/screens/PostDetailScreen';
import { FollowListScreen } from '@/screens/FollowListScreen';
import { VenueDetailsScreen } from '@/screens/VenueDetailsScreen';
import { AddressBookScreen } from '@/screens/AddressBookScreen';
import { CartScreen } from '@/screens/CartScreen';
import { OrdersHistoryScreen } from '@/screens/OrdersHistoryScreen';
import { LeaderboardScreen } from '@/screens/LeaderboardScreen';
import { MembershipScreen } from '@/screens/MembershipScreen';
import { GiftCardsScreen } from '@/screens/GiftCardsScreen';
import { GiftCardCheckoutScreen } from '@/screens/GiftCardCheckoutScreen';
import { GiftCardRedeemScreen } from '@/screens/GiftCardRedeemScreen';
import { GiftCardClaimScreen } from '@/screens/GiftCardClaimScreen';
import { ProductDetailScreen } from '@/screens/ProductDetailScreen';
import { ShopScreen } from '@/screens/ShopScreen';
import { CheckoutScreen } from '@/screens/CheckoutScreen';
import { ProductCheckoutScreen } from '@/screens/ProductCheckoutScreen';
import { CreatePodScreen } from '@/screens/CreatePodScreen';
import { PodPendingScreen } from '@/screens/PodPendingScreen';
import { FaqsScreen } from '@/screens/FaqsScreen';
import { TourGuideScreen } from '@/screens/TourGuideScreen';
import { HostManageScreen } from '@/screens/HostManageScreen';
import { HostApplyScreen } from '@/screens/HostApplyScreen';
import { HostDashboardScreen } from '@/screens/HostDashboardScreen';
import { VerificationScreen } from '@/screens/VerificationScreen';
import { WalletScreen } from '@/screens/WalletScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@/screens/ResetPasswordScreen';
import { NotFoundScreen } from '@/screens/NotFoundScreen';
import { PodDetailsScreen } from '@/screens/PodDetailsScreen';
import { PodFeedbackScreen } from '@/screens/PodFeedbackScreen';
import { PreviousPodsScreen } from '@/screens/PreviousPodsScreen';
import { PodHistoryScreen } from '@/screens/PodHistoryScreen';
import { PodHistoryDetailsScreen } from '@/screens/PodHistoryDetailsScreen';
import { PodIdeasScreen } from '@/screens/PodIdeasScreen';
import { ReferralScreen } from '@/screens/ReferralScreen';
import { ReferralPromptScreen } from '@/screens/ReferralPromptScreen';
import { DuncitCoinScreen } from '@/screens/DuncitCoinScreen';
import { PodPlansScreen } from '@/screens/PodPlansScreen';
import { PoliciesScreen } from '@/screens/PoliciesScreen';
import { PolicyScreen } from '@/screens/PolicyScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { RegisterVenueScreen } from '@/screens/RegisterVenueScreen';
import { SavedScreen } from '@/screens/SavedScreen';
import { SearchScreen } from '@/screens/SearchScreen';
import { SignupScreen } from '@/screens/SignupScreen';
import { SupportScreen } from '@/screens/SupportScreen';
import { SosScreen } from '@/screens/SosScreen';
import { CallbackScreen } from '@/screens/CallbackScreen';
import { ChatWithUsScreen } from '@/screens/ChatWithUsScreen';
import { LiveChatScreen } from '@/screens/LiveChatScreen';
import { AllSupportTicketsScreen } from '@/screens/AllSupportTicketsScreen';
import { FeedbackScreen } from '@/screens/FeedbackScreen';
import { GrievanceScreen } from '@/screens/GrievanceScreen';
import { TicketDetailsScreen } from '@/screens/TicketDetailsScreen';
import { SupportTicketsScreen } from '@/screens/SupportTicketsScreen';
import { SurveyScreen } from '@/screens/SurveyScreen';
import { VenueManageScreen } from '@/screens/VenueManageScreen';
import { VenueEarningsScreen } from '@/screens/VenueEarningsScreen';
import { VenueSlotRequestsScreen } from '@/screens/VenueSlotRequestsScreen';
import { EarnScreen } from '@/screens/EarnScreen';
import { MenuScreen } from '@/screens/MenuScreen';
import { ListProductScreen } from '@/screens/ListProductScreen';
import { BeClubAdminScreen } from '@/screens/BeClubAdminScreen';
import { ClubManageScreen } from '@/screens/ClubManageScreen';
import { ProductsManageScreen } from '@/screens/ProductsManageScreen';
import { useAuthStore } from '@/stores/auth.store';
import { reportJourneyStep } from '@/services/short-link-attribution';
import { consumePendingBooking } from './pendingBooking';
import { navigationRef } from './navigationRef';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Single stack gated by the auth store — the React Navigation replacement for
 * mWeb's AuthGuards / the old expo-router protected routes:
 *   no token  → auth group (Login/Signup)
 *   token + survey pending → survey only
 *   token + survey done → the app (Home + account-menu destinations)
 * Swapping the rendered screen set is React Navigation's documented auth pattern.
 */
export function RootNavigator() {
  const token = useAuthStore((s) => s.token);
  const surveyCompleted = useAuthStore((s) => s.surveyCompleted);
  const referralPromptPending = useAuthStore((s) => s.referralPromptPending);
  // Short-link journey: a session binds the click to the account, and the
  // survey flag flipping true IS the survey being finished. Both are no-ops
  // for the vast majority who never followed a link, and the server keeps a
  // step's first timestamp, so repeats never move anything.
  const prevSurveyCompleted = useRef(surveyCompleted);
  useEffect(() => {
    if (token) reportJourneyStep('SIGNED_UP');
  }, [token]);
  useEffect(() => {
    if (token && surveyCompleted && !prevSurveyCompleted.current) {
      reportJourneyStep('SURVEY_DONE');
    }
    prevSurveyCompleted.current = surveyCompleted;
  }, [token, surveyCompleted]);

  // Replay a booking deep link that arrived while signed out (linking.ts parked
  // it and routed to Login) — the native twin of mWeb's `?redirect` return.
  //
  // Readiness is checked BEFORE consuming. consume() clears the parked id, so
  // doing it first threw the link away whenever the navigator was not ready on
  // the render where token/surveyCompleted flipped — and these deps never fire
  // again, so the deep link was lost for good. Cold start then log in was
  // exactly that path.
  useEffect(() => {
    if (!token || !surveyCompleted || !navigationRef.isReady()) return;
    const bookingId = consumePendingBooking();
    if (bookingId) {
      navigationRef.navigate('Booking', { bookingId });
    }
  }, [token, surveyCompleted]);

  const appScreens = (
    <>
      <Stack.Screen name="Home" component={MainTabs} />
      <Stack.Screen name="Menu" component={MenuScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="AccountHealth" component={AccountHealthScreen} />
      <Stack.Screen name="MailPreference" component={MailPreferenceScreen} />
      <Stack.Screen name="WhatsAppPreference" component={WhatsAppPreferenceScreen} />
      <Stack.Screen name="VenueHealth" component={VenueHealthScreen} />
      <Stack.Screen name="Saved" component={SavedScreen} />
      <Stack.Screen name="PodHistory" component={PodHistoryScreen} />
      <Stack.Screen name="PodHistoryDetails" component={PodHistoryDetailsScreen} />
      <Stack.Screen name="Booking" component={BookingScreen} />
      <Stack.Screen name="BecomeHost" component={BecomeHostScreen} />
      <Stack.Screen name="HostManage" component={HostManageScreen} />
      <Stack.Screen name="HostApply" component={HostApplyScreen} />
      <Stack.Screen name="HostDashboard" component={HostDashboardScreen} />
      <Stack.Screen name="Verification" component={VerificationScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="CreatePod" component={CreatePodScreen} />
      <Stack.Screen name="PodPending" component={PodPendingScreen} />
      <Stack.Screen name="RegisterVenue" component={RegisterVenueScreen} />
      <Stack.Screen name="VenueManage" component={VenueManageScreen} />
      <Stack.Screen name="VenueEarnings" component={VenueEarningsScreen} />
      <Stack.Screen name="VenueSlotRequests" component={VenueSlotRequestsScreen} />
      <Stack.Screen name="Earn" component={EarnScreen} />
      <Stack.Screen name="ListProduct" component={ListProductScreen} />
      <Stack.Screen name="BeClubAdmin" component={BeClubAdminScreen} />
      <Stack.Screen name="ClubManage" component={ClubManageScreen} />
      <Stack.Screen name="ProductsManage" component={ProductsManageScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="Sos" component={SosScreen} />
      <Stack.Screen name="Callback" component={CallbackScreen} />
      <Stack.Screen name="ChatWithUs" component={ChatWithUsScreen} />
      <Stack.Screen name="LiveChat" component={LiveChatScreen} />
      <Stack.Screen name="AllSupportTickets" component={AllSupportTicketsScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
      <Stack.Screen name="Grievance" component={GrievanceScreen} />
      <Stack.Screen name="TicketDetails" component={TicketDetailsScreen} />
      <Stack.Screen name="PodIdeas" component={PodIdeasScreen} />
      <Stack.Screen name="Referral" component={ReferralScreen} />
      <Stack.Screen name="DuncitCoin" component={DuncitCoinScreen} />
      <Stack.Screen name="PreviousPods" component={PreviousPodsScreen} />
      <Stack.Screen name="HappeningNearby" component={HappeningNearbyScreen} />
      <Stack.Screen name="Faqs" component={FaqsScreen} />
      <Stack.Screen name="TourGuide" component={TourGuideScreen} />
      <Stack.Screen name="PodPlans" component={PodPlansScreen} />
      <Stack.Screen name="Policies" component={PoliciesScreen} />
      <Stack.Screen name="SupportTickets" component={SupportTicketsScreen} />
      <Stack.Screen name="Policy" component={PolicyScreen} />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
      <Stack.Screen name="PodDetails" component={PodDetailsScreen} />
      <Stack.Screen name="PodFeedback" component={PodFeedbackScreen} />
      <Stack.Screen name="ClubDetails" component={ClubDetailsScreen} />
      <Stack.Screen name="HostsVenues" component={HostsVenuesScreen} />
      <Stack.Screen name="Venues" component={VenuesScreen} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="Follow" component={FollowListScreen} />
      <Stack.Screen name="VenueDetails" component={VenueDetailsScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="ProductCheckout" component={ProductCheckoutScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Shop" component={ShopScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="OrdersHistory" component={OrdersHistoryScreen} />
      <Stack.Screen name="AddressBook" component={AddressBookScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="Membership" component={MembershipScreen} />
      <Stack.Screen name="GiftCards" component={GiftCardsScreen} />
      <Stack.Screen name="GiftCardCheckout" component={GiftCardCheckoutScreen} />
      <Stack.Screen name="GiftCardRedeem" component={GiftCardRedeemScreen} />
      <Stack.Screen name="GiftCardClaim" component={GiftCardClaimScreen} />
      <Stack.Screen name="NotFound" component={NotFoundScreen} />
    </>
  );

  /*
    Three post-token states, not two. The referral step comes FIRST because it
    is the last thing the signup itself owes the user — asked after the survey
    it would read as an unrelated interruption, and asked not at all it can
    never be asked again (Refer & Earn no longer takes a code).
  */
  let signedInScreens;
  if (referralPromptPending) {
    signedInScreens = <Stack.Screen name="ReferralPrompt" component={ReferralPromptScreen} />;
  } else if (surveyCompleted) {
    signedInScreens = appScreens;
  } else {
    signedInScreens = <Stack.Screen name="Survey" component={SurveyScreen} />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        // Transitions disabled: animating a whole screen (with its full-bleed
        // backdrop) frame-by-frame janked navigation, so pushes/pops are instant.
        animation: 'none',
      }}
    >
      {token ? (
        signedInScreens
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
