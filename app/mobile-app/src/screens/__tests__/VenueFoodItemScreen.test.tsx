import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useVenueDetails } from '@/hooks/useHostsVenues';
import { VenueFoodItemScreen } from '@/screens/VenueFoodItemScreen';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useHostsVenues', () => ({ useVenueDetails: jest.fn() }));
// The dish body has its own spec; here it only has to say which dish it got.
jest.mock('@/components/details/venue-food/FoodItemDetails', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    FoodItemDetails: ({ venue, item }: { venue: { id: string }; item: { id: string } }) => (
      <Text testID="food-item-details-stub">{`${venue.id}:${item.id}`}</Text>
    ),
  };
});

const mockPopTo = jest.fn();
let mockParams: { venueId?: string; itemId?: string } | undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    canGoBack: () => true,
    goBack: jest.fn(),
    navigate: jest.fn(),
    popTo: mockPopTo,
  }),
  useRoute: () => ({ params: mockParams }),
}));

const mockUseVenueDetails = useVenueDetails as jest.Mock;
const refetch = jest.fn();

const chai = { id: 'chai', name: 'Masala Chai' };
const venue = (over: Record<string, unknown> = {}) => ({
  id: 'v1',
  venue_name: 'Sunset Cafe',
  offers_food: true,
  food_menu: [chai],
  ...over,
});

const state = (over: Record<string, unknown> = {}) =>
  mockUseVenueDetails.mockReturnValue({
    venue: null,
    isLoading: false,
    error: undefined,
    refetch,
    ...over,
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { venueId: 'v1', itemId: 'chai' };
  refetch.mockResolvedValue(undefined);
});

describe('VenueFoodItemScreen', () => {
  it('reads the venue the menu reads and shows a spinner until it lands', () => {
    state({ isLoading: true });
    renderWithProviders(<VenueFoodItemScreen />);

    expect(mockUseVenueDetails).toHaveBeenCalledWith('v1');
    expect(screen.getByTestId('food-item-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('food-item-loading')).toBeOnTheScreen();
    expect(screen.getByTestId('food-item-screen-title')).toHaveTextContent('Dish details');
  });

  it('shows the dish and leads back to the venue menu', () => {
    state({ venue: venue() });
    renderWithProviders(<VenueFoodItemScreen />);

    expect(screen.getByTestId('food-item-details-stub')).toHaveTextContent('v1:chai');
    fireEvent.press(screen.getByTestId('food-item-back-to-menu'));
    expect(mockPopTo).toHaveBeenCalledWith('VenueDetails', { venueId: 'v1' });
  });

  it('keeps showing the loaded dish while a refresh is in flight', () => {
    state({ venue: venue(), isLoading: true });
    renderWithProviders(<VenueFoodItemScreen />);

    expect(screen.queryByTestId('food-item-loading')).toBeNull();
    expect(screen.getByTestId('food-item-details-stub')).toBeOnTheScreen();
  });

  it('says the dish is gone when it left the menu, or the venue stopped serving food', () => {
    state({ venue: venue({ food_menu: [] }) });
    const { rerender } = renderWithProviders(<VenueFoodItemScreen />);
    expect(screen.getByTestId('food-item-missing-title')).toHaveTextContent(
      'This dish is no longer on the menu.',
    );
    expect(screen.getByTestId('food-item-back-to-menu')).toBeOnTheScreen();

    state({ venue: venue({ offers_food: false }) });
    rerender(<VenueFoodItemScreen />);
    expect(screen.getByTestId('food-item-missing')).toBeOnTheScreen();
    expect(screen.queryByTestId('food-item-details-stub')).toBeNull();
  });

  it('offers a retry when the venue could not be loaded', async () => {
    state({ error: new Error('offline') });
    renderWithProviders(<VenueFoodItemScreen />);

    expect(screen.getByTestId('food-item-load-failed-title')).toHaveTextContent(
      'This dish could not be loaded.',
    );
    fireEvent.press(screen.getByText('Try again'));
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
  });

  it('has no way back to a menu when the link named no venue', () => {
    mockParams = undefined;
    state();
    renderWithProviders(<VenueFoodItemScreen />);

    expect(mockUseVenueDetails).toHaveBeenCalledWith('');
    expect(screen.getByTestId('food-item-missing')).toBeOnTheScreen();
    expect(screen.queryByTestId('food-item-back-to-menu')).toBeNull();
  });
});
