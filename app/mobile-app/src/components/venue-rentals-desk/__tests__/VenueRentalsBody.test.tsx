import { fireEvent, screen } from '@testing-library/react-native';

import { VenueRentalsBody } from '@/components/venue-rentals-desk/VenueRentalsBody';
import { useVenueRentalBookings, useVenueRentalItems } from '@/hooks/useVenueRentalDesk';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useVenueRentalDesk', () => ({
  useVenueRentalBookings: jest.fn(),
  useVenueRentalItems: jest.fn(),
}));
// The editor has its own suite; here only which venue reaches it matters.
jest.mock('@/components/venue-rentals-desk/RentalItemsForm', () => {
  const { createElement } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    RentalItemsForm: ({ venue }: { venue: { venue_name: string } }) =>
      createElement(Text, { testID: 'rental-items-form' }, venue.venue_name),
  };
});

const mockItems = useVenueRentalItems as jest.Mock;
const mockBookings = useVenueRentalBookings as jest.Mock;

const VENUE = {
  id: 'v1',
  venue_name: 'Court Nine',
  status: 'APPROVED',
  offers_rentals: true,
  rental_terms_html: '',
  rental_deposit_gst: true,
  rental_items: [],
};
const CONFIG = { rental_units: ['SLOT', 'HOUR'], rental_item_limit: 20 };

const items = (over: Record<string, unknown> = {}) => {
  const value = {
    venue: VENUE,
    config: CONFIG,
    failed: false,
    loading: false,
    refetch: jest.fn().mockResolvedValue(undefined),
    save: jest.fn(),
    ...over,
  };
  mockItems.mockReturnValue(value);
  return value;
};

beforeEach(() => {
  mockItems.mockReset();
  mockBookings.mockReset();
  mockBookings.mockReturnValue({
    bookings: [],
    stats: {
      bookings: 0,
      open: 0,
      rent_total: 0,
      deposits_held: 0,
      earned: 0,
      paid_out: 0,
      currency_symbol: '₹',
    },
    failed: false,
    loading: false,
    refetch: jest.fn(),
    mark: jest.fn(),
  });
});

describe('VenueRentalsBody', () => {
  it('opens on the dashboard: the numbers over the bookings', () => {
    items();
    renderWithProviders(<VenueRentalsBody venueId="v1" />);
    expect(screen.getByTestId('venue-rentals-desk')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-rental-stats')).toBeOnTheScreen();
    expect(mockBookings).toHaveBeenCalledWith('v1');
    expect(screen.queryByTestId('rental-items-form')).toBeNull();
  });

  it('the Bookings tab lists the bookings without the numbers', () => {
    items();
    renderWithProviders(<VenueRentalsBody venueId="v1" />);
    fireEvent.press(screen.getByTestId('venue-rentals-tab-bookings'));
    expect(screen.queryByTestId('venue-rental-stats')).toBeNull();
    expect(screen.getByTestId('venue-rentals-empty')).toBeOnTheScreen();
  });

  it('the Items tab edits an approved venue’s items', () => {
    items();
    renderWithProviders(<VenueRentalsBody venueId="v1" />);
    fireEvent.press(screen.getByTestId('venue-rentals-tab-items'));
    expect(mockItems).toHaveBeenCalledWith('v1');
    expect(screen.getByTestId('rental-items-form')).toHaveTextContent('Court Nine');
  });

  it('tells a venue not yet approved that items come after approval', () => {
    items({ venue: { ...VENUE, status: 'PENDING' } });
    renderWithProviders(<VenueRentalsBody venueId="v1" />);
    fireEvent.press(screen.getByTestId('venue-rentals-tab-items'));
    expect(screen.getByTestId('rental-items-not-approved')).toHaveTextContent(
      'Rented items can be listed once the venue is approved.',
    );
    expect(screen.queryByTestId('rental-items-form')).toBeNull();
  });

  it('shows a spinner while the items load', () => {
    items({ loading: true, venue: null, config: null });
    renderWithProviders(<VenueRentalsBody venueId="v1" />);
    fireEvent.press(screen.getByTestId('venue-rentals-tab-items'));
    expect(screen.queryByTestId('rental-items-form')).toBeNull();
    expect(screen.queryByTestId('rental-items-error')).toBeNull();
  });

  it('says the items could not load, and Retry asks again — even if that fails too', () => {
    const value = items({ failed: true, venue: null });
    renderWithProviders(<VenueRentalsBody venueId="v1" />);
    fireEvent.press(screen.getByTestId('venue-rentals-tab-items'));
    expect(screen.getByTestId('rental-items-error')).toHaveTextContent(
      'The rented items could not load',
    );

    fireEvent.press(screen.getByTestId('rental-items-error-retry'));
    value.refetch.mockRejectedValueOnce(new Error('offline'));
    fireEvent.press(screen.getByTestId('rental-items-error-retry'));
    expect(value.refetch).toHaveBeenCalledTimes(2);
  });

  it('reads missing caps as a failed load rather than an editor with no limits', () => {
    items({ config: null });
    renderWithProviders(<VenueRentalsBody venueId="v1" />);
    fireEvent.press(screen.getByTestId('venue-rentals-tab-items'));
    expect(screen.getByTestId('rental-items-error')).toBeOnTheScreen();
  });
});
