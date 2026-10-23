import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  CounterVenueOfferDocument,
  VenueSlotRequestsDocument,
} from '@/graphql/venue-slot-requests';
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

describe('useVenueSlotRequests answers', () => {
  it('sends a counter with its terms and note, says so, and re-reads the list', async () => {
    const { result } = renderHook(() => useVenueSlotRequests());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockRequest.mockClear();
    mockRequest.mockResolvedValue({
      myVenues: VENUES,
      venueSlotRequests: [],
      counterVenueOffer: { slot_id: 's1' },
    });

    await act(() => result.current.counter('s1', { model: 'FLAT', rate: 7000 }, 'Weekend rate'));

    expect(mockRequest).toHaveBeenCalledWith(
      CounterVenueOfferDocument,
      { slot_id: 's1', terms: { model: 'FLAT', rate: 7000 }, note: 'Weekend rate' },
      { auth: true },
    );
    expect(result.current.feedback).toEqual({
      ok: true,
      text: 'Your counter was sent to the host.',
    });
    expect(mockRequest).toHaveBeenCalledWith(VenueSlotRequestsDocument, expect.anything(), {
      auth: true,
    });
  });

  it('sends no note when none is written', async () => {
    const { result } = renderHook(() => useVenueSlotRequests());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(() => result.current.counter('s1', { model: 'PER_HOUR', rate: 1500 }, ''));
    expect(mockRequest).toHaveBeenCalledWith(
      CounterVenueOfferDocument,
      { slot_id: 's1', terms: { model: 'PER_HOUR', rate: 1500 }, note: null },
      { auth: true },
    );
  });

  it("shows the server's reason, or a plain failure, when an answer is refused", async () => {
    const { result } = renderHook(() => useVenueSlotRequests());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockRequest.mockRejectedValueOnce(new Error('This booking has already started'));
    await act(() => result.current.approve('s1'));
    expect(result.current.feedback).toEqual({
      ok: false,
      text: 'This booking has already started',
    });

    mockRequest.mockRejectedValueOnce('offline');
    await act(() => result.current.decline('s1', ''));
    expect(result.current.feedback).toEqual({
      ok: false,
      text: 'That did not work. Please try again.',
    });
    act(() => result.current.clearFeedback());
    expect(result.current.feedback).toBeNull();
  });
});
