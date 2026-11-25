import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react-native';
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
