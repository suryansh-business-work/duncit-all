import { actorOf, ownersFor, type ActivityTuple } from './product.identity';

/** One aggregation row: how often `key` happened for one (member, device) pair. */
export interface KeyedRow {
  key: string;
  user: string | null;
  device: string;
  count: number;
}

export interface KeyedTotals {
  count: number;
  actors: number;
}

/** A named count — a screen, an element, a platform. */
export interface ProductCount {
  key: string;
  count: number;
}

/** Per key: the total, and how many distinct people (members, or devices nobody signed in on) it covers. */
export function keyedTotals(rows: readonly KeyedRow[], owners: ReadonlyMap<string, string>): Map<string, KeyedTotals> {
  const counts = new Map<string, number>();
  const actors = new Map<string, Set<string>>();
  for (const row of rows) {
    counts.set(row.key, (counts.get(row.key) ?? 0) + row.count);
    const set = actors.get(row.key) ?? new Set<string>();
    set.add(actorOf(row.user, row.device, owners));
    actors.set(row.key, set);
  }
  return new Map([...counts].map(([key, count]) => [key, { count, actors: actors.get(key)?.size ?? 0 }]));
}

/** The owners for keyed rows — the same stitching every distinct-people count uses. */
export const ownersOfRows = (rows: readonly KeyedRow[]) =>
  ownersFor(rows.map((row): ActivityTuple => ({ user: row.user, device: row.device, day: '' })));

/** `{ _id, count }` rows as named counts, largest first, capped. */
export function topCounts(rows: ReadonlyArray<{ _id: unknown; count: number }>, limit = 10): ProductCount[] {
  return rows
    .map((row) => ({ key: row._id === null || row._id === undefined ? '' : String(row._id), count: row.count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

/** A `$group` stage key: the member and the device, beside whatever else is grouped on. */
export const byPerson = (extra: Record<string, unknown>) => ({ ...extra, u: '$user_id', d: '$device_id' });

/** Aggregation rows grouped with `byPerson` as keyed rows. */
export function keyedRows<T extends { u: unknown; d: string }>(
  rows: ReadonlyArray<{ _id: T; count: number }>,
  keyOf: (id: T) => string
): KeyedRow[] {
  return rows.map((row) => ({
    key: keyOf(row._id),
    user: row._id.u ? String(row._id.u) : null,
    device: row._id.d,
    count: row.count,
  }));
}

/** `part` as a percentage of `whole`, one decimal; null when there is no whole. */
export const rate = (part: number, whole: number): number | null =>
  whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;
