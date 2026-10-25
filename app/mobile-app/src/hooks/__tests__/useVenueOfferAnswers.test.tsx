import { act, renderHook } from '@testing-library/react-native';

import { VenueOfferModel } from '@/generated/graphql/graphql';
import {
  ApproveVenueSlotRequestDocument,
  CounterVenueOfferDocument,
  DeclineVenueSlotRequestDocument,
} from '@/graphql/venue-slot-requests';
import { useVenueOfferAnswers } from '@/hooks/useVenueOfferAnswers';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

beforeEach(() => {
  mockRequest.mockReset();
  mockRequest.mockResolvedValue({});
});

const mountAnswers = () => {
  const reread = jest.fn().mockResolvedValue(undefined);
  const hook = renderHook(() => useVenueOfferAnswers(reread));
  return { ...hook, reread };
};

describe('useVenueOfferAnswers', () => {
  it('accepts for the round read, says so and re-reads', async () => {
    const { result, reread } = mountAnswers();
    await act(async () => {
      await result.current.accept('s1', 2);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      ApproveVenueSlotRequestDocument,
      { slot_id: 's1', round: 2 },
      { auth: true },
    );
    expect(result.current.notice?.text).toBe('Booking accepted — the pod is now live.');
    expect(reread).toHaveBeenCalled();
  });

  it('answers a request from before offers without a round', async () => {
    const { result } = mountAnswers();
    await act(async () => {
      await result.current.accept('s1', null);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      ApproveVenueSlotRequestDocument,
      { slot_id: 's1' },
      { auth: true },
    );
  });

  it('rejects with the reason, or none when it is blank', async () => {
    const { result } = mountAnswers();
    await act(async () => {
      await result.current.reject('s1', 'Booked out', 1);
    });
    expect(mockRequest).toHaveBeenLastCalledWith(
      DeclineVenueSlotRequestDocument,
      { slot_id: 's1', reason: 'Booked out', round: 1 },
      { auth: true },
    );
    expect(result.current.notice?.text).toBe('Booking rejected — the host has been told.');
    await act(async () => {
      await result.current.reject('s1', '', 1);
    });
    expect(mockRequest).toHaveBeenLastCalledWith(
      DeclineVenueSlotRequestDocument,
      { slot_id: 's1', reason: null, round: 1 },
      { auth: true },
    );
  });

  it('counters with the terms, the points and the note — or no note', async () => {
    const { result } = mountAnswers();
    await act(async () => {
      await result.current.counter(
        's1',
        { model: 'PER_GUEST', rate: 350, min_guests: 10, offerings: ['Chairs'] },
        'Weekend rate',
        2,
      );
    });
    expect(mockRequest).toHaveBeenLastCalledWith(
      CounterVenueOfferDocument,
      {
        slot_id: 's1',
        terms: {
          model: VenueOfferModel.PerGuest,
          rate: 350,
          min_guests: 10,
          offerings: ['Chairs'],
        },
        note: 'Weekend rate',
        round: 2,
      },
      { auth: true },
    );
    expect(result.current.notice?.text).toBe('Your counter was sent to the host.');
    await act(async () => {
      await result.current.counter('s1', { model: 'FLAT', rate: 7000, offerings: [] }, '', 2);
    });
    expect(mockRequest).toHaveBeenLastCalledWith(
      CounterVenueOfferDocument,
      {
        slot_id: 's1',
        terms: { model: VenueOfferModel.Flat, rate: 7000, offerings: [] },
        note: null,
        round: 2,
      },
      { auth: true },
    );
  });
});
