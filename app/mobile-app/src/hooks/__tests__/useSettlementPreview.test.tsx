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
    const { result } = renderHook(() => useSettlementPreview(null, 0, 0));
    act(() => jest.advanceTimersByTime(400));
    expect(mockRequest).not.toHaveBeenCalled();
    expect(result.current.settlement).toBeNull();
  });

  it('fetches the split after the debounce window, with the extra charges and never the slot choice', async () => {
    mockRequest.mockResolvedValue(preview);
    const { result } = renderHook(() => useSettlementPreview('p1', 1500, 0));
    // Nothing is asked before the host stops typing.
    act(() => jest.advanceTimersByTime(349));
    expect(mockRequest).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    await waitFor(() => expect(result.current.settlement).not.toBeNull());
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { pod_id: 'p1', venue_bill_amount: 1500, venue_extra_amount: 0 },
      { auth: true },
    );
    expect(mockRequest.mock.calls[0][1]).not.toHaveProperty('include_slot_price');
    expect(result.current.isLoading).toBe(false);
  });

  it('sends the venue usage when it is entered', async () => {
    mockRequest.mockResolvedValue(preview);
    renderHook(() => useSettlementPreview('p1', 1500, 200, 12, 1.5));
    act(() => jest.advanceTimersByTime(350));
    await waitFor(() =>
      expect(mockRequest).toHaveBeenCalledWith(
        expect.anything(),
        {
          pod_id: 'p1',
          venue_bill_amount: 1500,
          venue_extra_amount: 200,
          venue_pax: 12,
          overtime_hours: 1.5,
        },
        { auth: true },
      ),
    );
  });

  it('fetches again when the extra charges change, and not when nothing did', async () => {
    mockRequest.mockResolvedValue(preview);
    const { result, rerender } = renderHook(
      ({ extra }: { extra: number }) => useSettlementPreview('p1', 1500, extra),
      { initialProps: { extra: 0 } },
    );
    act(() => jest.advanceTimersByTime(350));
    await waitFor(() => expect(result.current.settlement).not.toBeNull());
    expect(mockRequest).toHaveBeenCalledTimes(1);

    // Same pod, same bill — only the extra charges moved.
    rerender({ extra: 300 });
    act(() => jest.advanceTimersByTime(350));
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(2));
    expect(mockRequest).toHaveBeenLastCalledWith(
      expect.anything(),
      { pod_id: 'p1', venue_bill_amount: 1500, venue_extra_amount: 300 },
      { auth: true },
    );

    // An unchanged amount is not a reason to ask again.
    rerender({ extra: 300 });
    act(() => jest.advanceTimersByTime(350));
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it('surfaces the server error message on a failed preview', async () => {
    mockRequest.mockRejectedValue(new Error('Only a host of this pod can do that'));
    const { result } = renderHook(() => useSettlementPreview('p1', 0, 0));
    act(() => jest.advanceTimersByTime(350));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.settlement).toBeNull();
    expect(result.current.error).toBe('Only a host of this pod can do that');
  });

  it('falls back to a generic message for a non-Error rejection, and clears on success', async () => {
    mockRequest.mockRejectedValueOnce('boom');
    const { result, rerender } = renderHook(
      ({ bill }: { bill: number }) => useSettlementPreview('p1', bill, 0),
      { initialProps: { bill: 0 } },
    );
    act(() => jest.advanceTimersByTime(350));
    await waitFor(() => expect(result.current.error).toBe('Could not load the settlement preview'));

    // The next successful fetch clears the error.
    mockRequest.mockResolvedValue(preview);
    rerender({ bill: 100 });
    act(() => jest.advanceTimersByTime(350));
    await waitFor(() => expect(result.current.settlement).not.toBeNull());
    expect(result.current.error).toBeNull();
  });

  it('ignores a rejection after unmount', async () => {
    let reject!: (reason: unknown) => void;
    mockRequest.mockReturnValue(
      new Promise((_r, rej) => {
        reject = rej;
      }),
    );
    const { result, unmount } = renderHook(() => useSettlementPreview('p1', 0, 0));
    act(() => jest.advanceTimersByTime(350));
    unmount();
    await act(async () => {
      reject(new Error('late'));
    });
    expect(result.current.error).toBeNull();
  });

  it('ignores a resolution after unmount', async () => {
    let resolve!: (value: unknown) => void;
    mockRequest.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { result, unmount } = renderHook(() => useSettlementPreview('p1', 0, 0));
    act(() => jest.advanceTimersByTime(350));
    unmount();
    await act(async () => {
      resolve(preview);
    });
    expect(result.current.settlement).toBeNull();
  });
});
