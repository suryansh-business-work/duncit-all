import { appDate } from '@utils/app-time';
import { activeDaysOf, type CohortMember } from './funnel.data';
import { consoleLink } from './links';
import { bucketOfDay, dayKeyIn } from './window';
import { pct, type AnalyticsLeaderboard } from './shapes';

/**
 * Weekly cohort retention: everyone who signed up in a week, and the share of
 * them the app saw again in week 1, 2, 4 and 8 after it — the classic
 * "do people stay?" table. A week that has not happened yet is blank, never 0%.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const CHECKPOINTS = [1, 2, 4, 8] as const;
const MAX_COHORTS = 10;

const weekStartMs = (week: string) => new Date(`${week}T00:00:00.000Z`).getTime();
const ymdAt = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The share of a cohort seen in week `n` after its own week, or null while that week is still to come. */
function retainedIn(
  members: readonly CohortMember[],
  days: ReadonlyMap<string, string[]>,
  week: string,
  n: number,
  now: Date
): number | null {
  const start = weekStartMs(week) + n * WEEK_MS;
  if (start + WEEK_MS > now.getTime()) return null;
  const [from, to] = [ymdAt(start), ymdAt(start + WEEK_MS)];
  const seen = members.filter((member) => (days.get(member.id) ?? []).some((day) => day >= from && day < to));
  return pct(seen.length, members.length);
}

function byWeek(members: readonly CohortMember[], zone: string): Array<[string, CohortMember[]]> {
  const weeks = new Map<string, CohortMember[]>();
  for (const member of members) {
    const week = bucketOfDay(dayKeyIn(member.signedUpAt, zone), 'WEEK');
    const list = weeks.get(week) ?? [];
    list.push(member);
    weeks.set(week, list);
  }
  return [...weeks.entries()].sort(([a], [b]) => b.localeCompare(a)).slice(0, MAX_COHORTS);
}

export async function cohortTable(
  members: readonly CohortMember[],
  zone: string,
  now: Date
): Promise<AnalyticsLeaderboard> {
  const cohorts = byWeek(members, zone);
  const oldest = cohorts.at(-1)?.[0];
  const ids = cohorts.flatMap(([, list]) => list.map((member) => member.id));
  const days = oldest ? await activeDaysOf(ids, new Date(weekStartMs(oldest))) : new Map<string, string[]>();
  return {
    key: 'fun_cohorts',
    columns: [
      { key: 'fun_cohort_size', format: 'COUNT' },
      ...CHECKPOINTS.map((n) => ({ key: `fun_week_${n}`, format: 'PERCENT' as const })),
      { key: 'fun_cohort_booked', format: 'PERCENT' },
    ],
    rows: cohorts.map(([week, list]) => ({
      id: week,
      name: appDate(new Date(weekStartMs(week))),
      caption: null,
      values: [
        list.length,
        ...CHECKPOINTS.map((n) => retainedIn(list, days, week, n, now)),
        pct(list.filter((member) => member.firstBookingAt).length, list.length),
      ],
    })),
    link: consoleLink('admin', '/users'),
  };
}
