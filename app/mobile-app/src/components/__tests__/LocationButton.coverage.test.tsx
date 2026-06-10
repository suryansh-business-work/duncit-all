/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factory requires lazily */
import { fireEvent, screen } from '@testing-library/react-native';

import { LocationButton } from '@/components/LocationButton';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useLocations', () => ({
  useLocations: () => ({ cityLabel: 'Mumbai', countryCode: 'IN' }),
}));
jest.mock('@/components/LocationDialog', () => ({
  LocationDialog: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open
      ? require('react').createElement(require('react-native').Pressable, {
          testID: 'ld-close',
          onPress: onClose,
        })
      : null,
}));

describe('LocationButton dialog close', () => {
  it('opens and closes the location dialog', () => {
    renderWithProviders(<LocationButton />);
    fireEvent.press(screen.getByTestId('location-button'));
    expect(screen.getByTestId('ld-close')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('ld-close'));
    expect(screen.queryByTestId('ld-close')).toBeNull();
  });
});
