import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useVenueEarnings } from '@/hooks/useVenueEarnings';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const data = {
  myVenueEarningsSummary: {
    currency_symbol: '₹',
    lifetime_earnings: 2700,
    pending_amount: 270,
    pods_completed: 10,
    this_month_earnings: 540,
  },
  myVenuePayouts: [
    {
      id: 'r1',
      pod_title: 'Cafe jam',
      status: 'APPROVED',
      amount_requested: 270,
      approved_amount: 270,
      created_at: '2026-06-13',
      breakdown: {
        version: 2,
        payout_amount: 270,
        share_amount: 300,
        commission_pct: 10,
        commission_amount: 30,
      },
    },
  ],
};

beforeEach(() => mockRequest.mockReset());

describe('useVenueEarnings', () => {
  it('loads the earnings summary and payout history', async () => {
    mockRequest.mockResolvedValue(data);
    const { result } = renderHook(() => useVenueEarnings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.summary?.lifetime_earnings).toBe(2700);
    expect(result.current.payouts).toHaveLength(1);
  });

  it('swallows a load failure (empty summary + payouts)', async () => {
    mockRequest.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useVenueEarnings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.summary).toBeNull();
    expect(result.current.payouts).toEqual([]);
  });

  it('refetch re-requests on demand', async () => {
    mockRequest.mockResolvedValue(data);
    const { result } = renderHook(() => useVenueEarnings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.refetch();
    });
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it('ignores a resolution after unmount', async () => {
    let resolve!: (value: unknown) => void;
    mockRequest.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { result, unmount } = renderHook(() => useVenueEarnings());
    unmount();
    await act(async () => {
      resolve(data);
    });
    expect(result.current.payouts).toEqual([]);
  });
});
