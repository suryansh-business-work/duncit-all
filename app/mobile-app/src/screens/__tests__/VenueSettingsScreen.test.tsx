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

const venue = (id: string, offers: { min_guests: number; response_hours: number } | null) => ({
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
  venues: [venue('v1', { min_guests: 0, response_hours: 24 })],
  venue: venue('v1', { min_guests: 0, response_hours: 24 }),
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
  it('shows the Booking offers card beside the cancellation policy for the picked venue', () => {
    mockedUse.mockReturnValue(state());
    renderWithProviders(<VenueSettingsScreen />);
    expect(screen.getByTestId('venue-offer-settings-form')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-settings-form')).toBeOnTheScreen();
    expect(screen.getByTestId('field-min_guests').props.value).toBe('0');
    expect(screen.getByTestId('field-response_hours').props.value).toBe('24');
    // The minimum is left to Duncit's default (6 today); the 24 hours are the venue's own.
    expect(screen.getByText('0 uses Duncit’s default. In effect now: 6 guests.')).toBeOnTheScreen();
    expect(screen.getByText('0 uses Duncit’s default. In effect now: 24 hours.')).toBeOnTheScreen();
  });

  it('starts a venue that stored no settings at all at the defaults', () => {
    // A venue never saved: no settings record, so nothing is stored for its offers.
    const fresh = { ...venue('v2', null), settings: null };
    mockedUse.mockReturnValue(state({ venues: [fresh], venue: fresh, venueId: 'v2' }));
    renderWithProviders(<VenueSettingsScreen />);
    expect(screen.getByTestId('field-min_guests').props.value).toBe('0');
    expect(screen.getByTestId('field-response_hours').props.value).toBe('0');
    expect(screen.getByText('0 uses Duncit’s default. In effect now: 6 guests.')).toBeOnTheScreen();
  });

  it('saves the booking offers on their own, then re-reads the venue', async () => {
    mockedUse.mockReturnValue(state());
    renderWithProviders(<VenueSettingsScreen />);
    fireEvent.changeText(screen.getByTestId('field-min_guests'), '10');
    fireEvent.press(screen.getByTestId('venue-offer-settings-save'));
    await waitFor(() => expect(screen.getByTestId('venue-offer-settings-saved')).toBeOnTheScreen());
    expect(offerSaves()).toEqual([
      [
        UpdateVenueSettingsDocument,
        { venue_doc_id: 'v1', input: { offers: { min_guests: 10, response_hours: 24 } } },
        { auth: true },
      ],
    ]);
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('venue-offer-settings-error')).toBeNull();
  });

  it('says why a save was refused and re-reads nothing', async () => {
    mockedUse.mockReturnValue(state());
    mockRequest.mockRejectedValueOnce(new Error('Only the venue owner can do that'));
    renderWithProviders(<VenueSettingsScreen />);
    fireEvent.press(screen.getByTestId('venue-offer-settings-save'));
    await waitFor(() =>
      expect(screen.getByTestId('venue-offer-settings-error')).toHaveTextContent(
        'Only the venue owner can do that',
      ),
    );
    expect(screen.queryByTestId('venue-offer-settings-saved')).toBeNull();
    expect(refetch).not.toHaveBeenCalled();
  });

  it('saves the cancellation policy apart from the booking offers', async () => {
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
    expect(screen.queryByTestId('venue-offer-settings-saved')).toBeNull();
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
