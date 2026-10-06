import { describe, expect, it, vi } from 'vitest';
import type { TableFilterValue, TableQueryState } from '@duncit/table';
import { LAUNCHED, NOT_LAUNCHED, withLaunchFilter } from '../launchFilter';

const query = (filters: TableFilterValue[]): TableQueryState => ({
  search: 'pu',
  page: 2,
  pageSize: 25,
  sortBy: 'city',
  sortDir: 'asc',
  filters,
});

/** Runs a query through the wrapper and returns what the inner fetch received. */
const sent = async (filters: TableFilterValue[]) => {
  const page = { rows: [{ id: 'loc-pune' }], total: 1 };
  const inner = vi.fn().mockResolvedValue(page);
  await expect(withLaunchFilter(inner)(query(filters))).resolves.toBe(page);
  expect(inner).toHaveBeenCalledTimes(1);
  return inner.mock.calls[0][0] as TableQueryState;
};

const cityFilter: TableFilterValue = { field: 'city', op: 'contains', value: 'Pu' };

describe('withLaunchFilter', () => {
  it('sends a Launched pick as the is_true boolean filter', async () => {
    const q = await sent([{ field: 'is_launched', op: 'in', values: [LAUNCHED] }]);
    expect(q.filters).toEqual([{ field: 'is_launched', op: 'is_true' }]);
  });

  it('sends a Not launched pick as the is_false boolean filter', async () => {
    const q = await sent([{ field: 'is_launched', op: 'in', values: [NOT_LAUNCHED] }]);
    expect(q.filters).toEqual([{ field: 'is_launched', op: 'is_false' }]);
  });

  it('drops the status filter when both statuses are picked, as that is every city', async () => {
    const q = await sent([{ field: 'is_launched', op: 'in', values: [LAUNCHED, NOT_LAUNCHED] }]);
    expect(q.filters).toEqual([]);
  });

  it('drops a status filter with no picks at all', async () => {
    const q = await sent([{ field: 'is_launched', op: 'in' }]);
    expect(q.filters).toEqual([]);
  });

  it('passes every other column filter and the rest of the query through untouched', async () => {
    const q = await sent([cityFilter, { field: 'is_launched', op: 'in', values: [LAUNCHED, LAUNCHED] }]);
    expect(q).toEqual({
      search: 'pu',
      page: 2,
      pageSize: 25,
      sortBy: 'city',
      sortDir: 'asc',
      filters: [cityFilter, { field: 'is_launched', op: 'is_true' }],
    });
  });
});
