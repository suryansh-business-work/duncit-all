import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MainTabs } from '@/navigation/MainTabs';
import { AccountScreen } from '@/screens/AccountScreen';
import { AccountHealthScreen } from '@/screens/AccountHealthScreen';
import { VenueHealthScreen } from '@/screens/VenueHealthScreen';
import { BecomeHostScreen } from '@/screens/BecomeHostScreen';
import { ChatRoomScreen } from '@/screens/ChatRoomScreen';
import { ClubDetailsScreen } from '@/screens/ClubDetailsScreen';
import { HappeningNearbyScreen } from '@/screens/HappeningNearbyScreen';
import { HostsVenuesScreen } from '@/screens/HostsVenuesScreen';
import { PublicProfileScreen } from '@/screens/PublicProfileScreen';
import { VenueDetailsScreen } from '@/screens/VenueDetailsScreen';
import { CheckoutScreen } from '@/screens/CheckoutScreen';
import { CreatePodScreen } from '@/screens/CreatePodScreen';
import { FaqsScreen } from '@/screens/FaqsScreen';
import { HostManageScreen } from '@/screens/HostManageScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@/screens/ResetPasswordScreen';
import { NotFoundScreen } from '@/screens/NotFoundScreen';
import { PodDetailsScreen } from '@/screens/PodDetailsScreen';
import { PreviousPodsScreen } from '@/screens/PreviousPodsScreen';
import { PodHistoryScreen } from '@/screens/PodHistoryScreen';
import { PodHistoryDetailsScreen } from '@/screens/PodHistoryDetailsScreen';
import { PodIdeasScreen } from '@/screens/PodIdeasScreen';
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
import { AllSupportTicketsScreen } from '@/screens/AllSupportTicketsScreen';
import { TicketDetailsScreen } from '@/screens/TicketDetailsScreen';
import { SupportTicketsScreen } from '@/screens/SupportTicketsScreen';
import { SurveyScreen } from '@/screens/SurveyScreen';
import { VenueManageScreen } from '@/screens/VenueManageScreen';
import { EarnScreen } from '@/screens/EarnScreen';
import { ProductsManageScreen } from '@/screens/ProductsManageScreen';
import { ProductsVerificationScreen } from '@/screens/ProductsVerificationScreen';
import { useAuthStore } from '@/stores/auth.store';
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

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        // Premium screen transitions: pushes slide in from the right (pops
        // reverse automatically), driven natively at 60fps.
        animation: 'slide_from_right',
        animationDuration: 300,
      }}
    >
      {!token ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </>
      ) : !surveyCompleted ? (
        <Stack.Screen name="Survey" component={SurveyScreen} />
      ) : (
        <>
          <Stack.Screen name="Home" component={MainTabs} />
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Account" component={AccountScreen} />
          <Stack.Screen name="AccountHealth" component={AccountHealthScreen} />
          <Stack.Screen name="VenueHealth" component={VenueHealthScreen} />
          <Stack.Screen name="Saved" component={SavedScreen} />
          <Stack.Screen name="PodHistory" component={PodHistoryScreen} />
          <Stack.Screen name="PodHistoryDetails" component={PodHistoryDetailsScreen} />
          <Stack.Screen name="BecomeHost" component={BecomeHostScreen} />
          <Stack.Screen name="HostManage" component={HostManageScreen} />
          <Stack.Screen name="CreatePod" component={CreatePodScreen} />
          <Stack.Screen name="RegisterVenue" component={RegisterVenueScreen} />
          <Stack.Screen name="VenueManage" component={VenueManageScreen} />
          <Stack.Screen name="Earn" component={EarnScreen} />
          <Stack.Screen name="ProductsManage" component={ProductsManageScreen} />
          <Stack.Screen name="ProductsVerification" component={ProductsVerificationScreen} />
          <Stack.Screen name="Support" component={SupportScreen} />
          <Stack.Screen name="Sos" component={SosScreen} />
          <Stack.Screen name="Callback" component={CallbackScreen} />
          <Stack.Screen name="ChatWithUs" component={ChatWithUsScreen} />
          <Stack.Screen name="AllSupportTickets" component={AllSupportTicketsScreen} />
          <Stack.Screen name="TicketDetails" component={TicketDetailsScreen} />
          <Stack.Screen name="PodIdeas" component={PodIdeasScreen} />
          <Stack.Screen name="PreviousPods" component={PreviousPodsScreen} />
          <Stack.Screen name="HappeningNearby" component={HappeningNearbyScreen} />
          <Stack.Screen name="Faqs" component={FaqsScreen} />
          <Stack.Screen name="PodPlans" component={PodPlansScreen} />
          <Stack.Screen name="Policies" component={PoliciesScreen} />
          <Stack.Screen name="SupportTickets" component={SupportTicketsScreen} />
          <Stack.Screen name="Policy" component={PolicyScreen} />
          <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
          <Stack.Screen name="PodDetails" component={PodDetailsScreen} />
          <Stack.Screen name="ClubDetails" component={ClubDetailsScreen} />
          <Stack.Screen name="HostsVenues" component={HostsVenuesScreen} />
          <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
          <Stack.Screen name="VenueDetails" component={VenueDetailsScreen} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen name="NotFound" component={NotFoundScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
