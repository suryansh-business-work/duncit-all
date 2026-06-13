import { act, renderHook, waitFor } from '@testing-library/react-native';

import { HostDashboardDocument, HostDashboardPodsDocument } from '@/graphql/studio-dashboard';
import { graphqlRequest } from '@/services/graphql.client';
import { useHostDashboard } from '@/hooks/useHostDashboard';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

function route(doc: unknown) {
  if (doc === HostDashboardDocument)
    return Promise.resolve({
      me: { user_id: 'h1', full_name: 'Riya' },
      myWallet: { balance: 1200, currency_symbol: '₹', next_payout_at: future },
      myAccountHealth: { total_score: 82, band: 'GREEN' },
    });
  if (doc === HostDashboardPodsDocument)
    return Promise.resolve({
      pods: [
        { id: 'p1', pod_date_time: future, pod_type: 'NATIVE_PAID' },
        { id: 'p2', pod_date_time: past, pod_type: 'NATIVE_FREE' },
      ],
    });
  return Promise.resolve({});
}

beforeEach(() => mockRequest.mockReset().mockImplementation(route));

describe('useHostDashboard', () => {
  it('loads wallet, health and computes pod stats', async () => {
    const { result } = renderHook(() => useHostDashboard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.wallet?.balance).toBe(1200);
    expect(result.current.health?.total_score).toBe(82);
    expect(result.current.stats).toEqual({ total: 2, upcoming: 1, paid: 1 });
  });

  it('skips the pods fetch when there is no user id', async () => {
    mockRequest.mockReset().mockImplementation((doc) => {
      if (doc === HostDashboardDocument)
        return Promise.resolve({ me: null, myWallet: null, myAccountHealth: null });
      return Promise.resolve({});
    });
    const { result } = renderHook(() => useHostDashboard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats).toEqual({ total: 0, upcoming: 0, paid: 0 });
    expect(mockRequest).not.toHaveBeenCalledWith(
      HostDashboardPodsDocument,
      expect.anything(),
      expect.anything(),
    );
  });

  it('tolerates a pods fetch failure', async () => {
    mockRequest.mockReset().mockImplementation((doc) => {
      if (doc === HostDashboardPodsDocument) return Promise.reject(new Error('down'));
      return route(doc);
    });
    const { result } = renderHook(() => useHostDashboard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.wallet?.balance).toBe(1200);
    expect(result.current.stats.total).toBe(0);
  });

  it('captures a load error', async () => {
    mockRequest.mockReset().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useHostDashboard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
  });

  it('ignores a response that resolves after unmount', async () => {
    let resolveMe!: (value: unknown) => void;
    mockRequest.mockReset().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMe = resolve;
        }),
    );
    const { unmount } = renderHook(() => useHostDashboard());
    unmount();
    await act(async () => {
      resolveMe({ me: { user_id: 'h1' }, myWallet: null, myAccountHealth: null });
    });
  });
});
