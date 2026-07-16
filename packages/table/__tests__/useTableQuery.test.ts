import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTableQuery } from '../src/useTableQuery';
import type { TablePage, TableQueryState } from '../src/types';

type Row = { id: string; name: string };

function okFetch(rows: Row[] = [], total = 0) {
  return vi.fn(async (_q: TableQueryState): Promise<TablePage<Row>> => ({ rows, total }));
}

describe('useTableQuery', () => {
  describe('with fake timers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('debounces search input 400ms and resets page to 1', async () => {
      const fetchRows = okFetch();
      const { result } = renderHook(() => useTableQuery({ fetchRows }));
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      expect(fetchRows).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.setPage(3);
      });
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      expect(fetchRows).toHaveBeenCalledTimes(2);

      act(() => {
        result.current.setSearchInput('alice');
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(399);
      });
      expect(fetchRows).toHaveBeenCalledTimes(2); // not yet — still inside the debounce window

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(fetchRows).toHaveBeenCalledTimes(3);
      expect(fetchRows).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'alice', page: 1 }),
      );
    });
  });

  it('setPageSize / setSort / setFilters reset page to 1; setPage does not', async () => {
    const fetchRows = okFetch();
    const { result } = renderHook(() => useTableQuery({ fetchRows }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setPage(4);
    });
    await waitFor(() => expect(result.current.query.page).toBe(4));

    act(() => {
      result.current.setPageSize(50);
    });
    await waitFor(() => expect(result.current.query).toMatchObject({ page: 1, pageSize: 50 }));

    act(() => {
      result.current.setPage(2);
    });
    act(() => {
      result.current.setSort('name', 'desc');
    });
    await waitFor(() =>
      expect(result.current.query).toMatchObject({ page: 1, sortBy: 'name', sortDir: 'desc' }),
    );

    act(() => {
      result.current.setPage(2);
    });
    act(() => {
      result.current.setFilters([{ field: 'name', op: 'contains', value: 'a' }]);
    });
    await waitFor(() => expect(result.current.query.page).toBe(1));
    expect(result.current.query.filters).toEqual([{ field: 'name', op: 'contains', value: 'a' }]);
  });

  it('drops stale responses via the seq guard', async () => {
    let resolveFirst: (page: TablePage<Row>) => void = () => undefined;
    const first = new Promise<TablePage<Row>>((resolve) => {
      resolveFirst = resolve;
    });
    const second: TablePage<Row> = { rows: [{ id: '2', name: 'fast' }], total: 1 };
    const fetchRows = vi
      .fn<(q: TableQueryState) => Promise<TablePage<Row>>>()
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce(second);

    const { result } = renderHook(() => useTableQuery({ fetchRows }));
    act(() => {
      result.current.setPage(2); // triggers the second (fast) fetch while the first hangs
    });
    await waitFor(() => expect(result.current.rows).toEqual(second.rows));

    // Late first response must be dropped.
    resolveFirst({ rows: [{ id: '1', name: 'slow' }], total: 1 });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.rows).toEqual(second.rows);
    expect(result.current.total).toBe(1);
  });

  it('surfaces fetch errors without throwing; non-Error gets a generic message', async () => {
    const fetchRows = vi
      .fn<(q: TableQueryState) => Promise<TablePage<Row>>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce('nope');
    const { result } = renderHook(() => useTableQuery({ fetchRows }));
    await waitFor(() => expect(result.current.error).toBe('boom'));
    expect(result.current.loading).toBe(false);

    act(() => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.error).toBe('Failed to load data'));
  });

  it('refetch re-fires with the same query', async () => {
    const fetchRows = okFetch([{ id: '1', name: 'a' }], 1);
    const { result } = renderHook(() => useTableQuery({ fetchRows }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchRows).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refetch();
    });
    await waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(2));
    expect(fetchRows.mock.calls[1][0]).toEqual(fetchRows.mock.calls[0][0]);
  });

  it('externalFilters reach the fetch (after user filters) but never the visible query', async () => {
    const fetchRows = okFetch();
    const external = [{ field: 'club_id', op: 'eq' as const, value: 'c1' }];
    const { result } = renderHook(() => useTableQuery({ fetchRows, externalFilters: external }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchRows).toHaveBeenCalledWith(expect.objectContaining({ filters: external }));
    expect(result.current.query.filters).toEqual([]); // no chip pollution

    act(() => {
      result.current.setFilters([{ field: 'name', op: 'contains', value: 'a' }]);
    });
    await waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(2));
    expect(fetchRows.mock.calls[1][0].filters).toEqual([
      { field: 'name', op: 'contains', value: 'a' },
      { field: 'club_id', op: 'eq', value: 'c1' },
    ]);
  });

  it('externalFilters change (by value) resets to page 1 and refetches exactly once', async () => {
    const fetchRows = okFetch();
    const { result, rerender } = renderHook(
      ({ club }: { club: string }) =>
        useTableQuery({
          fetchRows,
          externalFilters: [{ field: 'club_id', op: 'eq', value: club }],
        }),
      { initialProps: { club: 'c1' } },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      result.current.setPage(3);
    });
    await waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(2));

    // Same value, new array identity — no refetch.
    rerender({ club: 'c1' });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchRows).toHaveBeenCalledTimes(2);

    rerender({ club: 'c2' });
    await waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(3));
    expect(fetchRows.mock.calls[2][0]).toMatchObject({
      page: 1,
      filters: [{ field: 'club_id', op: 'eq', value: 'c2' }],
    });
  });

  it('honours defaultSort and defaultPageSize', async () => {
    const fetchRows = okFetch();
    const { result } = renderHook(() =>
      useTableQuery({ fetchRows, defaultSort: { field: 'name', dir: 'desc' }, defaultPageSize: 50 }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchRows).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'name', sortDir: 'desc', pageSize: 50, page: 1 }),
    );
  });
});
