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

  it('drops a stale error response via the seq guard', async () => {
    let rejectFirst: (err: unknown) => void = () => undefined;
    const first = new Promise<TablePage<Row>>((_resolve, reject) => {
      rejectFirst = reject;
    });
    const second: TablePage<Row> = { rows: [{ id: '2', name: 'fast' }], total: 1 };
    const fetchRows = vi
      .fn<(q: TableQueryState) => Promise<TablePage<Row>>>()
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce(second);

    const { result } = renderHook(() => useTableQuery({ fetchRows }));
    act(() => {
      result.current.setPage(2); // fires the fast second fetch while the first hangs
    });
    await waitFor(() => expect(result.current.rows).toEqual(second.rows));

    // The late-rejecting first fetch must be swallowed by the seq guard.
    rejectFirst(new Error('late boom'));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.rows).toEqual(second.rows);
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

describe('useTableQuery updateRow', () => {
  const alice: Row = { id: 'u1', name: 'Alice' };
  const bob: Row = { id: 'u2', name: 'Bob' };

  it('replaces the one row whose id matches and leaves the rest untouched', async () => {
    const fetchRows = okFetch([alice, bob], 2);
    const { result } = renderHook(() =>
      useTableQuery({ fetchRows, getRowId: (row) => row.id }),
    );
    await waitFor(() => expect(result.current.rows).toEqual([alice, bob]));

    act(() => {
      result.current.updateRow({ id: 'u2', name: 'Robert' });
    });
    await waitFor(() => expect(result.current.rows[1]).toEqual({ id: 'u2', name: 'Robert' }));
    expect(result.current.rows[0]).toBe(alice);
    // No refetch — the caller already had the answer.
    expect(fetchRows).toHaveBeenCalledTimes(1);
  });

  it('keeps the same rows array when the id is not on this page', async () => {
    const { result } = renderHook(() =>
      useTableQuery({ fetchRows: okFetch([alice], 1), getRowId: (row) => row.id }),
    );
    await waitFor(() => expect(result.current.rows).toEqual([alice]));
    const before = result.current.rows;

    act(() => {
      result.current.updateRow({ id: 'u9', name: 'Nobody' });
    });
    expect(result.current.rows).toBe(before);
  });

  it('is a no-op without a getRowId to find the row by', async () => {
    const { result } = renderHook(() => useTableQuery({ fetchRows: okFetch([alice], 1) }));
    await waitFor(() => expect(result.current.rows).toEqual([alice]));

    act(() => {
      result.current.updateRow({ id: 'u1', name: 'Alicia' });
    });
    expect(result.current.rows).toEqual([alice]);
  });

  it('exposes a referentially stable updateRow across renders', async () => {
    const { result, rerender } = renderHook(() =>
      useTableQuery({ fetchRows: okFetch([alice], 1), getRowId: (row) => row.id }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    const first = result.current.updateRow;
    rerender();
    expect(result.current.updateRow).toBe(first);
  });
});

describe('useTableQuery empty page recovery', () => {
  it('goes back to page 1 when a later page comes back empty but the table is not', async () => {
    // The rows under page 2 were deleted (a bulk delete on the last page): the
    // server now says 25 in total, none of them here.
    const fetchRows = vi.fn(async (q: TableQueryState): Promise<TablePage<Row>> => {
      if (q.page > 1) return { rows: [], total: 25 };
      return { rows: [{ id: 'u1', name: 'Alice' }], total: 25 };
    });
    const { result } = renderHook(() => useTableQuery({ fetchRows }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setPage(2);
    });
    await waitFor(() => expect(fetchRows).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    // ...and the hook re-asks for page 1 instead of committing an empty view.
    await waitFor(() => expect(result.current.query.page).toBe(1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows).toEqual([{ id: 'u1', name: 'Alice' }]);
    expect(result.current.total).toBe(25);
    expect(fetchRows).toHaveBeenCalledTimes(3);
  });

  it('commits an empty first page as-is, even when the total says rows exist elsewhere', async () => {
    const { result } = renderHook(() => useTableQuery({ fetchRows: okFetch([], 5) }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows).toEqual([]);
    expect(result.current.total).toBe(5);
    expect(result.current.query.page).toBe(1);
  });
});
