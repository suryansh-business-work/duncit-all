import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { DuncitColumn, TableQueryState } from '@duncit/table';
import { useClientTable } from '../../components/useClientTable';

interface Row {
  id: string;
  name: string;
  sort_order: number;
}

const COLUMNS: DuncitColumn<Row>[] = [
  { field: 'name', type: 'text' },
  { field: 'sort_order', type: 'number' },
];
const searchOf = (row: Row) => row.name;

const query = (over: Partial<TableQueryState> = {}): TableQueryState => ({ search: '', page: 1, pageSize: 25, sortBy: null, sortDir: 'asc', filters: [], ...over });

const ROWS: Row[] = [
  { id: 'a', name: 'Pune', sort_order: 2 },
  { id: 'b', name: 'Bengaluru', sort_order: 1 },
  { id: 'c', name: 'Mumbai', sort_order: 3 },
];

describe('useClientTable', () => {
  it('answers the grid from the rows in hand: search, sort and the total', async () => {
    const { result } = renderHook(() => useClientTable(ROWS, searchOf, COLUMNS));
    const searched = await result.current.fetchRows(query({ search: 'BENG' }));
    expect(searched).toEqual({ rows: [ROWS[1]], total: 1 });

    const sorted = await result.current.fetchRows(query({ sortBy: 'sort_order', sortDir: 'desc' }));
    expect(sorted.rows.map((row) => row.id)).toEqual(['c', 'a', 'b']);
  });

  it('asks the grid to reload when a fresh list arrives, and only then', () => {
    const { result, rerender } = renderHook(({ rows }) => useClientTable(rows, searchOf, COLUMNS), { initialProps: { rows: ROWS } });
    const reload = vi.fn();
    result.current.refetchRef.current = reload;

    rerender({ rows: ROWS });
    expect(reload).not.toHaveBeenCalled();

    const fresh = [...ROWS, { id: 'd', name: 'Delhi', sort_order: 4 }];
    rerender({ rows: fresh });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('serves the newest rows after they change', async () => {
    const { result, rerender } = renderHook(({ rows }) => useClientTable(rows, searchOf, COLUMNS), { initialProps: { rows: ROWS } });
    rerender({ rows: [ROWS[0]] });
    const page = await result.current.fetchRows(query());
    expect(page.total).toBe(1);
    expect(page.rows[0]?.name).toBe('Pune');
  });

  it('takes a fresh list that arrives before the grid has registered its reload', async () => {
    const { rerender, result } = renderHook(({ rows }) => useClientTable(rows, searchOf, COLUMNS), { initialProps: { rows: ROWS } });
    expect(result.current.refetchRef.current).toBeNull();
    rerender({ rows: [] });
    expect(await result.current.fetchRows(query())).toEqual({ rows: [], total: 0 });
  });
});
