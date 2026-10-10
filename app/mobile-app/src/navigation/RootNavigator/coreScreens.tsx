import { AccountHealthScreen } from '@/screens/AccountHealthScreen';
import { AccountScreen } from '@/screens/AccountScreen';
import { AllSupportTicketsScreen } from '@/screens/AllSupportTicketsScreen';
import { BeClubAdminScreen } from '@/screens/BeClubAdminScreen';
import { BecomeHostScreen } from '@/screens/BecomeHostScreen';
import { BookingScreen } from '@/screens/BookingScreen';
import { CallbackScreen } from '@/screens/CallbackScreen';
import { ChangeRequestsScreen } from '@/screens/ChangeRequestsScreen';
import { ChatWithUsScreen } from '@/screens/ChatWithUsScreen';
import { ClubAdminDashboardScreen } from '@/screens/ClubAdminDashboardScreen';
import { ClubAutoPodsScreen } from '@/screens/ClubAutoPodsScreen';
import { ClubEditScreen } from '@/screens/ClubEditScreen';
import { ClubManageScreen } from '@/screens/ClubManageScreen';
import { ClubPodDetailsScreen } from '@/screens/ClubPodDetailsScreen';
import { ClubPodEditorScreen } from '@/screens/ClubPodEditorScreen';
import { ClubPodMonitoringScreen } from '@/screens/ClubPodMonitoringScreen';
import { ClubPodsScreen } from '@/screens/ClubPodsScreen';
import { CommPreferenceScreen } from '@/screens/CommPreferenceScreen';
import { ContactsScreen } from '@/screens/ContactsScreen';
import { CreatePodScreen } from '@/screens/CreatePodScreen';
import { EarnScreen } from '@/screens/EarnScreen';
import { FeedbackScreen } from '@/screens/FeedbackScreen';
import { GrievanceScreen } from '@/screens/GrievanceScreen';
import { HostApplyScreen } from '@/screens/HostApplyScreen';
import { HostAutoPodsScreen } from '@/screens/HostAutoPodsScreen';
import { HostDashboardScreen } from '@/screens/HostDashboardScreen';
import { HostManageScreen } from '@/screens/HostManageScreen';
import { LiveChatScreen } from '@/screens/LiveChatScreen';
import { MailPreferenceScreen } from '@/screens/MailPreferenceScreen';
import { NearbyHostsScreen } from '@/screens/NearbyHostsScreen';
import { NearbyVenuesScreen } from '@/screens/NearbyVenuesScreen';
import { HostPodRequestsScreen, VenuePodRequestsScreen } from '@/screens/PodRequestsScreen';
import { PodRequestDetailScreen } from '@/screens/PodRequestDetailScreen';
import { PrivacyScreen } from '@/screens/PrivacyScreen';
import { MainTabs } from '@/navigation/MainTabs';
import { MenuScreen } from '@/screens/MenuScreen';
import { PodAttendanceScreen } from '@/screens/PodAttendanceScreen';
import { HostPodChallengesScreen } from '@/screens/HostPodChallengesScreen';
import { ChallengeArenaScreen } from '@/screens/ChallengeArenaScreen';
import { PodHistoryDetailsScreen } from '@/screens/PodHistoryDetailsScreen';
import { PodHistoryScreen } from '@/screens/PodHistoryScreen';
import { PodMediaScreen } from '@/screens/PodMediaScreen';
import { PodPendingScreen } from '@/screens/PodPendingScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { RegisterVenueScreen } from '@/screens/RegisterVenueScreen';
import { SavedScreen } from '@/screens/SavedScreen';
import { SearchScreen } from '@/screens/SearchScreen';
import { SmsPreferenceScreen } from '@/screens/SmsPreferenceScreen';
import { SosScreen } from '@/screens/SosScreen';
import { SupportScreen } from '@/screens/SupportScreen';
import { TicketDetailsScreen } from '@/screens/TicketDetailsScreen';
import { VenueAutoPodsScreen } from '@/screens/VenueAutoPodsScreen';
import { VenueAvailabilityScreen } from '@/screens/VenueAvailabilityScreen';
import { VenueEarningsScreen } from '@/screens/VenueEarningsScreen';
import { VenueHealthScreen } from '@/screens/VenueHealthScreen';
import { VenueManageScreen } from '@/screens/VenueManageScreen';
import { VenueSettingsScreen } from '@/screens/VenueSettingsScreen';
import { VenueSlotRequestsScreen } from '@/screens/VenueSlotRequestsScreen';
import { VerificationScreen } from '@/screens/VerificationScreen';
import { WalletScreen } from '@/screens/WalletScreen';
import { WhatsAppPreferenceScreen } from '@/screens/WhatsAppPreferenceScreen';
import { BrandOrderDetailScreen } from '@/screens/BrandOrderDetailScreen';
import { BrandOrdersScreen } from '@/screens/BrandOrdersScreen';
import { BrandWarehousesScreen } from '@/screens/BrandWarehousesScreen';
import { ListProductScreen } from '@/screens/ListProductScreen';
import { ProductsManageScreen } from '@/screens/ProductsManageScreen';
import { HostPublishScreen, VenuePublishScreen } from '@/screens/PublishPageScreens';
import {
  BrandOptionsScreen,
  ClubOptionsScreen,
  HostOptionsScreen,
  VenueOptionsScreen,
} from '@/screens/StudioOptionsScreen';
import { VenueListScreen } from '@/screens/VenueListScreen';
import { VenuePodsScreen } from '@/screens/VenuePodsScreen';
import { withProductGate } from '@/navigation/withProductGate';
import { Stack } from './stack';

