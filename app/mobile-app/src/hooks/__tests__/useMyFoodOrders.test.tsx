import { act, renderHook, waitFor } from '@testing-library/react-native';
import { logs } from '@duncit/logs';
import type { MyVenueFoodOrder, MyVenueFoodOrdersPage } from '@duncit/utils';

import { useMyFoodOrders } from '@/hooks/useMyFoodOrders';
import { fetchMyFoodOrders } from '@/services/food-customer';
import { storedFoodOrderKeys } from '@/services/food-storage';

type Listener = () => void;
const mockListeners: Record<string, Listener[]> = {};
const mockOff = jest.fn();
const mockNavigation = {
  addListener: jest.fn((event: string, listener: Listener) => {
    (mockListeners[event] ??= []).push(listener);
    return mockOff;
  }),
};
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigation }));
jest.mock('@/services/food-customer', () => ({ fetchMyFoodOrders: jest.fn() }));
jest.mock('@/services/food-storage', () => ({ storedFoodOrderKeys: jest.fn() }));

const fetchPage = jest.mocked(fetchMyFoodOrders);
const keys = jest.mocked(storedFoodOrderKeys);

const emit = (event: string) => act(() => mockListeners[event]?.forEach((listener) => listener()));

const row = (id: string): MyVenueFoodOrder => ({
  id,
  order_no: `F-${id}`,
  venue_id: 'v1',
  venue_name: 'Cafe',
  total: 216,
  currency_symbol: '₹',
  status: 'PREPARING',
  payment_status: 'PAID',
  created_at: '2026-10-13T10:00:00.000Z',
  items: [{ name: 'Masala Chai', quantity: 2 }],
});

const page = (
  rows: MyVenueFoodOrder[],
  over: Partial<MyVenueFoodOrdersPage> = {},
): MyVenueFoodOrdersPage => ({ rows, total: rows.length, page: 1, page_size: 10, ...over });

