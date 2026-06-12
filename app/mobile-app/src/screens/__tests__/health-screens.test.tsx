import { screen } from '@testing-library/react-native';

import { AccountHealthScreen } from '@/screens/AccountHealthScreen';
import { VenueHealthScreen } from '@/screens/VenueHealthScreen';
import { useAccountHealth, useVenueHealth } from '@/hooks/useHealth';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useHealth', () => ({ useAccountHealth: jest.fn(), useVenueHealth: jest.fn() }));
let mockRouteParams: { venueId: string } | undefined = { venueId: 'v1' };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn(), navigate: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
}));

const mockedAccount = useAccountHealth as jest.Mock;
const mockedVenue = useVenueHealth as jest.Mock;
const health = (over = {}) => ({
  base_score: 100,
  delta_sum: 0,
  total_score: 100,
  band: 'GREEN',
  adjustments: [],
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = { venueId: 'v1' };
});

describe('AccountHealthScreen', () => {
  it('shows the loader, error, missing and loaded states', () => {
    mockedAccount.mockReturnValue({ health: null, isLoading: true });
    const { rerender } = renderWithProviders(<AccountHealthScreen />);
    expect(screen.getByTestId('account-health-loading')).toBeOnTheScreen();

    mockedAccount.mockReturnValue({ health: null, isLoading: false, error: new Error('x') });
    rerender(<AccountHealthScreen />);
    expect(screen.getByTestId('account-health-error')).toHaveTextContent('x');

    mockedAccount.mockReturnValue({ health: null, isLoading: false });
    rerender(<AccountHealthScreen />);
    expect(screen.getByTestId('account-health-missing')).toBeOnTheScreen();

    mockedAccount.mockReturnValue({ health: health(), isLoading: false });
    rerender(<AccountHealthScreen />);
    expect(screen.getByTestId('health-meter')).toBeOnTheScreen();
    expect(screen.getByTestId('health-breakdown')).toBeOnTheScreen();
  });
});

describe('VenueHealthScreen', () => {
  it('shows the loader, error, missing and loaded states', () => {
    mockedVenue.mockReturnValue({ health: null, isLoading: true });
    const { rerender } = renderWithProviders(<VenueHealthScreen />);
    expect(screen.getByTestId('venue-health-loading')).toBeOnTheScreen();

    mockedVenue.mockReturnValue({ health: null, isLoading: false, error: new Error('bad') });
    rerender(<VenueHealthScreen />);
    expect(screen.getByTestId('venue-health-error')).toHaveTextContent('bad');

    mockedVenue.mockReturnValue({ health: null, isLoading: false });
    rerender(<VenueHealthScreen />);
    expect(screen.getByTestId('venue-health-missing')).toBeOnTheScreen();

    mockedVenue.mockReturnValue({ health: health({ subject_label: 'Cafe' }), isLoading: false });
    rerender(<VenueHealthScreen />);
    expect(screen.getByTestId('health-meter')).toBeOnTheScreen();
    expect(screen.getByTestId('health-breakdown')).toBeOnTheScreen();
  });

  it('defaults the venue id to empty when no route params are present', () => {
    mockRouteParams = undefined;
    mockedVenue.mockReturnValue({ health: null, isLoading: false });
    renderWithProviders(<VenueHealthScreen />);
    expect(useVenueHealth).toHaveBeenCalledWith('');
    expect(screen.getByTestId('venue-health-missing')).toBeOnTheScreen();
  });
});
