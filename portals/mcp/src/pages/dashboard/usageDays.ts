import { addDays } from 'date-fns';
import type { UsageDay } from './queries';

export interface ChartDay {
  /** The 'yyyy-MM-dd' calendar day, in the zone the server buckets by. */
  day: string;
  calls: number;
  errors: number;
}

/**
 * Every day of the window, with a zero for the days nobody called — the server
 * only returns days that had calls, and a chart that skips a quiet day draws a
 * busy week as a smooth one.
 *
 * `dayKey` must cut days in the zone the server buckets by (the admin's
 * configured one), which the shared date formatter's `dayKey` does. The window
 * is whole days in the reader's own zone, so its last instant is keyed too:
 * when the two zones differ it can fall on a day the 24-hour steps skip.
 */
export function fillDays(
  days: readonly UsageDay[],
  period: { from: string; to: string },
  dayKey: (date: Date) => string,
): ChartDay[] {
  const end = new Date(period.to).getTime();
  const keys = new Set<string>(days.map((bucket) => bucket.key));
  for (let date = new Date(period.from); date.getTime() < end; date = addDays(date, 1)) keys.add(dayKey(date));
  keys.add(dayKey(new Date(end - 1)));
  const counted = new Map(days.map((bucket) => [bucket.key, bucket]));
  return [...keys]
    .sort((a, b) => a.localeCompare(b))
    .map((day) => ({ day, calls: counted.get(day)?.calls ?? 0, errors: counted.get(day)?.errors ?? 0 }));
}
