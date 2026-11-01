import { AppEventModel } from '../appEvent.model';
import { bucketOfDay, dayKeyExpr, type AnalyticsWindow } from '../entity/window';
import { actorOf, ownersFor, type ActivityTuple } from './product.identity';
import { topCounts, type ProductCount } from './product.counts';

/** A count and its distinct people, per bucket of the window — a detail page's two lines. */
export interface CountSeries {
  buckets: string[];
  counts: number[];
  people: number[];
}

interface DayRow {
  _id: { u: unknown; d: string; day: string };
  count: number;
}

/** Lays per-(person, day) counts onto the window's buckets, zeroes kept, people stitched. */
export function seriesOf(rows: readonly DayRow[], owners: ReadonlyMap<string, string>, window: AnalyticsWindow): CountSeries {
  const counts = new Map<string, number>();
  const people = new Map<string, Set<string>>();
  for (const row of rows) {
    const bucket = bucketOfDay(row._id.day, window.granularity);
    counts.set(bucket, (counts.get(bucket) ?? 0) + row.count);
    const set = people.get(bucket) ?? new Set<string>();
    set.add(actorOf(row._id.u ? String(row._id.u) : null, row._id.d, owners));
    people.set(bucket, set);
  }
  return {
    buckets: window.buckets,
    counts: window.buckets.map((bucket) => counts.get(bucket) ?? 0),
    people: window.buckets.map((bucket) => people.get(bucket)?.size ?? 0),
  };
}

/** How many events matched `match`, and by how many people, per bucket. */
export async function countSeries(match: Record<string, unknown>, window: AnalyticsWindow): Promise<CountSeries> {
  const rows = await AppEventModel.aggregate<DayRow>([
    { $match: match },
    {
      $group: {
        _id: { u: '$user_id', d: '$device_id', day: dayKeyExpr('occurred_at', window.zone) },
        count: { $sum: 1 },
      },
    },
  ]).allowDiskUse(true);
  const tuples = rows.map((row): ActivityTuple => ({
    user: row._id.u ? String(row._id.u) : null,
    device: row._id.d,
    day: row._id.day,
  }));
  return seriesOf(rows, await ownersFor(tuples), window);
}

/** Events matching `match`, counted per value of `key` (a field path or an expression), largest first. */
export async function countBy(match: Record<string, unknown>, key: unknown, limit = 10): Promise<ProductCount[]> {
  const rows = await AppEventModel.aggregate<{ _id: unknown; count: number }>([
    { $match: match },
    { $group: { _id: key, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
  return topCounts(rows, limit);
}
