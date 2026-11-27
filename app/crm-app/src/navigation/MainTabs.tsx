import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';

import { useTranslation } from '@/hooks/useTranslation';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { LeadsScreen } from '@/screens/leads/LeadsScreen';
import { DialerScreen } from '@/screens/dialer/DialerScreen';
import { RemindersScreen } from '@/screens/reminders/RemindersScreen';
import { MoreScreen } from '@/screens/more/MoreScreen';
import { useConsoleChrome } from './chrome';
import { HeaderBrand } from './HeaderBrand';
import { screenLayout } from './screenLayout';
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
 */
export function MainTabs() {
  const { t } = useTranslation();
  const chrome = useConsoleChrome();
  return (
    <Tab.Navigator
      screenLayout={screenLayout}
      screenOptions={({ route }) => ({
        title: t(LABEL_KEYS[route.name]),
        ...chrome.tabsHeader,
        ...chrome.tabBar,
        headerTitle: ({ children }) => <HeaderBrand title={children} />,
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name={ICONS[route.name]} color={color} size={size} />
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
