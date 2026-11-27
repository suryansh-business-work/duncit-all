import type { ReactElement, ReactNode } from 'react';
import { act, render } from '@testing-library/react-native';
import { TamaguiProvider } from 'tamagui';

import config from '../tamagui.config';

function ThemeWrapper({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <TamaguiProvider config={config} defaultTheme="light">
      {children}
    </TamaguiProvider>
  );
}

/**
 * Render inside the app's Tamagui theme, as every screen is at run time. The
 * theme is the render's wrapper, so a rerender keeps it too.
 */
export function renderWithTheme(ui: ReactElement) {
  return render(ui, { wrapper: ThemeWrapper });
}

/** A navigation object whose calls a test can assert on. */
export function mockNavigation() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
    setOptions: jest.fn(),
  };
}

/**
 * Press the button a screen put in its app bar with
 * `navigation.setOptions({ headerRight })` — the navigator draws it outside
 * the screen, so a test calls the button's own handler.
 */
export function pressHeaderRight(setOptions: jest.Mock): void {
  const options = setOptions.mock.calls.at(-1)?.[0] as
    { headerRight?: () => { props: { onPress: () => void } } } | undefined;
  const button = options?.headerRight?.();
  expect(button).toBeDefined();
  act(() => button?.props.onPress());
}
