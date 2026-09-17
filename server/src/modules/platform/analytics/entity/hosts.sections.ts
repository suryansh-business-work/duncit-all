import { locationNames, refKey, userNames } from './lookups';
import { groupPods, loadOutcomes, rankingValues, RANKING_COLUMNS, sumPods, type HeldPod } from './held-pods';
import type { AspectRatings } from './signals';
import { isApproved, type HostRow } from './hosts.data';
import {
  PODS_BANDS,
  STAR_KEYS,
  bandSlices,
  breakdown,
  distinctTally,
  fixedSlices,
  tally,
  topSlices,
  type AnalyticsBreakdown,
  type AnalyticsLeaderboard,
} from './shapes';

/** The Hosts page's charts and its one ranking. */

const STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'INACTIVE'] as const;
const HOST_MARKS = ['HOST_SCAN', 'HOST_MANUAL', 'VIRTUAL_JOIN'] as const;

const hostStatus = (row: HostRow) => (row.is_active === false ? 'INACTIVE' : row.status);

/** Approved hosts per category — one host approved in two categories counts in both. */
function hostCategories(hosts: readonly HostRow[]) {
  const names = new Map<string, string>();
  const pairs = hosts.filter(isApproved).flatMap((row) =>
    (row.host_categories ?? []).map((category) => {
      const key = refKey(category.category_id);
      if (category.category_name) names.set(key, category.category_name);
      return { id: row.user_id.toHexString(), key };
    })
  );
  return { counts: distinctTally(pairs), names };
}

interface PeriodSignals {
  held: HeldPod[];
  marks: ReadonlyMap<string, number>;
  rating: AspectRatings;
}

export async function hostBreakdowns(hosts: readonly HostRow[], period: PeriodSignals): Promise<AnalyticsBreakdown[]> {
  const categories = hostCategories(hosts);
  const cities = distinctTally(
    period.held.flatMap((pod) => pod.host_ids.map((id) => ({ id, key: refKey(pod.location_id) })))
  );
  const cityNames = await locationNames(cities.keys());
  // Every approved host is in the count, so "hosted nothing" is a visible bar.
  const podsByHost = tally(period.held.flatMap((pod) => pod.host_ids));
  const population = new Set([...hosts.filter(isApproved).map((row) => row.user_id.toHexString()), ...podsByHost.keys()]);
  const allTime = { scope: 'ALL_TIME' } as const;
  return [
    breakdown('host_status', fixedSlices(STATUSES, tally(hosts.map(hostStatus))), allTime),
    breakdown(
      'pods_per_host',
      bandSlices(
        [...population].map((id) => podsByHost.get(id) ?? 0),
        PODS_BANDS
      ),
      { ordered: true }
    ),
    breakdown('hosts_by_category', topSlices(categories.counts, categories.names), allTime),
    breakdown('hosts_by_city', topSlices(cities, cityNames)),
    breakdown('host_marks', fixedSlices(HOST_MARKS, period.marks)),
    breakdown('host_rating_stars', fixedSlices(STAR_KEYS, period.rating.stars), { ordered: true }),
  ];
}

/** The ten hosts who seated the most people in the period. */
export async function hostLeaderboard(hosts: readonly HostRow[], held: readonly HeldPod[]): Promise<AnalyticsLeaderboard> {
  const outcomes = await loadOutcomes(held);
  const ranked = [...groupPods(held, (pod) => pod.host_ids).entries()]
    .map(([hostId, pods]) => ({ hostId, totals: sumPods(pods, outcomes) }))
    .sort((a, b) => b.totals.seats - a.totals.seats || b.totals.pods - a.totals.pods)
    .slice(0, 10);
  const hostByUser = new Map(hosts.map((row) => [row.user_id.toHexString(), row]));
  const names = await userNames(ranked.map(({ hostId }) => hostId));
  return {
    key: 'top_hosts',
    columns: [...RANKING_COLUMNS],
    rows: ranked.map(({ hostId, totals }) => {
      const host = hostByUser.get(hostId);
      return {
        id: hostId,
        name: host?.full_name || names.get(hostId) || '',
        caption: host?.host_no ?? null,
        values: rankingValues(totals, { sum: totals.host_rating_sum, count: totals.host_rating_count }),
      };
    }),
  };
}
