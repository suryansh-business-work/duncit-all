import { screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'tamagui';

import { renderWithTheme } from '@/test-utils';
import { ModalPage } from '../ModalPage';

/** A full-screen modal's page keeps its title off the status bar and its last row off the nav bar. */

const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 32, right: 0, bottom: 48, left: 0 },
};

it('pads the page by the status bar on top and the navigation bar below', () => {
  renderWithTheme(
    <SafeAreaProvider initialMetrics={metrics}>
      <ModalPage label="Image library" testID="page">
        <Text>Upload</Text>
      </ModalPage>
    </SafeAreaProvider>,
  );
  const page = screen.getByTestId('page');
  expect(page).toHaveStyle({ paddingTop: 32, paddingBottom: 48 });
  expect(screen.getByLabelText('Image library')).toBe(page);
  expect(screen.getByText('Upload')).toBeOnTheScreen();
});

it('adds no padding where the phone reports no system bars', () => {
  renderWithTheme(
    <ModalPage testID="page">
      <Text>Upload</Text>
    </ModalPage>,
  );
  expect(screen.getByTestId('page')).toHaveStyle({ paddingTop: 0, paddingBottom: 0 });
});
