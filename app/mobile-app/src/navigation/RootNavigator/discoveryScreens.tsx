import { AddressBookScreen } from '@/screens/AddressBookScreen';
import { BadgesScreen } from '@/screens/BadgesScreen';
import { ChatRoomScreen } from '@/screens/ChatRoomScreen';
import { ChatsScreen } from '@/screens/ChatsScreen';
import { CheckoutScreen } from '@/screens/CheckoutScreen';
import { CityLaunchScreen } from '@/screens/CityLaunchScreen';
import { ClubDetailsScreen } from '@/screens/ClubDetailsScreen';
import { DuncitCoinScreen } from '@/screens/DuncitCoinScreen';
import { FaqsScreen } from '@/screens/FaqsScreen';
import { FollowListScreen } from '@/screens/FollowListScreen';
import { FollowingScreen } from '@/screens/FollowingScreen';
import { GiftCardCheckoutScreen } from '@/screens/GiftCardCheckoutScreen';
import { GiftCardClaimScreen } from '@/screens/GiftCardClaimScreen';
import { GiftCardRedeemScreen } from '@/screens/GiftCardRedeemScreen';
import { GiftCardsScreen } from '@/screens/GiftCardsScreen';
import { HappeningNearbyScreen } from '@/screens/HappeningNearbyScreen';
import { HostsVenuesScreen } from '@/screens/HostsVenuesScreen';
import { LeaderboardScreen } from '@/screens/LeaderboardScreen';
import { MembershipScreen } from '@/screens/MembershipScreen';
import { NotFoundScreen } from '@/screens/NotFoundScreen';
import { PodDetailsScreen } from '@/screens/PodDetailsScreen';
import { PodFeedbackScreen } from '@/screens/PodFeedbackScreen';
import { PodIdeasScreen } from '@/screens/PodIdeasScreen';
import { PodPlansScreen } from '@/screens/PodPlansScreen';
import { PoliciesScreen } from '@/screens/PoliciesScreen';
import { PolicyScreen } from '@/screens/PolicyScreen';
import { PostDetailScreen } from '@/screens/PostDetailScreen';
import { PreviousPodsScreen } from '@/screens/PreviousPodsScreen';
import { PublicProfileScreen } from '@/screens/PublicProfileScreen';
import { ReferralScreen } from '@/screens/ReferralScreen';
import { SupportTicketsScreen } from '@/screens/SupportTicketsScreen';
import { TourGuideScreen } from '@/screens/TourGuideScreen';
import { VenueDetailsScreen } from '@/screens/VenueDetailsScreen';
import { OrdersHistoryScreen } from '@/screens/OrdersHistoryScreen';
import { ProductCheckoutScreen } from '@/screens/ProductCheckoutScreen';
import { ProductDetailScreen } from '@/screens/ProductDetailScreen';
import { ShopScreen } from '@/screens/ShopScreen';
import { withProductGate } from '@/navigation/withProductGate';
import { Stack } from './stack';

/** Product screens behind the one system flag, built at module scope (S6478). */
const GatedOrdersHistoryScreen = withProductGate(OrdersHistoryScreen);
const GatedProductCheckoutScreen = withProductGate(ProductCheckoutScreen);
const GatedProductDetailScreen = withProductGate(ProductDetailScreen);
const GatedShopScreen = withProductGate(ShopScreen);

/** Second half of the signed-in app stack — discovery, details, shop and gift routes. */
export function renderDiscoveryScreens() {
  return (
    <>
      <Stack.Screen name="PodIdeas" component={PodIdeasScreen} />
      <Stack.Screen name="Referral" component={ReferralScreen} />
      <Stack.Screen name="DuncitCoin" component={DuncitCoinScreen} />
      <Stack.Screen name="PreviousPods" component={PreviousPodsScreen} />
      <Stack.Screen name="HappeningNearby" component={HappeningNearbyScreen} />
      <Stack.Screen name="Faqs" component={FaqsScreen} />
      <Stack.Screen name="Badges" component={BadgesScreen} />
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
      {/* Both were bottom tabs; the account menu's grid pushes them now. */}
      <Stack.Screen name="Chats" component={ChatsScreen} />
      <Stack.Screen name="Following" component={FollowingScreen} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="Follow" component={FollowListScreen} />
      <Stack.Screen name="VenueDetails" component={VenueDetailsScreen} />
      <Stack.Screen name="CityLaunch" component={CityLaunchScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="ProductCheckout" component={GatedProductCheckoutScreen} />
      <Stack.Screen name="Shop" component={GatedShopScreen} />
      <Stack.Screen name="ProductDetail" component={GatedProductDetailScreen} />
      <Stack.Screen name="OrdersHistory" component={GatedOrdersHistoryScreen} />
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
}
