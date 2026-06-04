import { screen } from '@testing-library/react-native';

import { LocationMap } from '@/components/LocationDialog/LocationMap';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/constants/config', () => ({
  config: { googleMapApiKey: 'test-key' },
}));

describe('LocationMap', () => {
  it('renders the webview when a key and place are present', () => {
    renderWithProviders(<LocationMap city="Mumbai" zoneName="Andheri" country="India" />);
    expect(screen.getByTestId('location-map')).toBeOnTheScreen();
  });

  it('renders nothing without a place', () => {
    renderWithProviders(<LocationMap city="" zoneName="" country="" />);
    expect(screen.queryByTestId('location-map')).toBeNull();
  });
});
