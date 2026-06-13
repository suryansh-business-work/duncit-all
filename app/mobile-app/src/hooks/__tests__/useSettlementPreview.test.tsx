import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useSettlementPreview } from '@/hooks/useSettlementPreview';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const preview = {
  podSettlementPreview: { currency_symbol: '₹', collected_total: 5000, has_venue: true, host: {} },
};

beforeEach(() => {
  jest.useFakeTimers();
  mockRequest.mockReset();
});
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('useSettlementPreview', () => {
  it('does not fetch without a pod id', () => {
    const { result } = renderHook(() => useSettlementPreview(null, 0));
    act(() => jest.advanceTimersByTime(400));
    expect(mockRequest).not.toHaveBeenCalled();
    expect(result.current.settlement).toBeNull();
  });

  it('fetches the split after the debounce window', async () => {
    mockRequest.mockResolvedValue(preview);
    const { result } = renderHook(() => useSettlementPreview('p1', 1500));
    act(() => jest.advanceTimersByTime(350));
    await waitFor(() => expect(result.current.settlement).not.toBeNull());
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { pod_id: 'p1', venue_bill_amount: 1500 },
      { auth: true },
    );
    expect(result.current.isLoading).toBe(false);
  });

  it('swallows a failed preview', async () => {
    mockRequest.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useSettlementPreview('p1', 0));
    act(() => jest.advanceTimersByTime(350));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.settlement).toBeNull();
  });

  it('ignores a resolution after unmount', async () => {
    let resolve!: (value: unknown) => void;
    mockRequest.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { result, unmount } = renderHook(() => useSettlementPreview('p1', 0));
    act(() => jest.advanceTimersByTime(350));
    unmount();
    await act(async () => {
      resolve(preview);
    });
    expect(result.current.settlement).toBeNull();
  });
});
