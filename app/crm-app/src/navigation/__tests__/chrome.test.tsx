import type { ReactNode } from 'react';
import { render, renderHook, screen } from '@testing-library/react-native';
import { TamaguiProvider, Theme } from 'tamagui';

import config, { crmTheme } from '../../../tamagui.config';
import { AppNavigation } from '../AppNavigation';
import { activeTabInk, consoleChrome, navigationTheme, useConsoleChrome } from '../chrome';

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
    'paints the %s app bar Duncit CRM red with white title and icons',
    (mode) => {
      const t = crmTheme(mode);
      const chrome = consoleChrome(mode);
      expect(chrome.stackHeader.headerStyle.backgroundColor).toBe(t.primary);
      expect(chrome.stackHeader.headerTintColor).toBe(t.onPrimary);
      expect(chrome.tabsHeader.headerStyle).toMatchObject({
        backgroundColor: t.primary,
        elevation: 0,
        borderBottomWidth: 0,
      });
      expect(chrome.tabsHeader.headerTitleStyle.color).toBe(t.onPrimary);
    },
  );

  it.each(['light', 'dark'] as const)(
    'marks the current %s tab with a soft red pill, the others muted',
    (mode) => {
      const t = crmTheme(mode);
      const { tabBar } = consoleChrome(mode);
      expect(tabBar.tabBarActiveBackgroundColor).toBe(t.primarySoft);
      expect(tabBar.tabBarActiveTintColor).toBe(activeTabInk(mode));
      expect(tabBar.tabBarInactiveTintColor).toBe(t.muted);
      expect(tabBar.tabBarStyle.backgroundColor).toBe(t.surface);
    },
  );

  it('uses the deeper red for the light current tab and the ink on dark (the accent fails on the pill)', () => {
    expect(activeTabInk('light')).toBe(crmTheme('light').primaryHover);
    expect(activeTabInk('dark')).toBe(crmTheme('dark').color);
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
    expect(result.current.tabBar.tabBarActiveTintColor).toBe(activeTabInk(mode));
  });
});

describe('AppNavigation', () => {
  // The container waits for the launch link before it draws the navigator.
  it.each([true, false])(
    'renders the navigator once the launch link is read (dark: %s)',
    async (dark) => {
      render(<AppNavigation dark={dark} />, { wrapper: inMode(dark ? 'dark' : 'light') });
      expect(await screen.findByText('root navigator')).toBeTruthy();
    },
  );
});
