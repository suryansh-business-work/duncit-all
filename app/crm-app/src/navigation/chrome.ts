import { StyleSheet } from 'react-native';
import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import { useThemeName } from 'tamagui';
import type { ConsoleMode } from '@duncit/theme/mode-colors';

import { crmTheme } from '../../tamagui.config';

/**
 * The navigation chrome in the portal's look: the header is the portal's
 * AppBar (the surface colour, ink title, a hairline under it — never an accent
 * bar), and the tab bar is a surface with a hairline on top and the accent
 * marking the current tab.
 */
export function consoleChrome(mode: ConsoleMode) {
  const t = crmTheme(mode);
  return {
    /** Native-stack screens: their header takes a background colour only. */
    stackHeader: {
      headerStyle: { backgroundColor: t.surface },
      headerTintColor: t.color,
      headerTitleStyle: { fontWeight: '600' as const },
      headerShadowVisible: false,
    },
    /** The tabs' header takes any style, so the AppBar's hairline goes under it. */
    tabsHeader: {
      headerStyle: {
        backgroundColor: t.surface,
        borderBottomColor: t.borderColor,
        borderBottomWidth: StyleSheet.hairlineWidth,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: t.color,
      headerTitleStyle: { fontWeight: '600' as const },
    },
    tabBar: {
      tabBarActiveTintColor: t.accentText,
      tabBarInactiveTintColor: t.muted,
      tabBarStyle: {
        backgroundColor: t.surface,
        borderTopColor: t.borderColor,
        borderTopWidth: StyleSheet.hairlineWidth,
      },
    },
  };
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
