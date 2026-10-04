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
// The per-venue stats, pods and change-request panels fetch on their own; their
// suites cover the answers. Held pending here so this screen's own layout is
// what is under test.
jest.mock('@/services/graphql.client', () => ({
  graphqlRequest: jest.fn(() => new Promise(() => undefined)),
}));
const mockedUse = useVenueDashboard as jest.Mock;

describe('VenueManageScreen (venue dashboard)', () => {
  it('shows the selected venue stats, the bookings chart and its row', () => {
    const hall = {
      id: 'v1',
      venue_name: 'Hall',
      city: 'Pune',
      capacity: 40,
      status: 'APPROVED',
      is_active: true,
    };
    const cafe = {
      id: 'v2',
      venue_name: 'Cafe',
      city: null,
      capacity: null,
      status: 'PENDING',
      is_active: true,
    };
    mockedUse.mockReturnValue({
      isLoading: false,
      venues: [hall, cafe],
      venue: hall,
      venueId: 'v1',
      selectVenue: jest.fn(),
      podDates: ['2026-06-20T10:00:00Z'],
    });
    renderWithProviders(<VenueManageScreen />);
    const values = screen.getAllByTestId('stat-tile-value');
    // Listed counts every venue; capacity and status belong to the picked one.
    expect(values[0]).toHaveTextContent('2');
    expect(values[1]).toHaveTextContent('40');
    expect(values[2]).toHaveTextContent('APPROVED');
    // Two venues, so the switcher is offered.
    expect(screen.getByTestId('venue-switcher')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-pods-chart')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-studio-pods')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-row-v1')).toHaveTextContent(/Hall/);
    expect(screen.getByText('Pune · APPROVED')).toBeOnTheScreen();
    expect(screen.queryByTestId('venue-row-v2')).toBeNull();
    expect(screen.queryByTestId('venue-dashboard-empty')).toBeNull();
  });

  it('shows the loading and empty states', () => {
    const none = { venues: [], venue: null, venueId: null, podDates: [] };
    mockedUse.mockReturnValue({ ...none, isLoading: true });
    renderWithProviders(<VenueManageScreen />);
    expect(screen.getByTestId('venue-dashboard-loading')).toBeOnTheScreen();
    mockedUse.mockReturnValue({ ...none, isLoading: false });
    renderWithProviders(<VenueManageScreen />);
    expect(screen.getByTestId('venue-dashboard-empty')).toBeOnTheScreen();
    // No venue: status reads New and there is no venue row or pods list.
    expect(screen.getAllByTestId('stat-tile-value')[2]).toHaveTextContent('New');
    expect(screen.queryByTestId('venue-studio-pods')).toBeNull();
  });
});
