import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeApolloTableFetch } from '../src/apolloFetch';
import { TableBulkDeleteProvider, type TableBulkDeleteApi } from '../src/bulk/bulkDeleteContext';
import { useBulkDelete } from '../src/bulk/useBulkDelete';
import type { TableFetch, TableQueryState } from '../src/types';

type Coupon = { id: string; code: string };

const client = { query: vi.fn(async () => ({ data: { couponsTable: { rows: [], total: 0 } } })) };
const apolloFetch = makeApolloTableFetch<Coupon>(client, { kind: 'Document' }, 'couponsTable');
const plainFetch: TableFetch<Coupon> = async () => ({ rows: [], total: 0 });

const QUERY: TableQueryState = { search: '', page: 1, pageSize: 25, sortBy: null, sortDir: 'asc', filters: [] };

function makeApi(tables: string[]) {
  const unsubscribe = vi.fn();
  const api: TableBulkDeleteApi = {
    tables: new Set(tables),
    start: vi.fn(async () => true),
    onSettled: vi.fn(() => unsubscribe),
  };
  return { api, unsubscribe };
}

function withApi(api: TableBulkDeleteApi | null) {
  return function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <TableBulkDeleteProvider value={api}>{children}</TableBulkDeleteProvider>;
  };
}

describe('useBulkDelete', () => {
  it('offers nothing when no shell provides the bulk delete', () => {
    const refetch = vi.fn();
    const { result } = renderHook(() => useBulkDelete(apolloFetch, refetch), { wrapper: withApi(null) });
    expect(result.current).toBeNull();
  });

  it('offers nothing for a grid with no server table behind it', () => {
    const { api } = makeApi(['couponsTable']);
    const { result } = renderHook(() => useBulkDelete(plainFetch, vi.fn()), { wrapper: withApi(api) });
    expect(result.current).toBeNull();
    expect(api.onSettled).not.toHaveBeenCalled();
  });

  it('offers nothing when this person may not bulk delete from the table', () => {
    const { api } = makeApi(['podsTable']);
    const { result } = renderHook(() => useBulkDelete(apolloFetch, vi.fn()), { wrapper: withApi(api) });
    expect(result.current).toBeNull();
    expect(api.onSettled).not.toHaveBeenCalled();
  });

  it('binds a registered table, maps its view to variables and refetches when a job settles', () => {
    const { api, unsubscribe } = makeApi(['couponsTable']);
    const refetch = vi.fn();
    const { result, unmount } = renderHook(() => useBulkDelete(apolloFetch, refetch), {
      wrapper: withApi(api),
    });

    expect(result.current?.api).toBe(api);
    expect(result.current?.table).toBe('couponsTable');
    expect(result.current?.variablesOf(QUERY)).toEqual({
      query: expect.objectContaining({ page: 1 }),
    });
    expect(api.onSettled).toHaveBeenCalledWith('couponsTable', refetch);

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
