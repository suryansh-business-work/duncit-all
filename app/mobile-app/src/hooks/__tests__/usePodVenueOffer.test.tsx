import { act, renderHook, waitFor } from '@testing-library/react-native';

import { VenueOfferModel } from '@/generated/graphql/graphql';
import {
  AcceptVenueCounterOfferDocument,
  CounterVenueOfferAsHostDocument,
  PodVenueOfferDocument,
  RejectVenueCounterOfferDocument,
} from '@/graphql/venue-offer';
import { usePodVenueOffer } from '@/hooks/usePodVenueOffer';
import { graphqlRequest } from '@/services/graphql.client';
import { counteredOffer } from '@/utils/venue-offer-fixture';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
const mockWarn = jest.fn();
jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { warn: (...args: unknown[]) => mockWarn(...args), error: jest.fn() } },
}));

const live = counteredOffer();

beforeEach(() => {
  mockRequest.mockReset();
  mockWarn.mockReset();
  mockRequest.mockImplementation((doc: unknown) =>
    Promise.resolve(doc === PodVenueOfferDocument ? { podVenueOffer: live } : {}),
  );
});

describe('usePodVenueOffer', () => {
  it("reads the pod's live offer", async () => {
    const { result } = renderHook(() => usePodVenueOffer('pod-1'));
    await waitFor(() => expect(result.current.offer).toEqual(live));
    expect(mockRequest).toHaveBeenCalledWith(
      PodVenueOfferDocument,
      { pod_id: 'pod-1' },
      { auth: true },
    );
  });

  it('reads nothing without a pod, and keeps nothing when the pod has no offer', async () => {
    renderHook(() => usePodVenueOffer(''));
    expect(mockRequest).not.toHaveBeenCalled();

    mockRequest.mockResolvedValue({ podVenueOffer: null });
    const { result } = renderHook(() => usePodVenueOffer('pod-2'));
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(result.current.offer).toBeNull();
  });

  it('logs a failed read and keeps what it showed', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => usePodVenueOffer('pod-1'));
    await waitFor(() =>
      expect(mockWarn).toHaveBeenCalledWith('usePodVenueOffer', 'load', {
        error: expect.any(Error),
        pod_id: 'pod-1',
      }),
    );
    expect(result.current.offer).toBeNull();
  });

  it("accepts the venue's counter for the round read, then re-reads the offer and the screen", async () => {
    const onAnswered = jest.fn();
    const { result } = renderHook(() => usePodVenueOffer('pod-1', onAnswered));
    await waitFor(() => expect(result.current.offer).toEqual(live));
    mockRequest.mockClear();
    await act(async () => {
      await result.current.host.accept(2);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      AcceptVenueCounterOfferDocument,
      { pod_id: 'pod-1', round: 2 },
      { auth: true },
    );
    expect(mockRequest).toHaveBeenCalledWith(
      PodVenueOfferDocument,
      { pod_id: 'pod-1' },
      { auth: true },
    );
    expect(onAnswered).toHaveBeenCalled();
    expect(result.current.host.notice?.text).toBe('Accepted — your pod is live.');
  });

  it('rejects with a reason (or none) and counters back with terms and a note (or none)', async () => {
    const { result } = renderHook(() => usePodVenueOffer('pod-1'));
    await act(async () => {
      await result.current.host.reject('Too dear', 2);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      RejectVenueCounterOfferDocument,
      { pod_id: 'pod-1', reason: 'Too dear', round: 2 },
      { auth: true },
    );
    expect(result.current.host.notice?.text).toBe('Rejected — you can send a new offer.');
    await act(async () => {
      await result.current.host.reject('', 2);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      RejectVenueCounterOfferDocument,
      { pod_id: 'pod-1', reason: null, round: 2 },
      { auth: true },
    );

    await act(async () => {
      await result.current.host.counter(
        { model: 'PER_GUEST', rate: 320, min_guests: 8, offerings: ['Chairs'] },
        'Meet halfway?',
        2,
      );
    });
    expect(mockRequest).toHaveBeenCalledWith(
      CounterVenueOfferAsHostDocument,
      {
        pod_id: 'pod-1',
        terms: { model: VenueOfferModel.PerGuest, rate: 320, min_guests: 8, offerings: ['Chairs'] },
        note: 'Meet halfway?',
        round: 2,
      },
      { auth: true },
    );
    expect(result.current.host.notice?.text).toBe('Your counter was sent to the venue.');
    await act(async () => {
      await result.current.host.counter({ model: 'FLAT', rate: 6000, offerings: [] }, '', 2);
    });
    expect(mockRequest).toHaveBeenLastCalledWith(
      PodVenueOfferDocument,
      { pod_id: 'pod-1' },
      { auth: true },
    );
    expect(mockRequest).toHaveBeenCalledWith(
      CounterVenueOfferAsHostDocument,
      {
        pod_id: 'pod-1',
        terms: { model: VenueOfferModel.Flat, rate: 6000, offerings: [] },
        note: null,
        round: 2,
      },
      { auth: true },
    );
  });
});
