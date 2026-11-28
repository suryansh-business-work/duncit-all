import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'tamagui';

import { ActionSheet } from '@/components/ActionSheet';
import { TabSheet } from '@/screens/lead/tabs/TabSheet';
import { SheetModal } from '@/screens/lead/tabs/parts/SheetModal';
import { renderWithTheme } from '@/test-utils';

/**
 * Android draws modals edge to edge, so every sheet keeps its last row and its
 * actions above the system navigation bar instead of under it.
 */

const STATUS_BAR = 24;
const NAV_BAR = 48;
const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: STATUS_BAR, right: 0, bottom: NAV_BAR, left: 0 },
};

function renderWithBars(ui: ReactElement) {
  return renderWithTheme(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);
}

afterEach(() => jest.restoreAllMocks());

it('runs the action sheet surface under the bar and keeps Cancel above it', () => {
  renderWithBars(
    <ActionSheet
      open
      title="Template"
      actions={[{ key: 'copy', label: 'Duplicate', icon: 'content-copy', onPress: jest.fn() }]}
      onClose={jest.fn()}
      testID="actions"
    />,
  );
  expect(screen.getByTestId('actions-surface')).toHaveStyle({ paddingBottom: NAV_BAR });
  expect(screen.getByTestId('actions-cancel')).toBeOnTheScreen();
});

it('lifts the lead tab sheet content above the bar', () => {
  renderWithBars(
    <TabSheet open title="Rename" onClose={jest.fn()} testID="tab-sheet">
      <Text>Name</Text>
    </TabSheet>,
  );
  expect(screen.getByTestId('tab-sheet')).toHaveStyle({ paddingBottom: NAV_BAR });
});

const footer = <Text>Save</Text>;

it('keeps the full-height form sheet clear of both bars on Android', () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  renderWithBars(
    <SheetModal open title="Add contact" onClose={jest.fn()} footer={footer} testID="form-sheet">
      <Text>Phone</Text>
    </SheetModal>,
  );
  expect(screen.getByTestId('form-sheet')).toHaveStyle({
    paddingTop: STATUS_BAR,
    paddingBottom: NAV_BAR,
  });
  expect(screen.getByText('Save')).toBeOnTheScreen();
});

it('leaves the top to the iOS page sheet, which already starts below the status bar', () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  renderWithBars(
    <SheetModal open title="Add contact" onClose={jest.fn()} footer={footer} testID="form-sheet">
      <Text>Phone</Text>
    </SheetModal>,
  );
  expect(screen.getByTestId('form-sheet')).toHaveStyle({ paddingTop: 0, paddingBottom: NAV_BAR });
});
