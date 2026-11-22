import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { UpdateVenueSettingsDocument } from '@/graphql/venue-availability';
import { useVenuesWithSettings } from '@/hooks/useVenuesWithSettings';
import { VenueSettingsScreen } from '@/screens/VenueSettingsScreen';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/components/AppHeader', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { AppHeader: () => <V testID="app-header-stub" /> };
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn() }),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/hooks/useVenuesWithSettings', () => ({ useVenuesWithSettings: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
const mockedUse = useVenuesWithSettings as jest.Mock;

interface StoredOffers {
  min_guests: number;
  response_hours: number;
  min_business?: { model: string; amount: number }[];
}

// The venue hopes for at least ₹250 a guest per booking.
const stored = {
  min_guests: 0,
  response_hours: 24,
  min_business: [{ model: 'PER_GUEST', amount: 250 }],
};

const venue = (id: string, offers: StoredOffers | null) => ({
  id,
  venue_name: `Venue ${id}`,
  city: 'Pune',
  status: 'APPROVED',
  capacity: 40,
  capacity_items: [],
  // What is in effect: the venue's own value, else Duncit's default where it set 0.
  offer_min_guests: offers?.min_guests || 6,
  offer_response_hours: offers?.response_hours || 48,
  settings: {
    offers,
    cancellation: { reschedule_only: false, tiers: [] },
  },
});

const refetch = jest.fn();
const state = (over: Record<string, unknown> = {}) => ({
  venues: [venue('v1', stored)],
  venue: venue('v1', stored),
  venueId: 'v1',
  selectVenue: jest.fn(),
  isLoading: false,
  error: null,
  refetch,
  ...over,
});

const offerSaves = () =>
  mockRequest.mock.calls.filter(
    ([document, variables]) =>
      document === UpdateVenueSettingsDocument && 'offers' in variables.input,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockResolvedValue({ updateVenueSettings: { id: 'v1' } });
});

describe('VenueSettingsScreen', () => {
  it('no longer carries the booking offers — they live on Fees & Minimum Spend', () => {
    mockedUse.mockReturnValue(state());
    renderWithProviders(<VenueSettingsScreen />);
    expect(screen.getByTestId('venue-settings-form')).toBeOnTheScreen();
    expect(screen.queryByTestId('venue-offer-settings-form')).toBeNull();
    expect(screen.queryByTestId('field-min_guests')).toBeNull();
  });

  it('saves the cancellation policy for the picked venue', async () => {
    mockedUse.mockReturnValue(state());
    renderWithProviders(<VenueSettingsScreen />);
    fireEvent.press(screen.getByTestId('venue-settings-save'));
    await waitFor(() => expect(screen.getByTestId('venue-settings-saved')).toBeOnTheScreen());
    expect(mockRequest).toHaveBeenCalledWith(
      UpdateVenueSettingsDocument,
      { venue_doc_id: 'v1', input: { cancellation: { reschedule_only: false, tiers: [] } } },
      { auth: true },
    );
    expect(offerSaves()).toEqual([]);
  });

  it('says when the venues could not be read, and while they load', () => {
    mockedUse.mockReturnValue(
      state({ venues: [], venue: null, venueId: null, isLoading: true, error: 'offline' }),
    );
    renderWithProviders(<VenueSettingsScreen />);
    expect(screen.getByTestId('venue-settings-loading')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-settings-error')).toHaveTextContent('offline');
    expect(screen.queryByTestId('venue-settings-empty')).toBeNull();
  });

  it('shows no venue settings while there is no venue', () => {
    mockedUse.mockReturnValue(state({ venues: [], venue: null, venueId: null }));
    renderWithProviders(<VenueSettingsScreen />);
    expect(screen.getByTestId('venue-settings-empty')).toBeOnTheScreen();
    expect(screen.queryByTestId('venue-offer-settings-form')).toBeNull();
    expect(screen.queryByTestId('venue-settings-form')).toBeNull();
  });
});
