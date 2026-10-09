import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { VenueStudioPodsDocument } from '@/graphql/studio-pods';
import { useMyVenues } from '@/hooks/useMyVenues';
import { VenuePodsScreen } from '@/screens/VenuePodsScreen';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: jest.fn(), goBack: jest.fn() }),
}));
jest.mock('@/hooks/useMyVenues', () => ({ useMyVenues: jest.fn() }));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockedVenues = useMyVenues as jest.Mock;
const mockRequest = graphqlRequest as jest.Mock;

const HALL = { id: 'v1', venue_name: 'Hall', city: 'Pune', status: 'APPROVED' };
const venuesState = (over: Record<string, unknown> = {}) => ({
  venues: [HALL],
  venue: HALL,
  venueId: 'v1',
  selectVenue: jest.fn(),
  isLoading: false,
  error: null,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedVenues.mockReturnValue(venuesState());
  // Anything the screen asks for besides the pods stays pending.
  mockRequest.mockImplementation(() => new Promise(() => undefined));
});

describe('VenuePodsScreen', () => {
  const pod = (id: string, bucket: string) => ({
    id,
    pod_slug: id,
    pod_title: `Pod ${id}`,
    pod_date_time: '2026-10-20T10:00:00Z',
    pod_end_date_time: null,
    pod_amount: 0,
    pod_type: 'FREE',
    no_of_spots: 10,
    attendee_count: 2,
    pod_attendees: [],
    host_names: [],
    owner_id: 'v1',
    owner_name: 'Hall',
    bucket,
    is_active: true,
    completed_at: null,
    cancelled_at: null,
    created_at: '2026-10-01T10:00:00Z',
  });
  const summary = {
    scope_count: 1,
    total: 3,
    upcoming: 1,
    ongoing: 0,
    completed: 1,
    cancelled: 1,
    total_spots: 30,
    filled_spots: 6,
    total_attendees: 6,
    fill_rate: 0.2,
    next_pod_date_time: null,
    total_revenue: null,
    currency_symbol: null,
  };

  it('splits the selected venue’s pods into Upcoming / Current / Past', async () => {
    mockRequest.mockImplementation((doc: unknown) =>
      doc === VenueStudioPodsDocument
        ? Promise.resolve({
            venuePods: [pod('a', 'UPCOMING'), pod('b', 'COMPLETED'), pod('c', 'CANCELLED')],
            venuePodsSummary: summary,
          })
        : new Promise(() => undefined),
    );
    renderWithProviders(<VenuePodsScreen />);
    await waitFor(() => expect(screen.getByTestId('venue-pods-row-a')).toBeOnTheScreen());
    expect(mockRequest).toHaveBeenCalledWith(
      VenueStudioPodsDocument,
      { venue_id: 'v1' },
      { auth: true },
    );
    expect(screen.queryByTestId('venue-pods-row-b')).toBeNull();

    fireEvent.press(screen.getByTestId('venue-pods-tab-current'));
    expect(screen.getByTestId('venue-pods-empty')).toHaveTextContent(
      'No pod is running at this venue right now.',
    );

    // A cancelled pod is history too.
    fireEvent.press(screen.getByTestId('venue-pods-tab-past'));
    expect(screen.getByTestId('venue-pods-row-b')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-pods-row-c')).toBeOnTheScreen();
    expect(screen.queryByTestId('venue-pods-row-a')).toBeNull();
  });

  it('asks for no pods until there is a venue', () => {
    mockedVenues.mockReturnValue(venuesState({ venues: [], venue: null, venueId: null }));
    renderWithProviders(<VenuePodsScreen />);
    expect(screen.getByTestId('selected-venue-empty')).toBeOnTheScreen();
    expect(mockRequest).not.toHaveBeenCalledWith(
      VenueStudioPodsDocument,
      expect.anything(),
      expect.anything(),
    );
  });
});
