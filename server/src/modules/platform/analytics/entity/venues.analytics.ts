import { consoleLink } from './links';
import { categoryNames, locationNames, refKey } from './lookups';
import { loadOutcomes, rankingValues, RANKING_COLUMNS, sumPods } from './held-pods';
import { dayKeyIn, dayTotals, distinctSeries, seriesFromDays, type AnalyticsWindow } from './window';
import {
  breakdown,
  countMap,
  fixedSlices,
  kpi,
  linkEverything,
  tally,
  topSlices,
  total,
  trend,
  type AnalyticsBreakdown,
  type AnalyticsKpi,
  type AnalyticsLeaderboard,
  type AnalyticsTrend,
  type EntityAnalyticsSections,
} from './shapes';
import {
  loadVenuePeriod,
  loadVenues,
  pendingRequests,
  upcomingSlots,
  venueFigures,
  type Decision,
  type RequestOutcome,
  type VenuePeriod,
  type VenuePod,
  type VenueRow,
} from './venues.data';

/**
 * Analytics > Venues — the partner venues pods run at: how many there are and
 * how many passed review, how quickly they answer the slot requests hosts send
 * them, and how full the pods they hosted were. A venue is ACTIVE in a period
 * when it held at least one pod in it.
 */

const VENUES = consoleLink('venues', '/venues');
const PODS = consoleLink('admin', '/pods');
// Every venue answer is a row in the pod audit trail, which Pod Monitoring lists.
const ANSWERS = consoleLink('admin', '/pod-monitoring');

const VENUE_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const;
const OUTCOMES: readonly RequestOutcome[] = ['APPROVED', 'DECLINED', 'EXPIRED'];
const SLOT_STATUSES = ['AVAILABLE', 'PENDING', 'BOOKED', 'BLOCKED'] as const;
const TURNED_DOWN = new Set<RequestOutcome>(['DECLINED', 'EXPIRED']);

interface KpiInput {
  venues: readonly VenueRow[];
  current: VenuePeriod;
  previous: VenuePeriod;
  pending: number;
  window: AnalyticsWindow;
}

function venueKpis({ venues, current, previous, pending, window }: KpiInput): AnalyticsKpi[] {
  const now = venueFigures(venues, current, window.from, window.to);
  const before = venueFigures(venues, previous, window.prevFrom, window.prevTo);
  const verified = venues.filter((venue) => venue.status === 'APPROVED').length;
  return [
    kpi('ven_total', venues.length, null, { link: VENUES }),
    kpi('ven_verified', verified, null, { link: consoleLink('venues', '/venues?status=APPROVED') }),
    kpi('ven_new', now.created, before.created, { link: VENUES }),
    kpi('ven_active', now.active, before.active, { link: VENUES }),
    kpi('ven_slot_requests', now.requests, before.requests, { link: PODS }),
    kpi('ven_pending_requests', pending, null, { higherIsBetter: false, link: PODS }),
    kpi('ven_approval_rate', now.approval_rate, before.approval_rate, { format: 'PERCENT', link: ANSWERS }),
    kpi('ven_requests_expired', now.expired, before.expired, { higherIsBetter: false, link: ANSWERS }),
    kpi('ven_decision_time', now.decision_ms, before.decision_ms, {
      format: 'DURATION',
      higherIsBetter: false,
      link: ANSWERS,
    }),
    kpi('ven_pods_held', now.pods_held, before.pods_held, { link: PODS }),
    kpi('ven_fill_rate', now.fill_rate, before.fill_rate, { format: 'PERCENT', link: PODS }),
    kpi('ven_cancellations', now.cancellations, before.cancellations, {
      higherIsBetter: false,
      link: consoleLink('finance', '/cancellations'),
    }),
  ];
}

function venueTrends(venues: readonly VenueRow[], current: VenuePeriod, window: AnalyticsWindow): AnalyticsTrend[] {
  const perBucket = <T>(rows: readonly T[], dateOf: (row: T) => Date) =>
    seriesFromDays(dayTotals(rows, dateOf, window.zone), window);
  const answeredAt = (decision: Decision) => decision.at;
  const created = venues.filter((venue) => venue.created_at >= window.from);
  const activeDays = current.pods.map((pod) => ({ day: dayKeyIn(pod.starts_at, window.zone), id: pod.venue_id }));
  const approved = current.decisions.filter((decision) => decision.outcome === 'APPROVED');
  const turnedDown = current.decisions.filter((decision) => TURNED_DOWN.has(decision.outcome));
  const requests = [
    { key: 'ven_slot_requests', values: seriesFromDays(current.requests, window) },
    { key: 'ven_approved', values: perBucket(approved, answeredAt) },
    { key: 'ven_declined', values: perBucket(turnedDown, answeredAt) },
  ];
  const pods = [
    { key: 'ven_pods_held', values: perBucket(current.pods, (pod) => pod.starts_at) },
    { key: 'ven_cancellations', values: seriesFromDays(current.cancelled, window) },
  ];
  const growth = [
    { key: 'ven_new', values: perBucket(created, (venue) => venue.created_at) },
    { key: 'ven_active', values: distinctSeries(activeDays, window) },
  ];
  return [
    trend('ven_requests', window, requests, 'COUNT', ANSWERS),
    trend('ven_pods', window, pods, 'COUNT', PODS),
    trend('ven_growth', window, growth, 'COUNT', VENUES),
  ];
}

