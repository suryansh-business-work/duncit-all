import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';

import { useTranslation } from '@/hooks/useTranslation';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { LeadsScreen } from '@/screens/leads/LeadsScreen';
import { DialerScreen } from '@/screens/dialer/DialerScreen';
import { RemindersScreen } from '@/screens/reminders/RemindersScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { useConsoleChrome } from './chrome';
import { MenuButton } from './MenuButton';
import { screenLayout } from './screenLayout';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, keyof typeof MaterialIcons.glyphMap> = {
  Home: 'dashboard',
  Leads: 'groups',
  Dialer: 'dialpad',
  Reminders: 'event',
  Settings: 'settings',
};

const LABEL_KEYS: Record<keyof TabParamList, string> = {
  Home: 'crmApp.tabs.home',
  Leads: 'crmApp.tabs.leads',
  Dialer: 'crmApp.tabs.dialer',
  Reminders: 'crmApp.tabs.reminders',
  Settings: 'crmApp.tabs.settings',
};

/** The five tabs: Home, Leads, Dialer (in the middle, where a thumb rests), Reminders, Settings. */
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
        headerLeft: () => <MenuButton tint={chrome.ink} />,
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name={ICONS[route.name]} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Leads" component={LeadsScreen} />
      <Tab.Screen name="Dialer" component={DialerScreen} />
      <Tab.Screen name="Reminders" component={RemindersScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
