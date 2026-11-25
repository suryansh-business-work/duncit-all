import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import { useThemeName } from 'tamagui';
import type { ConsoleMode } from '@duncit/theme/mode-colors';

import { RADII } from '@/constants/design';
import { crmTheme } from '../../tamagui.config';

/**
 * The navigation chrome: the Duncit CRM red app bar (white title and icons —
 * white on the red fill clears 4.5:1 in both modes), and a tab bar on the
 * surface colour whose current tab sits in a soft red pill. The active tab's
 * colour is checked against that pill, not just the bar (see chrome.test).
 */
export function consoleChrome(mode: ConsoleMode) {
  const t = crmTheme(mode);
  const header = {
    headerStyle: { backgroundColor: t.primary },
    headerTintColor: t.onPrimary,
    headerTitleStyle: { fontWeight: '700' as const, color: t.onPrimary },
  };
  return {
    /** Native-stack screens: their header takes a background colour only. */
    stackHeader: { ...header, headerShadowVisible: false },
    /** The tabs' header: the same red bar, flat. */
    tabsHeader: {
      ...header,
      headerStyle: { ...header.headerStyle, elevation: 0, shadowOpacity: 0, borderBottomWidth: 0 },
    },
    tabBar: {
      tabBarActiveTintColor: activeTabInk(mode),
      tabBarInactiveTintColor: t.muted,
      tabBarActiveBackgroundColor: t.primarySoft,
      tabBarLabelStyle: { fontWeight: '600' as const },
      tabBarItemStyle: { borderRadius: RADII.lg, marginHorizontal: 4, marginVertical: 4 },
      tabBarStyle: {
        backgroundColor: t.surface,
        borderTopColor: t.borderColor,
        borderTopWidth: 1,
      },
    },
  };
}

/**
 * The current tab's icon and label colour: the theme's colour for content on
 * the soft red pill behind it (the accent text colour falls under 4.5:1 there).
 */
export function activeTabInk(mode: ConsoleMode): string {
  return crmTheme(mode).onPrimarySoft;
}

/**
 * React Navigation's own theme in the mode's colours. Without it the navigator
 * paints its light default page behind every screen, so a dark screen showed a
 * light ground around its cards.
 */
export function navigationTheme(mode: ConsoleMode): NavigationTheme {
  const t = crmTheme(mode);
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      primary: t.accentText,
      background: t.background,
      card: t.surface,
      text: t.color,
      border: t.borderColor,
      notification: t.danger,
    },
  };
}

const CHROME = { light: consoleChrome('light'), dark: consoleChrome('dark') };

/** The chrome for the theme the navigator renders in. */
export function useConsoleChrome() {
  return CHROME[String(useThemeName()).startsWith('dark') ? 'dark' : 'light'];
}
