import type { TableFetch, TableFilterValue } from '@duncit/table';

/**
 * The Launch Status column filters by the chip's own words — Launched / Not
 * launched — while the server filters the stored boolean with `is_true` /
 * `is_false`. The page turns a picked status into that before the query leaves.
 */

export const LAUNCHED = 'LAUNCHED';
export const NOT_LAUNCHED = 'NOT_LAUNCHED';

function asBoolean(filter: TableFilterValue): TableFilterValue[] {
  if (filter.field !== 'is_launched') return [filter];
  const picked = new Set(filter.values ?? []);
  // Both statuses picked is every city — the same as no filter at all.
  if (picked.size !== 1) return [];
  return [{ field: 'is_launched', op: picked.has(LAUNCHED) ? 'is_true' : 'is_false' }];
}

/** `fetch`, with a Launch Status pick sent as the boolean filter the server reads. */
export const withLaunchFilter =
  <T>(fetch: TableFetch<T>): TableFetch<T> =>
  (query) =>
    fetch({ ...query, filters: query.filters.flatMap(asBoolean) });