/** A request the test answers when it chooses. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const STORED = [{ order_id: 'o1', access_key: 'ak1' }];
let warn: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  for (const event of Object.keys(mockListeners)) delete mockListeners[event];
  keys.mockResolvedValue(STORED);
  warn = jest.spyOn(logs.mobileApp, 'warn').mockImplementation(() => undefined);
});

afterEach(() => warn.mockRestore());

describe('useMyFoodOrders', () => {
  it('reads the first page with this device’s keys and says when more wait', async () => {
    fetchPage.mockResolvedValue(page([row('o1')], { total: 15 }));
    const { result } = renderHook(() => useMyFoodOrders('PAST', 10));
    expect(result.current.loading).toBe(true);
    expect(result.current.hasMore).toBe(false);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchPage).toHaveBeenCalledWith({
      scope: 'PAST',
      venue_id: null,
      keys: STORED,
      page: 1,
      page_size: 10,
    });
    expect(result.current.rows).toEqual([row('o1')]);
    expect(result.current.keys).toEqual(STORED);
    expect(result.current.failed).toBe(false);
    expect(result.current.hasMore).toBe(true);
  });

  it('narrows the read to one venue when given one', async () => {
    fetchPage.mockResolvedValue(page([]));
    const { result } = renderHook(() => useMyFoodOrders('CURRENT', 20, 'v1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchPage).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'CURRENT', venue_id: 'v1', page_size: 20 }),
    );
    expect(result.current.rows).toEqual([]);
    expect(result.current.hasMore).toBe(false);
  });

  it('fails with nothing to show, logs why, and recovers on a reload', async () => {
    fetchPage.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useMyFoodOrders('CURRENT', 20));

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.loading).toBe(false);
    expect(warn).toHaveBeenCalledWith('venueFood', 'myOrders', {
      error: expect.any(Error),
      scope: 'CURRENT',
    });

    fetchPage.mockResolvedValueOnce(page([row('o1')]));
    await act(() => result.current.reload());
    expect(result.current.failed).toBe(false);
    expect(result.current.rows).toEqual([row('o1')]);
  });

  it('keeps the list on screen when a re-read fails', async () => {
    fetchPage.mockResolvedValueOnce(page([row('o1')]));
    const { result } = renderHook(() => useMyFoodOrders('CURRENT', 20));
    await waitFor(() => expect(result.current.rows).toHaveLength(1));

    fetchPage.mockRejectedValueOnce(new Error('offline'));
    await act(() => result.current.reload());
    expect(result.current.failed).toBe(false);
    expect(result.current.rows).toEqual([row('o1')]);
  });

  it('lets only the latest read answer, whether the older one lands or fails', async () => {
    const first = deferred<MyVenueFoodOrdersPage>();
    const second = deferred<MyVenueFoodOrdersPage>();
    const third = deferred<MyVenueFoodOrdersPage>();
    fetchPage
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockReturnValueOnce(third.promise);
    const { result } = renderHook(() => useMyFoodOrders('CURRENT', 20));
    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(1));

    let reloads: Promise<void>[] = [];
    act(() => {
      reloads = [result.current.reload(), result.current.reload()];
    });
    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(3));

    await act(async () => {
      third.resolve(page([row('new')]));
      await reloads[1];
    });
    await act(async () => {
      first.resolve(page([row('stale')]));
      second.reject(new Error('late'));
      await reloads[0];
    });

    expect(result.current.rows).toEqual([row('new')]);
    expect(result.current.failed).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it('reads again when the screen comes back into view, not on its first focus', async () => {
    fetchPage.mockResolvedValue(page([row('o1')]));
    renderHook(() => useMyFoodOrders('CURRENT', 20));
    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(1));

    emit('focus');
    expect(fetchPage).toHaveBeenCalledTimes(1);

    emit('blur');
    emit('focus');
    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(2));
  });

  it('stops listening, and ignores a read still in flight, once unmounted', async () => {
    const pending = deferred<MyVenueFoodOrdersPage>();
    fetchPage.mockReturnValueOnce(pending.promise);
    const { result, unmount } = renderHook(() => useMyFoodOrders('CURRENT', 20));
    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(1));

    unmount();
    expect(mockOff).toHaveBeenCalledTimes(2);
    await act(async () => {
      pending.resolve(page([row('o1')]));
      await pending.promise;
    });
    expect(result.current.rows).toEqual([]);
  });

  describe('loadMore', () => {
    it('appends the next page with the same keys, without repeating an order', async () => {
      fetchPage.mockResolvedValueOnce(page([row('o1'), row('o2')], { page_size: 2, total: 3 }));
      const { result } = renderHook(() => useMyFoodOrders('PAST', 2, 'v1'));
      await waitFor(() => expect(result.current.hasMore).toBe(true));

      fetchPage.mockResolvedValueOnce(
        page([row('o2'), row('o3')], { page: 2, page_size: 2, total: 3 }),
      );
      await act(() => result.current.loadMore());

      expect(fetchPage).toHaveBeenLastCalledWith({
        scope: 'PAST',
        venue_id: 'v1',
        keys: STORED,
        page: 2,
        page_size: 2,
      });
      expect(result.current.rows.map((order) => order.id)).toEqual(['o1', 'o2', 'o3']);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.loadingMore).toBe(false);
    });

    it('asks nothing before the first page has come back', async () => {
      const pending = deferred<MyVenueFoodOrdersPage>();
      fetchPage.mockReturnValueOnce(pending.promise);
      const { result } = renderHook(() => useMyFoodOrders('PAST', 10));
      await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(1));

      await act(() => result.current.loadMore());
      expect(fetchPage).toHaveBeenCalledTimes(1);
      await act(async () => {
        pending.resolve(page([]));
        await pending.promise;
      });
    });

    it('asks once while a further page is already on its way', async () => {
      fetchPage.mockResolvedValueOnce(page([row('o1')], { page_size: 1, total: 3 }));
      const { result } = renderHook(() => useMyFoodOrders('PAST', 1));
      await waitFor(() => expect(result.current.hasMore).toBe(true));

      const more = deferred<MyVenueFoodOrdersPage>();
      fetchPage.mockReturnValueOnce(more.promise);
      let first: Promise<void> = Promise.resolve();
      act(() => {
        first = result.current.loadMore();
      });
      expect(result.current.loadingMore).toBe(true);
      await act(() => result.current.loadMore());
      expect(fetchPage).toHaveBeenCalledTimes(2);

      await act(async () => {
        more.resolve(page([row('o2')], { page: 2, page_size: 1, total: 3 }));
        await first;
      });
      expect(result.current.rows).toHaveLength(2);
    });

    it('says a further page failed and keeps what is shown', async () => {
      fetchPage.mockResolvedValueOnce(page([row('o1')], { page_size: 1, total: 2 }));
      const { result } = renderHook(() => useMyFoodOrders('PAST', 1));
      await waitFor(() => expect(result.current.hasMore).toBe(true));

      fetchPage.mockRejectedValueOnce(new Error('offline'));
      await act(() => result.current.loadMore());

      expect(result.current.moreFailed).toBe(true);
      expect(result.current.loadingMore).toBe(false);
      expect(result.current.rows).toEqual([row('o1')]);
      expect(warn).toHaveBeenCalledWith('venueFood', 'myOrdersMore', {
        error: expect.any(Error),
        scope: 'PAST',
      });

      // A fresh read clears the old failure.
      fetchPage.mockResolvedValueOnce(page([row('o1')], { page_size: 1, total: 2 }));
      await act(() => result.current.reload());
      expect(result.current.moreFailed).toBe(false);
    });

    it('drops a further page that lands after the list was read again', async () => {
      fetchPage.mockResolvedValueOnce(page([row('o1')], { page_size: 1, total: 2 }));
      const { result } = renderHook(() => useMyFoodOrders('PAST', 1));
      await waitFor(() => expect(result.current.hasMore).toBe(true));

      const more = deferred<MyVenueFoodOrdersPage>();
      fetchPage.mockReturnValueOnce(more.promise);
      let pendingMore: Promise<void> = Promise.resolve();
      act(() => {
        pendingMore = result.current.loadMore();
      });
      fetchPage.mockResolvedValueOnce(page([row('fresh')], { page_size: 1, total: 1 }));
      await act(() => result.current.reload());

      await act(async () => {
        more.resolve(page([row('o2')], { page: 2, page_size: 1, total: 2 }));
        await pendingMore;
      });
      expect(result.current.rows).toEqual([row('fresh')]);
      expect(result.current.loadingMore).toBe(false);
    });
  });
});
