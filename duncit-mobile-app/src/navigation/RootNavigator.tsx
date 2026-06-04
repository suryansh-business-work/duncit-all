import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MainTabs } from '@/navigation/MainTabs';
import { BecomeHostScreen } from '@/screens/BecomeHostScreen';
import { ChatRoomScreen } from '@/screens/ChatRoomScreen';
import { ClubDetailsScreen } from '@/screens/ClubDetailsScreen';
import { FaqsScreen } from '@/screens/FaqsScreen';
import { HostManageScreen } from '@/screens/HostManageScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { PodDetailsScreen } from '@/screens/PodDetailsScreen';
import { PodHistoryScreen } from '@/screens/PodHistoryScreen';
import { PodIdeasScreen } from '@/screens/PodIdeasScreen';
import { PodPlansScreen } from '@/screens/PodPlansScreen';
import { PoliciesScreen } from '@/screens/PoliciesScreen';
import { PolicyScreen } from '@/screens/PolicyScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { RegisterVenueScreen } from '@/screens/RegisterVenueScreen';
import { SavedScreen } from '@/screens/SavedScreen';
import { SignupScreen } from '@/screens/SignupScreen';
import { SupportScreen } from '@/screens/SupportScreen';
import { SupportTicketsScreen } from '@/screens/SupportTicketsScreen';
import { SurveyScreen } from '@/screens/SurveyScreen';
import { VenueManageScreen } from '@/screens/VenueManageScreen';
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
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!token ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      ) : !surveyCompleted ? (
        <Stack.Screen name="Survey" component={SurveyScreen} />
      ) : (
        <>
          <Stack.Screen name="Home" component={MainTabs} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Saved" component={SavedScreen} />
          <Stack.Screen name="PodHistory" component={PodHistoryScreen} />
          <Stack.Screen name="BecomeHost" component={BecomeHostScreen} />
          <Stack.Screen name="HostManage" component={HostManageScreen} />
          <Stack.Screen name="RegisterVenue" component={RegisterVenueScreen} />
          <Stack.Screen name="VenueManage" component={VenueManageScreen} />
          <Stack.Screen name="Support" component={SupportScreen} />
          <Stack.Screen name="PodIdeas" component={PodIdeasScreen} />
          <Stack.Screen name="Faqs" component={FaqsScreen} />
          <Stack.Screen name="PodPlans" component={PodPlansScreen} />
          <Stack.Screen name="Policies" component={PoliciesScreen} />
          <Stack.Screen name="SupportTickets" component={SupportTicketsScreen} />
          <Stack.Screen name="Policy" component={PolicyScreen} />
          <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
          <Stack.Screen name="PodDetails" component={PodDetailsScreen} />
          <Stack.Screen name="ClubDetails" component={ClubDetailsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
