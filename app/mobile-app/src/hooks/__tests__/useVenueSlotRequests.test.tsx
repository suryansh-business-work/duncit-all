import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  CounterVenueOfferDocument,
  VenueSlotRequestsDocument,
} from '@/graphql/venue-slot-requests';
import { VenueOfferModel } from '@/generated/graphql/graphql';
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
  it('sends a counter for the round on screen, re-reads the list and tells the screen', async () => {
    const onDecided = jest.fn();
    const { result } = renderHook(() => useVenueSlotRequests(onDecided));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockRequest.mockClear();
    mockRequest.mockResolvedValue({
      myVenues: VENUES,
      venueSlotRequests: [],
      counterVenueOffer: { slot_id: 's1' },
    });

    await act(async () => {
      await result.current.answers.counter(
        's1',
        { model: 'FLAT', rate: 7000, offerings: [] },
        'Weekend rate',
        2,
      );
    });

    expect(mockRequest).toHaveBeenCalledWith(
      CounterVenueOfferDocument,
      {
        slot_id: 's1',
        terms: { model: VenueOfferModel.Flat, rate: 7000, offerings: [] },
        note: 'Weekend rate',
        round: 2,
      },
      { auth: true },
    );
    expect(result.current.answers.notice).toEqual({
      tone: 'success',
      text: 'Your counter was sent to the host.',
    });
    expect(mockRequest).toHaveBeenCalledWith(VenueSlotRequestsDocument, expect.anything(), {
      auth: true,
    });
    expect(onDecided).toHaveBeenCalled();
  });

  it('re-reads the list without a screen to tell, and keeps a refusal in the open sheet', async () => {
    const { result } = renderHook(() => useVenueSlotRequests());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.answers.accept('s1', 1);
    });
    expect(result.current.answers.notice?.text).toBe('Booking accepted — the pod is now live.');

    mockRequest.mockRejectedValueOnce(new Error('This booking has already started'));
    await act(async () => {
      await result.current.answers.reject('s1', '', 1);
    });
    expect(result.current.answers.error).toBe('This booking has already started');
  });
});
