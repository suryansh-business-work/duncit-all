import type { ReactNode } from 'react';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { BottomNav } from '@/components/BottomNav';
import { ScreenRefreshProvider } from '@/components/PullToRefresh';
import { DeletionNoticeDialog } from '@/components/account/DeletionNoticeDialog';
import { PodFeedbackPrompt } from '@/components/support/PodFeedbackPrompt';
import { usePushNotificationDeepLink } from '@/hooks/usePushNotificationDeepLink';
import { useProductVisibility } from '@/hooks/useProductVisibility';
import { CartScreen } from '@/screens/CartScreen';
import { ClubsScreen } from '@/screens/ClubsScreen';
import { ExploreScreen } from '@/screens/ExploreScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { VenuesScreen } from '@/screens/VenuesScreen';
import type { TabParamList } from '@/navigation/tabs';

const Tab = createBottomTabNavigator<TabParamList>();

const renderTabBar = (props: BottomTabBarProps) => <BottomNav {...props} />;

/** Each tab is its own pull-to-refresh scope, exactly like a pushed screen —
 * the tabs stay mounted behind one another, so a shared scope would refetch
 * four tabs on every pull. */
const screenLayout = ({ children }: Readonly<{ children: ReactNode }>) => (
  <ScreenRefreshProvider>{children}</ScreenRefreshProvider>
);

export function MainTabs() {
  usePushNotificationDeepLink();
  // With products off there is nothing to buy, so the cart is not an empty page
  // to keep a fifth of the bar for — the screen is not registered at all and the
  // remaining four tabs, each `flex: 1`, spread across the whole width.
  const { visible: productsVisible } = useProductVisibility();
  return (
    <>
      <Tab.Navigator
        screenOptions={{ headerShown: false, animation: 'none' }}
        screenLayout={screenLayout}
        tabBar={renderTabBar}
      >
        <Tab.Screen name="HomeTab" component={HomeScreen} />
        <Tab.Screen name="Explore" component={ExploreScreen} />
        <Tab.Screen name="Clubs" component={ClubsScreen} />
        <Tab.Screen name="Venues" component={VenuesScreen} />
        {productsVisible ? <Tab.Screen name="Cart" component={CartScreen} /> : null}
      </Tab.Navigator>
      <PodFeedbackPrompt />
      <DeletionNoticeDialog />
    </>
  );
}
