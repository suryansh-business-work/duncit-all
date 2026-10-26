import { act, renderHook } from '@testing-library/react-native';

import { VenueOfferModel } from '@/generated/graphql/graphql';
import {
  EditVenueOfferCounterDocument,
  WithdrawVenueOfferCounterDocument,
} from '@/graphql/venue-offer';
import { useOfferRevise } from '@/hooks/useOfferRevise';
import { graphqlRequest } from '@/services/graphql.client';
import { ApiError } from '@/utils/errors';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
const PHOTO = 'https://ik.imagekit.io/duncit/chat/menu.jpg';

beforeEach(() => {
  mockRequest.mockReset();
  mockRequest.mockResolvedValue({});
});

const mountRevise = () => {
  const reread = jest.fn().mockResolvedValue(undefined);
  const hook = renderHook(() => useOfferRevise('pod-1', reread));
  return { ...hook, reread };
};

describe('useOfferRevise', () => {
  it('saves an edit with its terms, photos and note for the round read, says so and re-reads', async () => {
    const { result, reread } = mountRevise();
    let closed = false;
    await act(async () => {
      closed = await result.current.edit(
        { model: 'FLAT', rate: 6500, offerings: ['Hall'], images: [PHOTO] },
        'Includes cleaning',
        3,
      );
    });
    expect(closed).toBe(true);
    expect(mockRequest).toHaveBeenCalledWith(
      EditVenueOfferCounterDocument,
      {
        pod_id: 'pod-1',
        terms: { model: VenueOfferModel.Flat, rate: 6500, offerings: ['Hall'], images: [PHOTO] },
        note: 'Includes cleaning',
        round: 3,
      },
      { auth: true },
    );
    expect(result.current.notice?.text).toBe('Your counter was updated.');
    expect(reread).toHaveBeenCalled();
  });

  it('sends no note when the note was cleared', async () => {
    const { result } = mountRevise();
    await act(async () => {
      await result.current.edit({ model: 'PER_HOUR', rate: 900, offerings: [] }, '', 4);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      EditVenueOfferCounterDocument,
      expect.objectContaining({ note: null, round: 4 }),
      { auth: true },
    );
  });

  it('withdraws for the round read, says so and re-reads', async () => {
    const { result, reread } = mountRevise();
    await act(async () => {
      await result.current.withdraw(5);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      WithdrawVenueOfferCounterDocument,
      { pod_id: 'pod-1', round: 5 },
      { auth: true },
    );
    expect(result.current.notice?.text).toBe('Your counter was withdrawn.');
    expect(reread).toHaveBeenCalled();
  });

  it('keeps the sheet open with the reason once the other side has seen the counter', async () => {
    mockRequest.mockRejectedValue(
      new ApiError('The other side has already seen this counter', 400, { reason: 'OFFER_SEEN' }),
    );
    const { result, reread } = mountRevise();
    let closed = true;
    await act(async () => {
      closed = await result.current.withdraw(5);
    });
    expect(closed).toBe(false);
    expect(result.current.error).toBe('The other side has already seen this counter');
    expect(result.current.notice).toBeNull();
    expect(reread).not.toHaveBeenCalled();
  });

  it('says the terms changed and re-reads when the round moved on first', async () => {
    mockRequest.mockRejectedValue(new ApiError('Stale', 409, { reason: 'OFFER_CHANGED' }));
    const { result, reread } = mountRevise();
    let closed = false;
    await act(async () => {
      closed = await result.current.edit({ model: 'FLAT', rate: 6500, offerings: [] }, '', 3);
    });
    expect(closed).toBe(true);
    expect(result.current.notice).toEqual({
      tone: 'warning',
      text: expect.stringContaining('changed'),
    });
    expect(reread).toHaveBeenCalled();
  });
});
