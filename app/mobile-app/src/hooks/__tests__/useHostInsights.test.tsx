import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useHostInsights } from '@/hooks/useHostInsights';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('useHostInsights', () => {
  it('maps KPIs, status counts and monthly earnings', async () => {
    mockRequest.mockResolvedValue({
      partnerDashboard: { host: { number_of_pods: 7, host_earning: 1234.5 } },
      hostInsights: {
        status_counts: { upcoming: 1, ongoing: 2, completed: 3, cancelled: 4 },
        monthly_earnings: [{ month: '2026-07', total: 100 }],
      },
    });
    const { result } = renderHook(() => useHostInsights());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalPods).toBe(7);
    expect(result.current.hostEarning).toBe(1234.5);
    expect(result.current.statusCounts.cancelled).toBe(4);
    expect(result.current.monthlyEarnings).toHaveLength(1);
  });

  it('falls back to zeros on failure', async () => {
    mockRequest.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useHostInsights());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalPods).toBe(0);
    expect(result.current.hostEarning).toBe(0);
    expect(result.current.statusCounts).toEqual({
      upcoming: 0,
      ongoing: 0,
      completed: 0,
      cancelled: 0,
    });
    expect(result.current.monthlyEarnings).toEqual([]);
  });

  it('ignores a response that resolves after unmount', async () => {
    let resolveLate!: (value: unknown) => void;
    mockRequest.mockReturnValue(
      new Promise((resolve) => {
        resolveLate = resolve;
      }),
    );
    const { unmount } = renderHook(() => useHostInsights());
    unmount();
    await act(async () => {
      resolveLate({
        partnerDashboard: { host: { number_of_pods: 1, host_earning: 1 } },
        hostInsights: {
          status_counts: { upcoming: 0, ongoing: 0, completed: 0, cancelled: 0 },
          monthly_earnings: [],
        },
      });
    });
    expect(mockRequest).toHaveBeenCalled();
  });
});
