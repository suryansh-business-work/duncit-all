import { act, renderHook, waitFor } from '@testing-library/react-native';
import { logs } from '@duncit/logs';
import type { VenueFoodOrder } from '@duncit/utils';

import { useFoodOrder } from '@/hooks/useFoodOrder';
import { fetchFoodOrder } from '@/services/food-order';
import { readFoodOrder, saveFoodOrder } from '@/services/food-storage';
import { ApiError } from '@/utils/errors';

jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() } },
}));
jest.mock('@/services/food-order', () => ({
  ...jest.requireActual('@/services/food-order'),
  fetchFoodOrder: jest.fn(),
}));
jest.mock('@/services/food-storage', () => ({
  readFoodOrder: jest.fn(),
  saveFoodOrder: jest.fn(() => Promise.resolve()),
}));

const fetchMock = jest.mocked(fetchFoodOrder);
const readMock = jest.mocked(readFoodOrder);
const saveMock = jest.mocked(saveFoodOrder);

const makeOrder = (patch: Partial<VenueFoodOrder> = {}) =>
  ({
    id: 'o1',
    venue_id: 'v1',
    order_no: 'A-12',
    status: 'PLACED',
    payment_status: 'PAID',
    ...patch,
  }) as unknown as VenueFoodOrder;

const STORED = {
  order_id: 'o1',
  venue_id: 'v1',
  order_no: 'A-12',
  access_key: 'stored-key',
  client_key: 'client-1',
  saved_at: 1,
  finished: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  readMock.mockResolvedValue(null);
});

describe('useFoodOrder', () => {
  it('reads the order with the link key and keeps it on the device', async () => {
    fetchMock.mockResolvedValue(makeOrder());
    const { result } = renderHook(() => useFoodOrder('o1', 'link-key'));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.order?.order_no).toBe('A-12'));
    expect(fetchMock).toHaveBeenCalledWith('o1', 'link-key');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.accessKey).toBe('link-key');
    expect(result.current.clientKey).toBe('');
    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith({
        order_id: 'o1',
        venue_id: 'v1',
        order_no: 'A-12',
        access_key: 'link-key',
        client_key: '',
        finished: false,
      }),
    );
  });

  it('falls back to the key the device remembered and exposes its client key', async () => {
    readMock.mockResolvedValue(STORED);
    fetchMock.mockResolvedValue(makeOrder({ status: 'SERVED' }));
    const { result } = renderHook(() => useFoodOrder('o1', null));
    await waitFor(() => expect(result.current.order).not.toBeNull());
    expect(fetchMock).toHaveBeenCalledWith('o1', 'stored-key');
    expect(result.current.accessKey).toBe('stored-key');
    expect(result.current.clientKey).toBe('client-1');
    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith(expect.objectContaining({ finished: true })),
    );
  });

  it('opens a member order with no key and saves nothing', async () => {
    fetchMock.mockResolvedValue(makeOrder());
    const { result } = renderHook(() => useFoodOrder('o1', null));
    await waitFor(() => expect(result.current.order).not.toBeNull());
    expect(fetchMock).toHaveBeenCalledWith('o1', null);
    expect(result.current.accessKey).toBeNull();
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('does not read anything for an empty order id', async () => {
    const { result } = renderHook(() => useFoodOrder('', 'k'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.order).toBeNull();
  });

  it('reports a failed first read with its error code and logs it', async () => {
    const failure = new ApiError('nope', 403, { code: 'FOOD_ORDER_FORBIDDEN' });
    fetchMock.mockRejectedValue(failure);
    const { result } = renderHook(() => useFoodOrder('o1', 'k'));
    await waitFor(() => expect(result.current.error).toBe(failure));
    expect(result.current.errorCode).toBe('FOOD_ORDER_FORBIDDEN');
    expect(result.current.loading).toBe(false);
    expect(logs.mobileApp.warn).toHaveBeenCalledWith(
      'venueFood',
      'readOrder',
      expect.objectContaining({ orderId: 'o1', code: 'FOOD_ORDER_FORBIDDEN' }),
    );
  });

  it('keeps the order on screen when a re-read fails', async () => {
    fetchMock.mockResolvedValueOnce(makeOrder());
    const { result } = renderHook(() => useFoodOrder('o1', 'k'));
    await waitFor(() => expect(result.current.order).not.toBeNull());
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.order?.order_no).toBe('A-12');
    expect(result.current.error).toBeNull();
    expect(result.current.errorCode).toBe('');
    expect(logs.mobileApp.warn).toHaveBeenCalledTimes(1);
  });

  it('lets only the latest read answer', async () => {
    let resolveSlow: (order: VenueFoodOrder) => void = () => undefined;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => (resolveSlow = resolve)));
    const { result } = renderHook(() => useFoodOrder('o1', 'k'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fetchMock.mockResolvedValueOnce(makeOrder({ order_no: 'NEW' }));
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.order?.order_no).toBe('NEW');
    await act(async () => resolveSlow(makeOrder({ order_no: 'OLD' })));
    expect(result.current.order?.order_no).toBe('NEW');
  });

  it('drops a stale failure that arrives after a newer read', async () => {
    let rejectSlow: (error: Error) => void = () => undefined;
    fetchMock.mockImplementationOnce(() => new Promise((_, reject) => (rejectSlow = reject)));
    const { result } = renderHook(() => useFoodOrder('o1', 'k'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fetchMock.mockResolvedValueOnce(makeOrder());
    await act(async () => {
      await result.current.refetch();
    });
    await act(async () => rejectSlow(new Error('late')));
    expect(result.current.order).not.toBeNull();
    expect(logs.mobileApp.warn).not.toHaveBeenCalled();
  });

  it('ignores what the device remembered when the screen is gone before it is read', async () => {
    let resolveRead: (value: typeof STORED) => void = () => undefined;
    readMock.mockImplementationOnce(() => new Promise((resolve) => (resolveRead = resolve)));
    const { unmount } = renderHook(() => useFoodOrder('o1', null));
    unmount();
    await act(async () => resolveRead(STORED));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe('polling', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('re-reads every 8s while payment is pending and every 20s once paid', async () => {
      fetchMock.mockResolvedValue(makeOrder({ payment_status: 'PENDING' }));
      const { result } = renderHook(() => useFoodOrder('o1', 'k'));
      await waitFor(() => expect(result.current.order).not.toBeNull());
      expect(fetchMock).toHaveBeenCalledTimes(1);
      fetchMock.mockResolvedValue(makeOrder({ payment_status: 'PAID' }));
      await act(async () => {
        await jest.advanceTimersByTimeAsync(8000);
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(8000);
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(12_000);
      });
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('stops polling once the order is served', async () => {
      fetchMock.mockResolvedValue(makeOrder({ status: 'SERVED' }));
      const { result } = renderHook(() => useFoodOrder('o1', 'k'));
      await waitFor(() => expect(result.current.order).not.toBeNull());
      await act(async () => {
        await jest.advanceTimersByTimeAsync(60_000);
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
