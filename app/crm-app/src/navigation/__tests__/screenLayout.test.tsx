import type { ReactElement } from 'react';
import { screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'tamagui';

import { renderWithTheme } from '@/test-utils';
import { screenLayout, stackScreenLayout } from '../screenLayout';

jest.mock('@/services/feedback', () => ({ appVersion: () => '1.0.0', submitFeedback: jest.fn() }));
jest.mock('@duncit/logs', () => ({ logs: { mobileApp: { error: jest.fn(), warn: jest.fn() } } }));

/** A pushed screen stays above the phone's navigation bar; a tab screen leaves that to the tab bar. */

const NAV_BAR = 48;
const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 24, right: 0, bottom: NAV_BAR, left: 0 },
};

function renderWithBars(ui: ReactElement) {
  return renderWithTheme(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);
}

function Broken(): ReactElement {
  throw new Error('lead page broke');
}

const route = { name: 'LeadDetail' };

it('lifts a stack screen above the system navigation bar', () => {
  renderWithBars(stackScreenLayout({ route, children: <Text>Add reminder</Text> }));
  expect(screen.getByTestId('screen-above-system-bar')).toHaveStyle({ paddingBottom: NAV_BAR });
  expect(screen.getByText('Add reminder')).toBeOnTheScreen();
});

it('adds nothing on a phone with no navigation bar inset', () => {
  renderWithTheme(stackScreenLayout({ route, children: <Text>Add reminder</Text> }));
  expect(screen.getByTestId('screen-above-system-bar')).toHaveStyle({ paddingBottom: 0 });
});

it('keeps a crashed stack screen inside its own boundary, still above the bar', () => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  renderWithBars(stackScreenLayout({ route, children: <Broken /> }));
  expect(screen.getByTestId('error-retry')).toBeOnTheScreen();
  expect(screen.getByTestId('screen-above-system-bar')).toHaveStyle({ paddingBottom: NAV_BAR });
  jest.restoreAllMocks();
});

it('leaves a tab screen to the tab bar, which already sits above the system bar', () => {
  renderWithBars(screenLayout({ route: { name: 'Home' }, children: <Text>Home</Text> }));
  expect(screen.getByText('Home')).toBeOnTheScreen();
  expect(screen.queryByTestId('screen-above-system-bar')).toBeNull();
});
