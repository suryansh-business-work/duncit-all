import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { usePotentialEarnings } from '@/hooks/usePotentialEarnings';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

// 2 spots → 1 payable (the host's own seat is free) → ₹1,000 gross.
const preview = {
  potentialPodEarnings: {
    total_spots: 2,
    payable_spots: 1,
    waterfall: {
      amount: 1000,
      gst_pct: 18,
      gst_amount: 152.54,
      platform_fee_pct: 5,
      platform_fee_amount: 42.37,
      venue_amount: 300,
      host_amount: 505.09,
      host_commission_pct: 10,
      host_commission_amount: 50.51,
      host_receives: 454.58,
      host_earn_pct: 45.46,
    },
  },
};

beforeEach(() => {
  jest.useFakeTimers();
  mockRequest.mockReset();
});
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('usePotentialEarnings', () => {
  it('skips the fetch for a free pod (amount ≤ 0)', () => {
    const { result } = renderHook(() => usePotentialEarnings(0, 30, null, null));
    act(() => jest.advanceTimersByTime(500));
    expect(mockRequest).not.toHaveBeenCalled();
    expect(result.current.waterfall).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('skips the fetch for a 1-spot pod — that spot is the host’s free seat', () => {
    const { result } = renderHook(() => usePotentialEarnings(1000, 1, null, null));
    act(() => jest.advanceTimersByTime(500));
    expect(mockRequest).not.toHaveBeenCalled();
    expect(result.current.projection).toBeNull();
    expect(result.current.waterfall).toBeNull();
  });

  it('sends the raw price + spots and exposes the payable count', async () => {
    mockRequest.mockResolvedValue(preview);
    const { result } = renderHook(() => usePotentialEarnings(1000, 2, 'v1', 300));
    act(() => jest.advanceTimersByTime(399));
    expect(mockRequest).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    await waitFor(() => expect(result.current.waterfall).not.toBeNull());
    // No client-side multiplication — the server bills (spots - 1).
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { pod_amount: 1000, no_of_spots: 2, venue_id: 'v1', venue_amount: 300 },
      { auth: true },
    );
    expect(result.current.projection?.payable_spots).toBe(1);
    expect(result.current.waterfall?.host_receives).toBe(454.58);
    expect(result.current.isLoading).toBe(false);
  });

  it('clears a stale projection when the amount drops to zero', async () => {
    mockRequest.mockResolvedValue(preview);
    const { result, rerender } = renderHook(
      ({ amount }: { amount: number }) => usePotentialEarnings(amount, 2, null, null),
      { initialProps: { amount: 1000 } },
    );
    act(() => jest.advanceTimersByTime(400));
    await waitFor(() => expect(result.current.waterfall).not.toBeNull());
    rerender({ amount: 0 });
    expect(result.current.waterfall).toBeNull();
  });

  it('swallows a failed preview', async () => {
    mockRequest.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => usePotentialEarnings(500, 2, null, null));
    act(() => jest.advanceTimersByTime(400));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.waterfall).toBeNull();
  });

  it('ignores a resolution after unmount', async () => {
    let resolve!: (value: unknown) => void;
    mockRequest.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { result, unmount } = renderHook(() => usePotentialEarnings(500, 2, null, null));
    act(() => jest.advanceTimersByTime(400));
    unmount();
    await act(async () => {
      resolve(preview);
    });
    expect(result.current.waterfall).toBeNull();
  });
});
