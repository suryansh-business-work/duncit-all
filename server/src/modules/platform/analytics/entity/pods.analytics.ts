import { consoleLink } from './links';
import { cityScope } from './city';
import { dayTotals, seriesFromDays, type AnalyticsWindow } from './window';
import { loadPodDays, loadPodPeriod, type PodPeriod } from './pods.data';
import { podBreakdowns } from './pods.breakdowns';
import { kpi, mean, pct, trend, type AnalyticsKpi, type EntityAnalyticsSections } from './shapes';

/**
 * Analytics > Pods — how much happened, how full it was, who came back and
 * what it earned. Pods are judged by the ones HELD in the period (see
 * held-pods.ts); bookings, money and ratings by when they were made.
 */

/** Where a pod's money is broken down, pod by pod. */
const POD_FINANCE = consoleLink('finance', '/pod-finance');

const seatsOf = (period: PodPeriod) => period.bookings.reduce((sum, row) => sum + (row.seats ?? 1), 0);

/** Each tile's value for one period — computed identically for both periods. */
function podFigures(period: PodPeriod) {
  const held = period.held.length;
  return {
    pods_held: held,
    pods_created: period.created,
    seats_booked: seatsOf(period),
    unique_guests: period.unique_guests,
    repeat_guest_rate: pct(period.returning_guests, period.unique_guests),
    fill_rate: pct(period.totals.seats, period.totals.spots),
    attendance_rate: pct(period.totals.checked_in, period.totals.admitted),
    revenue: period.revenue,
    avg_booking_value: mean(period.revenue, period.payments),
    cancellation_rate: pct(period.cancelled, held + period.cancelled),
    backout_rate: pct(period.backouts, period.bookings.length),
    avg_rating: mean(period.rating_sum, period.rating_count),
  };
}

function podKpis(current: PodPeriod, previous: PodPeriod): AnalyticsKpi[] {
  const now = podFigures(current);
  const before = podFigures(previous);
  return [
    kpi('pods_held', now.pods_held, before.pods_held),
    kpi('pods_created', now.pods_created, before.pods_created),
    kpi('seats_booked', now.seats_booked, before.seats_booked),
    kpi('unique_guests', now.unique_guests, before.unique_guests),
    kpi('repeat_guest_rate', now.repeat_guest_rate, before.repeat_guest_rate, { format: 'PERCENT' }),
    kpi('fill_rate', now.fill_rate, before.fill_rate, { format: 'PERCENT' }),
    kpi('attendance_rate', now.attendance_rate, before.attendance_rate, { format: 'PERCENT' }),
    kpi('revenue', now.revenue, before.revenue, { format: 'CURRENCY', link: POD_FINANCE }),
    kpi('avg_booking_value', now.avg_booking_value, before.avg_booking_value, { format: 'CURRENCY', link: POD_FINANCE }),
    kpi('cancellation_rate', now.cancellation_rate, before.cancellation_rate, {
      format: 'PERCENT',
      higherIsBetter: false,
      link: consoleLink('finance', '/cancellations'),
    }),
    kpi('backout_rate', now.backout_rate, before.backout_rate, {
      format: 'PERCENT',
      higherIsBetter: false,
      link: consoleLink('finance', '/backout-refunds'),
    }),
    kpi('avg_rating', now.avg_rating, before.avg_rating, { format: 'RATING' }),
  ];
}

export async function podAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const scope = await cityScope(window.city);
  const [current, previous, days] = await Promise.all([
    loadPodPeriod(window.from, window.to, scope),
    loadPodPeriod(window.prevFrom, window.prevTo, scope),
    loadPodDays(window.from, window.to, window.zone, scope),
  ]);
  const held = dayTotals(current.held, (pod) => pod.starts_at, window.zone);
  const seats = dayTotals(current.bookings, (row) => row.joined_at, window.zone, (row) => row.seats ?? 1);

  return {
    kpis: podKpis(current, previous),
    trends: [
      trend('pods', window, [
        { key: 'pods_held', values: seriesFromDays(held, window) },
        { key: 'pods_cancelled', values: seriesFromDays(days.cancelled, window) },
      ]),
      trend('bookings', window, [
        { key: 'seats_booked', values: seriesFromDays(seats, window) },
        { key: 'backouts', values: seriesFromDays(days.backouts, window) },
      ]),
      trend('revenue', window, [{ key: 'revenue', values: seriesFromDays(days.revenue, window) }], 'CURRENCY', POD_FINANCE),
    ],
    breakdowns: await podBreakdowns(window, current.held, current.bookings, scope),
    leaderboard: null,
  };
}
