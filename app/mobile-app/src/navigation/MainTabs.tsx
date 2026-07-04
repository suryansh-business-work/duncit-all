import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { BottomNav } from '@/components/BottomNav';
import { PodFeedbackPrompt } from '@/components/support/PodFeedbackPrompt';
import { usePushNotificationDeepLink } from '@/hooks/usePushNotificationDeepLink';
import { ChatsScreen } from '@/screens/ChatsScreen';
import { ClubsScreen } from '@/screens/ClubsScreen';
import { ExploreScreen } from '@/screens/ExploreScreen';
import { FollowingScreen } from '@/screens/FollowingScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import type { TabParamList } from '@/navigation/tabs';

const Tab = createBottomTabNavigator<TabParamList>();

const renderTabBar = (props: BottomTabBarProps) => <BottomNav {...props} />;

/** The signed-in app's bottom-tab shell — Home + the four mWeb tabs, rendered
 * with the floating custom {@link BottomNav}. Account-menu destinations stay
 * stack screens pushed on top of this (see RootNavigator). */
export function MainTabs() {
  // Tapping a native push (e.g. a post-activity notification) deep-links here.
  usePushNotificationDeepLink();
  return (
    <>
      <Tab.Navigator
        // Tab switches are instant (no cross-fade) — animating a tab's full-bleed
        // backdrop janked the switch.
        screenOptions={{ headerShown: false, animation: 'none' }}
        tabBar={renderTabBar}
      >
        <Tab.Screen name="HomeTab" component={HomeScreen} />
        <Tab.Screen name="Explore" component={ExploreScreen} />
        <Tab.Screen name="Clubs" component={ClubsScreen} />
        <Tab.Screen name="Chats" component={ChatsScreen} />
        <Tab.Screen name="Following" component={FollowingScreen} />
      </Tab.Navigator>
      <PodFeedbackPrompt />
    </>
  );
}
