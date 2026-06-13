import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useWallet } from '@/hooks/useWallet';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const data = {
  myWallet: {
    balance: 1500,
    currency_symbol: '₹',
    payout_mode: 'IMMEDIATE',
    next_payout_at: '2026-06-20T00:00:00Z',
  },
  myWalletTransactions: [
    {
      id: 't1',
      type: 'CREDIT',
      amount: 1500,
      source: 'POD_COMPLETION',
      reason: 'Payout',
      created_at: '2026-06-13',
    },
  ],
  myWithdrawals: [
    {
      id: 'w1',
      amount: 500,
      status: 'PENDING',
      payout_method: 'UPI',
      scheduled_for: '2026-06-20',
      reject_reason: '',
      created_at: '2026-06-13',
    },
  ],
};

beforeEach(() => mockRequest.mockReset());

describe('useWallet', () => {
  it('loads the wallet, transactions and withdrawals', async () => {
    mockRequest.mockResolvedValue(data);
    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.wallet?.balance).toBe(1500);
    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.withdrawals).toHaveLength(1);
  });

  it('swallows a load failure', async () => {
    mockRequest.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.wallet).toBeNull();
  });

  it('refetch re-requests on demand', async () => {
    mockRequest.mockResolvedValue(data);
    const { result } = renderHook(() => useWallet());
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
    const { result, unmount } = renderHook(() => useWallet());
    unmount();
    await act(async () => {
      resolve(data);
    });
    expect(result.current.wallet).toBeNull();
  });
});
