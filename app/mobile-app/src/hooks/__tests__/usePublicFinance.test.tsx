import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { usePublicFinance } from '@/hooks/usePublicFinance';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
beforeEach(() => mockRequest.mockReset());

describe('usePublicFinance', () => {
  it('defaults to 0% GST / ₹, then loads the public settings', async () => {
    mockRequest.mockResolvedValueOnce({
      publicFinanceSettings: { gst_pct: 18, currency_symbol: '$' },
    });
    const { result } = renderHook(() => usePublicFinance());
    expect(result.current).toEqual({ gstPct: 0, currency: '₹' });
    await waitFor(() => expect(result.current.gstPct).toBe(18));
    expect(result.current.currency).toBe('$');
  });

  it('keeps the defaults when the fetch fails', async () => {
    mockRequest.mockRejectedValueOnce(new Error('down'));
    const { result } = renderHook(() => usePublicFinance());
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(result.current).toEqual({ gstPct: 0, currency: '₹' });
  });

  it('drops a response that lands after unmount', async () => {
    let resolve!: (v: unknown) => void;
    mockRequest.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { result, unmount } = renderHook(() => usePublicFinance());
    unmount();
    await act(async () => {
      resolve({ publicFinanceSettings: { gst_pct: 18, currency_symbol: '₹' } });
    });
    // The active-guard skips the post-unmount state update; defaults are kept.
    expect(result.current).toEqual({ gstPct: 0, currency: '₹' });
  });
});
