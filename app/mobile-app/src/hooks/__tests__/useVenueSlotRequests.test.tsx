import { act, renderHook, waitFor } from '@testing-library/react-native';

import { VenueSlotRequestsDocument } from '@/graphql/venue-slot-requests';
import { ALL_VENUES, useVenueSlotRequests } from '@/hooks/useVenueSlotRequests';
import { graphqlRequest } from '@/services/graphql.client';
import { useSelectedVenueStore } from '@/stores/selected-venue.store';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/services/selected-venue', () => ({
  getSelectedVenueId: jest.fn(),
  setSelectedVenueId: jest.fn(() => Promise.resolve()),
}));
const mockRequest = graphqlRequest as jest.Mock;

const VENUES = [
  { id: 'v1', venue_name: 'Hall' },
  { id: 'v2', venue_name: 'Turf' },
];

const askedFor = (venueId: string | null) =>
  expect(mockRequest).toHaveBeenCalledWith(
    VenueSlotRequestsDocument,
    { venue_id: venueId },
    { auth: true },
  );

beforeEach(() => {
  mockRequest.mockReset();
  mockRequest.mockResolvedValue({ myVenues: VENUES, venueSlotRequests: [] });
  useSelectedVenueStore.setState({ venueId: 'v2', status: 'ready' });
});

describe('useVenueSlotRequests', () => {
  it('opens on the venue picked on another Venue Studio screen', async () => {
    const { result } = renderHook(() => useVenueSlotRequests());
    await waitFor(() => expect(result.current.venueId).toBe('v2'));
    await waitFor(() => askedFor('v2'));
  });

  it('keeps "All venues" one tap away without forgetting the shared pick', async () => {
    const { result } = renderHook(() => useVenueSlotRequests());
    await waitFor(() => expect(result.current.venueId).toBe('v2'));

    act(() => result.current.setVenueId(ALL_VENUES));
    expect(result.current.venueId).toBe(ALL_VENUES);
    await waitFor(() => askedFor(null));
    expect(useSelectedVenueStore.getState().venueId).toBe('v2');
  });

  it('moves the shared pick when a venue is chosen here', async () => {
    const { result } = renderHook(() => useVenueSlotRequests());
    await waitFor(() => expect(result.current.venueId).toBe('v2'));
    act(() => result.current.setVenueId(ALL_VENUES));

    act(() => result.current.setVenueId('v1'));
    expect(result.current.venueId).toBe('v1');
    expect(useSelectedVenueStore.getState().venueId).toBe('v1');
    await waitFor(() => askedFor('v1'));
  });
});
