import type { ReactNode } from 'react';
import { render, renderHook, screen } from '@testing-library/react-native';
import { TamaguiProvider, Theme } from 'tamagui';

import config, { crmTheme } from '../../../tamagui.config';
import { AppNavigation } from '../AppNavigation';
import { consoleChrome, navigationTheme, useConsoleChrome } from '../chrome';

jest.mock('../RootNavigator', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return { RootNavigator: () => <MockText>root navigator</MockText> };
});

/** The header, tab bar and navigator colours: the portal's AppBar look, in both modes. */

function inMode(mode: 'light' | 'dark') {
  return function ModeWrapper({ children }: { children: ReactNode }) {
    return (
      <TamaguiProvider config={config} defaultTheme={mode}>
        <Theme name={mode}>{children}</Theme>
      </TamaguiProvider>
    );
  };
}

describe('consoleChrome', () => {
  it.each(['light', 'dark'] as const)(
    'paints the %s header as the surface with ink text, never the accent',
    (mode) => {
      const t = crmTheme(mode);
      const chrome = consoleChrome(mode);
      expect(chrome.stackHeader.headerStyle.backgroundColor).toBe(t.surface);
      expect(chrome.stackHeader.headerTintColor).toBe(t.color);
      expect(chrome.tabsHeader.headerStyle).toMatchObject({
        backgroundColor: t.surface,
        borderBottomColor: t.borderColor,
        elevation: 0,
      });
      expect(chrome.stackHeader.headerStyle.backgroundColor).not.toBe(t.primary);
      expect(chrome.ink).toBe(t.color);
    },
  );

  it('marks the current tab in the accent readable on the mode, others muted', () => {
    const dark = consoleChrome('dark');
    expect(dark.tabBar.tabBarActiveTintColor).toBe(crmTheme('dark').accentText);
    expect(dark.tabBar.tabBarInactiveTintColor).toBe(crmTheme('dark').muted);
    expect(dark.tabBar.tabBarStyle.backgroundColor).toBe(crmTheme('dark').surface);
    // The dark accent is lightened for text; the light one is not.
    expect(dark.tabBar.tabBarActiveTintColor).not.toBe(
      consoleChrome('light').tabBar.tabBarActiveTintColor,
    );
  });
});

describe('navigationTheme', () => {
  it('gives the navigator the dark page and card colours in dark mode', () => {
    const t = crmTheme('dark');
    const theme = navigationTheme('dark');
    expect(theme.dark).toBe(true);
    expect(theme.colors).toEqual({
      primary: t.accentText,
      background: t.background,
      card: t.surface,
      text: t.color,
      border: t.borderColor,
      notification: t.danger,
    });
    expect(theme.fonts).toBeDefined();
  });

  it('keeps the light page in light mode', () => {
    const theme = navigationTheme('light');
    expect(theme.dark).toBe(false);
    expect(theme.colors.background).toBe(crmTheme('light').background);
  });
});

describe('useConsoleChrome', () => {
  it.each(['light', 'dark'] as const)('follows the %s theme it renders in', (mode) => {
    const { result } = renderHook(() => useConsoleChrome(), { wrapper: inMode(mode) });
    expect(result.current.stackHeader.headerStyle.backgroundColor).toBe(crmTheme(mode).surface);
  });
});

describe('AppNavigation', () => {
  it.each([true, false])('renders the navigator (dark: %s)', (dark) => {
    render(<AppNavigation dark={dark} />, { wrapper: inMode(dark ? 'dark' : 'light') });
    expect(screen.getByText('root navigator')).toBeTruthy();
  });
});
