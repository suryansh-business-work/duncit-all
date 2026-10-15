import { act, renderHook, waitFor } from '@testing-library/react-native';
import { logs } from '@duncit/logs';
import type { VenueFoodRating } from '@duncit/utils';

import { useVenueFoodRating } from '@/hooks/useVenueFoodRating';
import { fetchVenueFoodRating } from '@/services/food-customer';

jest.mock('@/services/food-customer', () => ({ fetchVenueFoodRating: jest.fn() }));
const fetchRating = jest.mocked(fetchVenueFoodRating);

let warn: jest.SpyInstance;

beforeEach(() => {
  fetchRating.mockReset();
  warn = jest.spyOn(logs.mobileApp, 'warn').mockImplementation(() => undefined);
});

afterEach(() => warn.mockRestore());

describe('useVenueFoodRating', () => {
  it('answers the venue’s rating once somebody has rated', async () => {
    const rating = { venue_id: 'v1', average: 4.26, count: 12 };
    fetchRating.mockResolvedValue(rating);
    const { result } = renderHook(() => useVenueFoodRating('v1'));
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toEqual(rating));
    expect(fetchRating).toHaveBeenCalledWith('v1');
  });

  it('stays empty while nobody has rated — no rating is not a score of zero', async () => {
    fetchRating.mockResolvedValue({ venue_id: 'v1', average: 0, count: 0 });
    const { result } = renderHook(() => useVenueFoodRating('v1'));
    await waitFor(() => expect(fetchRating).toHaveBeenCalled());
    await act(async () => undefined);
    expect(result.current).toBeNull();
  });

  it('asks nothing without a venue', () => {
    const { result } = renderHook(() => useVenueFoodRating(''));
    expect(fetchRating).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });

  it('logs a failed read and shows nothing — the menu is never held up by it', async () => {
    fetchRating.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useVenueFoodRating('v1'));
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith('venueFood', 'rating', {
        error: expect.any(Error),
        venueId: 'v1',
      }),
    );
    expect(result.current).toBeNull();
  });

  it('ignores an answer that lands after the venue changed', async () => {
    let answerFirst: (rating: VenueFoodRating) => void = () => undefined;
    fetchRating
      .mockReturnValueOnce(
        new Promise((resolve) => {
          answerFirst = resolve;
        }),
      )
      .mockResolvedValueOnce({ venue_id: 'v2', average: 3, count: 2 });
    const { result, rerender } = renderHook(({ id }: { id: string }) => useVenueFoodRating(id), {
      initialProps: { id: 'v1' },
    });

    rerender({ id: 'v2' });
    await waitFor(() => expect(result.current?.venue_id).toBe('v2'));
    await act(async () => {
      answerFirst({ venue_id: 'v1', average: 5, count: 9 });
      await Promise.resolve();
    });
    expect(result.current).toEqual({ venue_id: 'v2', average: 3, count: 2 });
  });
});
