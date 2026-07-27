import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTableQuery } from '../src/useTableQuery';
import type { TablePage, TableQueryState } from '../src/types';

type Row = { id: string };

function okFetch() {
  return vi.fn(async (_q: TableQueryState): Promise<TablePage<Row>> => ({ rows: [], total: 0 }));
}

/** Mounts the hook and lets the initial fetch settle, so later assertions start from 1 call. */
async function mountSettled(fetchRows: ReturnType<typeof okFetch>) {
  const rendered = renderHook(() => useTableQuery({ fetchRows }));
  await act(async () => {
    await vi.runOnlyPendingTimersAsync();
  });
  return rendered;
}

describe('useTableQuery search debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('collapses a burst of keystrokes into a single fetch for the last value', async () => {
    const fetchRows = okFetch();
    const { result } = await mountSettled(fetchRows);
    expect(fetchRows).toHaveBeenCalledTimes(1);

    // Each keystroke lands inside the 400 ms window, so the pending timer is cleared.
    for (const value of ['a', 'al', 'ali']) {
      act(() => {
        result.current.setSearchInput(value);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });
      expect(fetchRows).toHaveBeenCalledTimes(1);
    }

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(fetchRows).toHaveBeenCalledTimes(2);
    expect(fetchRows).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'ali' }));
  });

  it('typing then undoing inside the window leaves the page where the user was', async () => {
    const fetchRows = okFetch();
    const { result } = await mountSettled(fetchRows);

    act(() => {
      result.current.setPage(2);
    });
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(fetchRows).toHaveBeenCalledTimes(2);

    act(() => {
      result.current.setSearchInput('typo');
    });
    act(() => {
      result.current.setSearchInput(''); // back to the applied value -> nothing to apply
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // Nothing was applied, so neither the page nor the fetch may move. `search`
    // is not asserted: it started as '' and returning to '' cannot fail (S5914)
    // — the page and the fetch count are what actually prove nothing applied.
    expect(result.current.query.page).toBe(2);
    expect(fetchRows).toHaveBeenCalledTimes(2);
  });

  it('retyping the value that is already applied does not refetch or reset the page', async () => {
    const fetchRows = okFetch();
    const { result } = await mountSettled(fetchRows);

    act(() => {
      result.current.setSearchInput('alice');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(fetchRows).toHaveBeenCalledTimes(2);

    act(() => {
      result.current.setPage(3);
    });
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(fetchRows).toHaveBeenCalledTimes(3);

    // Backspace then retype the same term: the applied search never changes, so the
    // user is not yanked back to page 1.
    act(() => {
      result.current.setSearchInput('alic');
    });
    act(() => {
      result.current.setSearchInput('alice');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(fetchRows).toHaveBeenCalledTimes(3);
    expect(result.current.query.page).toBe(3);
    expect(result.current.searchInput).toBe('alice');
    expect(result.current.query.search).toBe('alice');
  });

  it('exposes the raw input immediately but only resets the page when the search applies', async () => {
    const fetchRows = okFetch();
    const { result } = await mountSettled(fetchRows);

    act(() => {
      result.current.setPage(3);
    });
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(result.current.query.page).toBe(3);

    act(() => {
      result.current.setSearchInput('bob');
    });
    // The controlled input updates at once; the applied query lags behind it.
    expect(result.current.searchInput).toBe('bob');
    expect(result.current.query.search).toBe('');
    expect(result.current.query.page).toBe(3);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(result.current.query.search).toBe('bob');
    expect(result.current.query.page).toBe(1);
  });
});
