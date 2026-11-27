import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/hooks/useTranslation';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { LeadsScreen } from '@/screens/leads/LeadsScreen';
import { DialerScreen } from '@/screens/dialer/DialerScreen';
import { RemindersScreen } from '@/screens/reminders/RemindersScreen';
import { MoreScreen } from '@/screens/more/MoreScreen';
import { haptics } from '@/services/haptics';
import { TAB_BAR_HEIGHT, TAB_BAR_PADDING, useConsoleChrome } from './chrome';
import { HeaderBrand } from './HeaderBrand';
import { screenLayout } from './screenLayout';
import { TabIcon } from './TabIcon';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, keyof typeof MaterialIcons.glyphMap> = {
  Home: 'dashboard',
  Leads: 'groups',
  Dialer: 'dialpad',
  Reminders: 'event',
  More: 'more-horiz',
};

const LABEL_KEYS: Record<keyof TabParamList, string> = {
  Home: 'crmApp.tabs.home',
  Leads: 'crmApp.tabs.leads',
  Dialer: 'crmApp.tabs.dialer',
  Reminders: 'crmApp.tabs.reminders',
  More: 'crmApp.tabs.more',
};

/**
 * The five tabs: Home, Leads, Dialer (in the middle, where a thumb rests),
 * Reminders and More. Each tab keeps its own place (scroll, filters) while
 * another is open; More holds every other page, so no screen needs a side menu.
 * The bar is sized from the real system-bar inset, so its labels never sit on
 * the gesture handle or the 3-button navigation bar.
 */
export function MainTabs() {
  const { t } = useTranslation();
  const chrome = useConsoleChrome();
  const { bottom } = useSafeAreaInsets();
  const tabBarStyle = {
    ...chrome.tabBar.tabBarStyle,
    height: TAB_BAR_HEIGHT + bottom,
    paddingTop: TAB_BAR_PADDING,
    paddingBottom: bottom + TAB_BAR_PADDING,
  };
  return (
    <Tab.Navigator
      screenLayout={screenLayout}
      screenListeners={{ tabPress: () => haptics.tap() }}
      screenOptions={({ route }) => ({
        title: t(LABEL_KEYS[route.name]),
        ...chrome.tabsHeader,
        ...chrome.tabBar,
        tabBarStyle,
        headerTitle: ({ children }) => <HeaderBrand title={children} />,
        tabBarIcon: ({ color, focused }) => (
          <TabIcon
            name={ICONS[route.name]}
            color={color}
            focused={focused}
            indicator={chrome.tabIndicator}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Leads" component={LeadsScreen} />
      <Tab.Screen name="Dialer" component={DialerScreen} />
      <Tab.Screen name="Reminders" component={RemindersScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}
