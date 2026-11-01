import { rate } from './product.counts';

/**
 * Cohort retention, free of the database so it can be checked by hand.
 *
 * DAY cohorts use classic day-N retention: of the people who started on a day,
 * the share active again exactly N days later (D1, D3, D7, D14, D30). WEEK
 * cohorts start on a Monday; week N counts anyone active on any day of the Nth
 * week after. A cell whose day or week has not happened yet is null — not 0,
 * which would read as "nobody came back".
 */

export type CohortGranularity = 'DAY' | 'WEEK';

export const DAY_OFFSETS = [1, 3, 7, 14, 30] as const;
export const WEEK_OFFSETS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/** A yyyy-MM-dd day key moved by whole days. */
export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** The Monday on or before a day. */
export function mondayOf(day: string): string {
  const weekday = new Date(`${day}T00:00:00.000Z`).getUTCDay();
  return addDays(day, -((weekday + 6) % 7));
}

export interface CohortRow {
  cohort: string;
  size: number;
  /** % retained per offset; null where the day or week has not come yet. */
  retained: Array<number | null>;
}

export interface RetentionTable {
  offsets: number[];
  rows: CohortRow[];
  /** Each offset's retention over every cohort that has reached it, weighted by size. */
  average: Array<number | null>;
}

function cameBack(days: ReadonlySet<string> | undefined, cohort: string, offset: number, granularity: CohortGranularity): boolean {
  if (!days) return false;
  if (granularity === 'DAY') return days.has(addDays(cohort, offset));
  const weekStart = addDays(cohort, offset * 7);
  for (let day = 0; day < 7; day += 1) {
    if (days.has(addDays(weekStart, day))) return true;
  }
  return false;
}

/** Groups starters into cohorts: by their start day, or by its Monday. */
export function cohortsOf(starts: ReadonlyMap<string, string>, granularity: CohortGranularity): Map<string, string[]> {
  const cohorts = new Map<string, string[]>();
  for (const [actor, day] of starts) {
    const cohort = granularity === 'DAY' ? day : mondayOf(day);
    const members = cohorts.get(cohort) ?? [];
    members.push(actor);
    cohorts.set(cohort, members);
  }
  return cohorts;
}

export function computeRetention(
  starts: ReadonlyMap<string, string>,
  activity: ReadonlyMap<string, ReadonlySet<string>>,
  granularity: CohortGranularity,
  today: string
): RetentionTable {
  const offsets: number[] = granularity === 'DAY' ? [...DAY_OFFSETS] : [...WEEK_OFFSETS];
  const span = granularity === 'DAY' ? 1 : 7;
  const totals = offsets.map(() => ({ kept: 0, size: 0 }));
  const rows = [...cohortsOf(starts, granularity)]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cohort, members]) => ({
      cohort,
      size: members.length,
      retained: offsets.map((offset, index) => {
        if (addDays(cohort, offset * span) > today) return null;
        const kept = members.filter((actor) => cameBack(activity.get(actor), cohort, offset, granularity)).length;
        totals[index].kept += kept;
        totals[index].size += members.length;
        return rate(kept, members.length);
      }),
    }));
  return { offsets, rows, average: totals.map((total) => rate(total.kept, total.size)) };
}
