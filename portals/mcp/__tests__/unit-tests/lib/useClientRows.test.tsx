import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { DuncitColumn } from '@duncit/table';
import { useClientRows } from '../../../src/lib/useClientRows';

interface Row {
  name: string;
  calls: number;
}

const COLUMNS: DuncitColumn<Row>[] = [
  { field: 'name', type: 'text' },
  { field: 'calls', type: 'number' },
];
const searchOf = (row: Row) => row.name;
const query = (over: Partial<{ search: string; sortBy: string | null; sortDir: 'asc' | 'desc' }> = {}) => ({
  search: '',
  page: 1,
  pageSize: 25,
  sortBy: null,
  sortDir: 'asc' as const,
  filters: [],
  ...over,
});

const ROWS: Row[] = [
  { name: 'pods_create_pod', calls: 4 },
  { name: 'finance_payouts', calls: 9 },
  { name: 'pods_pods_table', calls: 1 },
];

describe('useClientRows', () => {
  it('answers the table from the rows already in hand: search, sort and total', async () => {
    const { result } = renderHook(() => useClientRows(ROWS, searchOf, COLUMNS));
    const pods = await result.current.fetchRows(query({ search: 'POD' }));
    expect(pods.rows.map((row) => row.name)).toEqual(['pods_create_pod', 'pods_pods_table']);
    expect(pods.total).toBe(2);
    const busiest = await result.current.fetchRows(query({ sortBy: 'calls', sortDir: 'desc' }));
    expect(busiest.rows.map((row) => row.calls)).toEqual([9, 4, 1]);
  });

  it('asks the table to fetch again when a new set of rows arrives', () => {
    const { result, rerender } = renderHook(({ rows }) => useClientRows(rows, searchOf, COLUMNS), {
      initialProps: { rows: ROWS },
    });
    const refetch = vi.fn();
    result.current.refetchRef.current = refetch;
    rerender({ rows: ROWS.slice(0, 1) });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('does not refetch when it is rendered again with the same rows', () => {
    const { result, rerender } = renderHook(({ rows }) => useClientRows(rows, searchOf, COLUMNS), {
      initialProps: { rows: ROWS },
    });
    const refetch = vi.fn();
    result.current.refetchRef.current = refetch;
    rerender({ rows: ROWS });
    expect(refetch).not.toHaveBeenCalled();
  });
});
