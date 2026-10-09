import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useBrandOrders } from '@/hooks/useBrandOrders';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const ROW = {
  id: 'o1',
  order_no: 'DUN-1',
  buyer_name: 'Riya',
  fulfilment_method: 'SHIP',
  fulfilment_status: 'PENDING',
  currency_symbol: '₹',
  total: 499,
  created_at: '2026-10-01T10:00:00.000Z',
  line_items: [{ qty: 2 }],
  shiprocket: { awb: '' },
};

const page = (total: number, rows = [ROW]) => ({
  brandProductOrdersTable: { total, page: 1, page_size: 20, rows },
});

/** The `query` variable of the n-th request. */
const queryOf = (call: number) => mockRequest.mock.calls[call][1].query;

beforeEach(() => {
  mockRequest.mockReset();
  mockRequest.mockResolvedValue(page(45));
});

describe('useBrandOrders', () => {
  it('loads the first page of every order, newest first', async () => {
    const { result } = renderHook(() => useBrandOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject({
      rows: [ROW],
      page: 1,
      pages: 3,
      error: null,
      filtered: false,
    });
    expect(queryOf(0)).toEqual({
      page: 1,
      page_size: 20,
      sort_by: 'created_at',
      sort_dir: 'desc',
      filters: [],
    });
    expect(mockRequest.mock.calls[0][2]).toEqual({ auth: true });
  });

  it('pages on, and a status goes back to the first page filtered to it', async () => {
    const { result } = renderHook(() => useBrandOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setPage(3));
    await waitFor(() => expect(queryOf(1).page).toBe(3));

    act(() => result.current.setStatus('FAILED'));
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(3));
    expect(queryOf(2)).toMatchObject({
      page: 1,
      filters: [{ field: 'fulfilment_status', op: 'eq', value: 'FAILED' }],
    });
    expect(result.current.filtered).toBe(true);
  });

  it('searches once the typing settles, from the first page', async () => {
    jest.useFakeTimers();
    try {
      const { result } = renderHook(() => useBrandOrders());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      act(() => result.current.setPage(2));
      await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(2));

      act(() => result.current.setSearch('  DUN-9 '));
      expect(result.current.search).toBe('  DUN-9 ');
      expect(mockRequest).toHaveBeenCalledTimes(2);
      act(() => jest.advanceTimersByTime(400));
      await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(3));
      expect(queryOf(2)).toMatchObject({ page: 1, search: 'DUN-9' });
      expect(result.current.page).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('says why the list did not load, and loads again on retry', async () => {
    mockRequest.mockRejectedValueOnce(new Error('Offline'));
    const { result } = renderHook(() => useBrandOrders());
    await waitFor(() => expect(result.current.error).toBe('Offline'));
    expect(result.current.rows).toEqual([]);

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.rows).toEqual([ROW]);
  });

  it('falls back to its own sentence when the failure has none', async () => {
    mockRequest.mockRejectedValueOnce({});
    const { result } = renderHook(() => useBrandOrders());
    await waitFor(() =>
      expect(result.current.error).toBe('Could not load your orders. Try again.'),
    );
  });
});
