import { describe, expect, it } from 'vitest';
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

  // The table refetches when fetchRows changes identity, so this hook's whole
  // contract with it is: a new fetch for new rows, the same one otherwise.
  it('hands the table a new fetch, answering the new rows, when a new set arrives', async () => {
    const { result, rerender } = renderHook(({ rows }) => useClientRows(rows, searchOf, COLUMNS), {
      initialProps: { rows: ROWS },
    });
    const first = result.current.fetchRows;
    rerender({ rows: ROWS.slice(0, 1) });
    expect(result.current.fetchRows).not.toBe(first);
    const page = await result.current.fetchRows(query());
    expect(page.rows.map((row) => row.name)).toEqual(['pods_create_pod']);
    expect(page.total).toBe(1);
  });

  it('keeps the same fetch and ref when rendered again with the same rows', () => {
    const { result, rerender } = renderHook(({ rows }) => useClientRows(rows, searchOf, COLUMNS), {
      initialProps: { rows: ROWS },
    });
    const { fetchRows, refetchRef } = result.current;
    rerender({ rows: ROWS });
    expect(result.current.fetchRows).toBe(fetchRows);
    expect(result.current.refetchRef).toBe(refetchRef);
  });
});
