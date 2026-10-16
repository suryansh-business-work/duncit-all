import { screen } from '@testing-library/react-native';

import { useFoodDeskVenues } from '@/hooks/useFoodDesk';
import { VenueRentedItemsScreen } from '@/screens/VenueRentedItemsScreen';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn(), navigate: jest.fn() }),
}));
jest.mock('@/hooks/useFoodDesk', () => ({ useFoodDeskVenues: jest.fn() }));
// The desk has its own suites; the screen decides only which venue it shows.
jest.mock('@/components/venue-rentals-desk/VenueRentalsBody', () => {
  const { createElement } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    VenueRentalsBody: ({ venueId }: { venueId: string }) =>
      createElement(Text, { testID: 'venue-rentals-body' }, venueId),
  };
});

const mockVenues = useFoodDeskVenues as jest.Mock;

const venue = (id: string, offersFood: boolean) => ({
  id,
  venue_name: `Venue ${id}`,
  status: 'APPROVED',
  offers_food: offersFood,
});

describe('VenueRentedItemsScreen', () => {
  it('shows the desk for the selected venue, even one that serves no food', () => {
    const selected = venue('v2', false);
    mockVenues.mockReturnValue({
      venues: [venue('v1', true), selected],
      venue: selected,
      selectVenue: jest.fn(),
      isLoading: false,
      error: null,
    });
    renderWithProviders(<VenueRentedItemsScreen />);

    expect(screen.getByTestId('venue-rented-items-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-rentals-body')).toHaveTextContent('v2');
    expect(screen.queryByTestId('venue-rented-items-screen-no-food')).toBeNull();
  });

  it('shows no desk until a venue is picked', () => {
    mockVenues.mockReturnValue({
      venues: [],
      venue: null,
      selectVenue: jest.fn(),
      isLoading: true,
      error: null,
    });
    renderWithProviders(<VenueRentedItemsScreen />);
    expect(screen.queryByTestId('venue-rentals-body')).toBeNull();
  });
});
