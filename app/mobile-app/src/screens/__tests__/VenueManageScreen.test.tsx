import { screen } from '@testing-library/react-native';

import { VenueManageScreen } from '@/screens/VenueManageScreen';
import { useVenueDashboard } from '@/hooks/useStudioDashboards';
import { renderWithProviders } from '@/utils/test-utils';

// The full app header is unit-tested on its own; stub it here (B4-3).
jest.mock('@/components/AppHeader', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { AppHeader: () => <V testID="app-header-stub" /> };
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn() }),
}));
jest.mock('@/hooks/useStudioDashboards', () => ({ useVenueDashboard: jest.fn() }));
const mockedUse = useVenueDashboard as jest.Mock;

describe('VenueManageScreen (venue dashboard)', () => {
  it('shows venue stats, the bookings chart and venue rows', () => {
    mockedUse.mockReturnValue({
      isLoading: false,
      venues: [
        {
          id: 'v1',
          venue_name: 'Hall',
          city: 'Pune',
          capacity: 40,
          status: 'APPROVED',
          is_active: true,
        },
        {
          id: 'v2',
          venue_name: 'Cafe',
          city: null,
          capacity: null,
          status: 'PENDING',
          is_active: true,
        },
      ],
      podDates: ['2026-06-20T10:00:00Z'],
    });
    renderWithProviders(<VenueManageScreen />);
    expect(screen.getByText('Approved')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-pods-chart')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-row-v1')).toBeOnTheScreen();
    expect(screen.getByText('— · PENDING')).toBeOnTheScreen();
  });

  it('shows the loading and empty states', () => {
    mockedUse.mockReturnValue({ isLoading: true, venues: [], podDates: [] });
    renderWithProviders(<VenueManageScreen />);
    expect(screen.getByTestId('venue-dashboard-loading')).toBeOnTheScreen();
    mockedUse.mockReturnValue({ isLoading: false, venues: [], podDates: [] });
    renderWithProviders(<VenueManageScreen />);
    expect(screen.getByTestId('venue-dashboard-empty')).toBeOnTheScreen();
  });
});