async function venueBreakdowns(venues: readonly VenueRow[], decisions: readonly Decision[], now: Date) {
  const cities = tally(venues.map((venue) => refKey(venue.location_id)));
  const categories = tally(venues.map((venue) => refKey(venue.venue_category?.category_id)));
  const [cityNames, categoryNameMap, slots] = await Promise.all([
    locationNames(cities.keys()),
    categoryNames(categories.keys()),
    upcomingSlots(now),
  ]);
  const allTime = { scope: 'ALL_TIME', link: VENUES } as const;
  const breakdowns: AnalyticsBreakdown[] = [
    breakdown('ven_by_status', fixedSlices(VENUE_STATUSES, tally(venues.map((venue) => venue.status))), {
      ...allTime,
      ordered: true,
    }),
    breakdown('ven_by_city', topSlices(cities, cityNames), allTime),
    breakdown('ven_by_category', topSlices(categories, categoryNameMap), allTime),
    breakdown('ven_request_outcomes', fixedSlices(OUTCOMES, tally(decisions.map((decision) => decision.outcome))), {
      ordered: true,
      link: ANSWERS,
    }),
    breakdown('ven_upcoming_slots', fixedSlices(SLOT_STATUSES, countMap(slots)), { ...allTime, ordered: true }),
  ];
  return breakdowns;
}

/** The ten venues that held the most pods in the period, with how those pods went. */
async function venueLeaderboard(venues: readonly VenueRow[], pods: readonly VenuePod[]): Promise<AnalyticsLeaderboard> {
  const byVenue = new Map<string, VenuePod[]>();
  for (const pod of pods) {
    const held = byVenue.get(pod.venue_id) ?? [];
    held.push(pod);
    byVenue.set(pod.venue_id, held);
  }
  const ranked = [...byVenue.entries()]
    .map(([venueId, held]) => ({ venueId, held, seats: total(held.map((pod) => pod.seats)) }))
    .sort((a, b) => b.held.length - a.held.length || b.seats - a.seats)
    .slice(0, 10);
  const byId = new Map(venues.map((venue) => [venue._id.toHexString(), venue]));
  const [outcomes, cities] = await Promise.all([
    loadOutcomes(ranked.flatMap(({ held }) => held)),
    locationNames(ranked.map(({ venueId }) => refKey(byId.get(venueId)?.location_id))),
  ]);
  return {
    key: 'ven_top_venues',
    // The shared ranking columns, named for this page: ven_pods_held … ven_avg_rating.
    columns: RANKING_COLUMNS.map((column) => ({ key: `ven_${column.key}`, format: column.format })),
    link: VENUES,
    rows: ranked.map(({ venueId, held }) => {
      const venue = byId.get(venueId);
      const totals = sumPods(held, outcomes);
      return {
        id: venueId,
        name: venue?.venue_name ?? '',
        caption: cities.get(refKey(venue?.location_id)) ?? null,
        link: consoleLink('venues', `/venues/${venueId}`),
        values: rankingValues(totals, { sum: totals.rating_sum, count: totals.rating_count }),
      };
    }),
  };
}

export async function venueAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const [venues, current, previous, pending] = await Promise.all([
    loadVenues(),
    loadVenuePeriod(window.from, window.to, window.zone),
    loadVenuePeriod(window.prevFrom, window.prevTo, window.zone),
    pendingRequests(window.to),
  ]);
  const [breakdowns, leaderboard] = await Promise.all([
    venueBreakdowns(venues, current.decisions, window.to),
    venueLeaderboard(venues, current.pods),
  ]);
  return linkEverything(
    {
      kpis: venueKpis({ venues, current, previous, pending, window }),
      trends: venueTrends(venues, current, window),
      breakdowns,
      leaderboard,
    },
    VENUES
  );
}
