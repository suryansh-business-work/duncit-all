import type { ReactElement } from 'react';
import { render } from '@testing-library/react-native';
import { TamaguiProvider } from 'tamagui';

import config from '../tamagui.config';

/** Render inside the app's Tamagui theme, as every screen is at run time. */
export function renderWithTheme(ui: ReactElement) {
  return render(
    <TamaguiProvider config={config} defaultTheme="light">
      {ui}
    </TamaguiProvider>,
  );
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
