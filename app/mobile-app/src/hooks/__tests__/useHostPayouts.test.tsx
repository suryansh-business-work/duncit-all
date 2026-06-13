import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useHostPayouts } from '@/hooks/useHostPayouts';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const data = {
  myHostPayouts: [
    {
      id: 'r1',
      pod_title: 'Jam',
      status: 'PENDING',
      amount_requested: 100,
      approved_amount: null,
      breakdown: null,
    },
  ],
  publicFinanceSettings: { currency_symbol: 'Rs' },
};

beforeEach(() => mockRequest.mockReset());

describe('useHostPayouts', () => {
  it('loads payouts and currency symbol', async () => {
    mockRequest.mockResolvedValue(data);
    const { result } = renderHook(() => useHostPayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.payouts).toHaveLength(1);
    expect(result.current.symbol).toBe('Rs');
  });

  it('swallows a load failure (list stays empty, default symbol)', async () => {
    mockRequest.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useHostPayouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.payouts).toEqual([]);
    expect(result.current.symbol).toBe('₹');
  });

  it('refetch re-requests on demand', async () => {
    mockRequest.mockResolvedValue(data);
    const { result } = renderHook(() => useHostPayouts());
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
    const { result, unmount } = renderHook(() => useHostPayouts());
    unmount();
    await act(async () => {
      resolve(data);
    });
    expect(result.current.payouts).toEqual([]);
  });
});