/** Product screens behind the one system flag, built at module scope (S6478). */
const GatedListProductScreen = withProductGate(ListProductScreen);
const GatedProductsManageScreen = withProductGate(ProductsManageScreen);
const GatedBrandOptionsScreen = withProductGate(BrandOptionsScreen);
const GatedBrandOrdersScreen = withProductGate(BrandOrdersScreen);
const GatedBrandOrderDetailScreen = withProductGate(BrandOrderDetailScreen);
const GatedBrandWarehousesScreen = withProductGate(BrandWarehousesScreen);

/** First half of the signed-in app stack — Home, account, studio and support routes. */
export function renderCoreScreens() {
  return (
    <>
      <Stack.Screen name="Home" component={MainTabs} />
      <Stack.Screen name="Menu" component={MenuScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="AccountHealth" component={AccountHealthScreen} />
      <Stack.Screen name="CommPreference" component={CommPreferenceScreen} />
      <Stack.Screen name="MailPreference" component={MailPreferenceScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
      <Stack.Screen name="WhatsAppPreference" component={WhatsAppPreferenceScreen} />
      <Stack.Screen name="SmsPreference" component={SmsPreferenceScreen} />
      <Stack.Screen name="VenueHealth" component={VenueHealthScreen} />
      <Stack.Screen name="Saved" component={SavedScreen} />
      <Stack.Screen name="Contacts" component={ContactsScreen} />
      <Stack.Screen name="PodHistory" component={PodHistoryScreen} />
      <Stack.Screen name="PodHistoryDetails" component={PodHistoryDetailsScreen} />
      <Stack.Screen name="Booking" component={BookingScreen} />
      <Stack.Screen name="BecomeHost" component={BecomeHostScreen} />
      <Stack.Screen name="HostManage" component={HostManageScreen} />
      <Stack.Screen name="PodAttendance" component={PodAttendanceScreen} />
      <Stack.Screen name="HostPodChallenges" component={HostPodChallengesScreen} />
      <Stack.Screen name="ChallengeArena" component={ChallengeArenaScreen} />
      <Stack.Screen name="PodMedia" component={PodMediaScreen} />
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
      <Stack.Screen name="ChangeRequests" component={ChangeRequestsScreen} />
      <Stack.Screen name="VenueAvailability" component={VenueAvailabilityScreen} />
      <Stack.Screen name="VenueSettings" component={VenueSettingsScreen} />
      <Stack.Screen name="NearbyHosts" component={NearbyHostsScreen} />
      <Stack.Screen name="NearbyVenues" component={NearbyVenuesScreen} />
      <Stack.Screen name="HostPodRequests" component={HostPodRequestsScreen} />
      <Stack.Screen name="VenuePodRequests" component={VenuePodRequestsScreen} />
      <Stack.Screen name="PodRequestDetail" component={PodRequestDetailScreen} />
      <Stack.Screen name="VenueAutoPods" component={VenueAutoPodsScreen} />
      <Stack.Screen name="HostAutoPods" component={HostAutoPodsScreen} />
      <Stack.Screen name="ClubAutoPods" component={ClubAutoPodsScreen} />
      <Stack.Screen name="Earn" component={EarnScreen} />
      <Stack.Screen name="ListProduct" component={GatedListProductScreen} />
      <Stack.Screen name="BeClubAdmin" component={BeClubAdminScreen} />
      <Stack.Screen name="ClubManage" component={ClubManageScreen} />
      <Stack.Screen name="ClubAdminDashboard" component={ClubAdminDashboardScreen} />
      <Stack.Screen name="ClubPodMonitoring" component={ClubPodMonitoringScreen} />
      <Stack.Screen name="ClubPods" component={ClubPodsScreen} />
      <Stack.Screen name="ClubPodEditor" component={ClubPodEditorScreen} />
      <Stack.Screen name="ClubPodEdit" component={ClubPodEditorScreen} />
      <Stack.Screen name="ClubPodDetails" component={ClubPodDetailsScreen} />
      <Stack.Screen name="ClubEdit" component={ClubEditScreen} />
      <Stack.Screen name="ProductsManage" component={GatedProductsManageScreen} />
      <Stack.Screen name="VenueOptions" component={VenueOptionsScreen} />
      <Stack.Screen name="HostOptions" component={HostOptionsScreen} />
      <Stack.Screen name="ClubOptions" component={ClubOptionsScreen} />
      <Stack.Screen name="BrandOptions" component={GatedBrandOptionsScreen} />
      <Stack.Screen name="VenueList" component={VenueListScreen} />
      <Stack.Screen name="VenuePublish" component={VenuePublishScreen} />
      <Stack.Screen name="HostPublish" component={HostPublishScreen} />
      <Stack.Screen name="VenuePods" component={VenuePodsScreen} />
      <Stack.Screen name="BrandOrders" component={GatedBrandOrdersScreen} />
      <Stack.Screen name="BrandOrderDetail" component={GatedBrandOrderDetailScreen} />
      <Stack.Screen name="BrandWarehouses" component={GatedBrandWarehousesScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="Sos" component={SosScreen} />
      <Stack.Screen name="Callback" component={CallbackScreen} />
      <Stack.Screen name="ChatWithUs" component={ChatWithUsScreen} />
      <Stack.Screen name="LiveChat" component={LiveChatScreen} />
      <Stack.Screen name="AllSupportTickets" component={AllSupportTicketsScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
      <Stack.Screen name="Grievance" component={GrievanceScreen} />
      <Stack.Screen name="TicketDetails" component={TicketDetailsScreen} />
    </>
  );
}
