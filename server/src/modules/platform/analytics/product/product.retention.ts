import { dayKeyIn } from '../entity/window';
import { eventMatch, type ProductScope } from './product.filter';
import { seenBefore, stitchedActivity } from './product.identity';
import { outcomeOccurrences } from './product.outcomes';
import { computeRetention, type CohortGranularity } from './product.retention.calc';

/**
 * Analytics > Product > Retention — cohorts of people who were first seen in
 * the app, or who signed up, in the period, followed forward by day or week.
 * Activity is any tracked event, narrowed by platform and version when asked.
 */

export type CohortBasis = 'FIRST_SEEN' | 'SIGNED_UP';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Day cohorts past two months are a wall of numbers; longer periods are read by week. */
const MAX_DAY_COHORT_DAYS = 62;

/** Who started in the period, and on which day: first seen, or signed up. */
async function startsOf(
  basis: CohortBasis,
  scope: ProductScope,
  activity: ReadonlyMap<string, ReadonlySet<string>>
): Promise<Map<string, string>> {
  const { from, to, zone } = scope.window;
  if (basis === 'SIGNED_UP') {
    const signups = await outcomeOccurrences('SIGNED_UP', { from, to });
    return new Map(signups.map((row) => [row.user, dayKeyIn(row.at, zone)]));
  }
  const fromDay = dayKeyIn(from, zone);
  const toDay = dayKeyIn(new Date(to.getTime() - 1), zone);
  const firstDays = new Map<string, string>();
  for (const [actor, days] of activity) {
    const first = [...days].sort((a, b) => a.localeCompare(b))[0];
    if (first && first >= fromDay && first <= toDay) firstDays.set(actor, first);
  }
  const old = await seenBefore(firstDays.keys(), from);
  for (const actor of old) firstDays.delete(actor);
  return firstDays;
}

export async function productRetention(scope: ProductScope, basis: CohortBasis, asked: CohortGranularity | null) {
  const granularity: CohortGranularity =
    asked === 'DAY' && scope.window.days <= MAX_DAY_COHORT_DAYS ? 'DAY' : 'WEEK';
  const followDays = granularity === 'DAY' ? 30 : 8 * 7 + 6;
  const now = new Date();
  const until = new Date(Math.min(now.getTime(), scope.window.to.getTime() + followDays * DAY_MS));
  const activity = await stitchedActivity(eventMatch(scope, scope.window.from, until), scope.window.zone);
  const starts = await startsOf(basis, scope, activity);
  const table = computeRetention(starts, activity, granularity, dayKeyIn(now, scope.window.zone));
  return { basis, granularity, ...table };
}
