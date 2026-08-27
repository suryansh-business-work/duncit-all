/**
 * The Host Studio insight charts, as data.
 *
 * mWeb draws these with `@mui/x-charts` and the app with `gifted-charts`, so the
 * two views cannot be shared — but the NUMBERS have to be identical, because a
 * host reads them beside the money the settlement pays out. They were two
 * near-identical files (`app/mweb/.../insights.ts` and
 * `app/mobile-app/src/utils/host-insights.ts`), each ~190 lines, and the app's
 * copy had already hard-coded the donut palette instead of reading the shared
 * tokens.
 *
 * Nothing here touches React, a chart library or a design-token package: the
 * palette is injected and the copy arrives through `t`, which is what keeps this
 * module inside a zero-dependency package (rule 40).
 */
import { podSeatsTaken } from './pod-spots';

/** The window a host can put the "Pods by month" chart into. */
export type HostChartRange =
  | 'ALL'
  | 'LAST_YEAR'
  | 'CURRENT_YEAR'
  | 'PAST_6_MONTHS'
  | 'PAST_3_MONTHS';

/** What the chart opens on. */
export const DEFAULT_HOST_CHART_RANGE: HostChartRange = 'PAST_6_MONTHS';

/** One labelled point on any of the charts. */
export interface ChartDatum {
  label: string;
  value: number;
}

/** The heading over the range-filtered chart. */
export interface RangeMeta {
  title: string;
  description: string;
}

/**
 * The translator a caller hands in.
 *
 * Typed locally so this package stays dependency-free; mWeb's and the app's `t`
 * both satisfy it.
 */
export type InsightsTranslate = (
  key: string,
  options?: { vars?: Record<string, string | number> },
) => string;

/**
 * The four donut colours, injected rather than held here.
 *
 * Both surfaces pass `semantic` from `@duncit/auth-tokens`. Holding the hex
 * codes in this package would mean a zero-dependency copy of the design tokens,
 * which is exactly how the app's donut ended up with its own literals.
 */
export interface StatusPalette {
  warning: string;
  success: string;
  info: string;
  error: string;
}

const shortMonth = (d: Date) => d.toLocaleString('en', { month: 'short' });
const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

/**
 * The filter options, newest window first.
 *
 * "All" only appears once the host has at least one pod — an empty history has
 * no range to show, and the option would open a chart that is always blank.
 */
export function hostRangeOptions(
  hasPods: boolean,
  t: InsightsTranslate,
  now: Date = new Date(),
): [HostChartRange, string][] {
  const year = now.getFullYear();
  const options: [HostChartRange, string][] = [
    ['LAST_YEAR', t('mweb.hostDashboard.insights.rangeLastYear', { vars: { year: year - 1 } })],
    ['CURRENT_YEAR', t('mweb.hostDashboard.insights.rangeCurrentYear', { vars: { year } })],
    ['PAST_6_MONTHS', t('mweb.hostDashboard.insights.rangePast6Months')],
    ['PAST_3_MONTHS', t('mweb.hostDashboard.insights.rangePast3Months')],
  ];
  if (hasPods) options.unshift(['ALL', t('mweb.hostDashboard.insights.rangeAll')]);
  return options;
}

/** Title + description for the selected range. */
export function hostRangeMeta(
  range: HostChartRange,
  t: InsightsTranslate,
  now: Date = new Date(),
): RangeMeta {
  if (range === 'PAST_3_MONTHS') {
    return {
      title: t('mweb.hostDashboard.insights.titlePast3'),
      description: t('mweb.hostDashboard.insights.descPast3'),
    };
  }
  if (range === 'CURRENT_YEAR' || range === 'LAST_YEAR') {
    const year = range === 'CURRENT_YEAR' ? now.getFullYear() : now.getFullYear() - 1;
    return {
      title: t('mweb.hostDashboard.insights.titleYear', { vars: { year } }),
      description: t('mweb.hostDashboard.insights.descYear', { vars: { year } }),
    };
  }
  if (range === 'ALL') {
    return {
      title: t('mweb.hostDashboard.insights.titleAll'),
      description: t('mweb.hostDashboard.insights.descAll'),
    };
  }
  return {
    title: t('mweb.hostDashboard.insights.titlePast6'),
    description: t('mweb.hostDashboard.insights.descPast6'),
  };
}

const parseDates = (dates: readonly (string | null | undefined)[]): Date[] =>
  dates
    .map((value) => (value ? new Date(value) : null))
    .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()));

function rangeWindow(
  range: HostChartRange,
  valid: readonly Date[],
  now: Date,
): { start: Date; end: Date } | null {
  if (range === 'PAST_3_MONTHS') {
    return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end: now };
  }
  if (range === 'PAST_6_MONTHS') {
    return { start: new Date(now.getFullYear(), now.getMonth() - 5, 1), end: now };
  }
  if (range === 'CURRENT_YEAR') {
    return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 1) };
  }
  if (range === 'LAST_YEAR') {
    return {
      start: new Date(now.getFullYear() - 1, 0, 1),
      end: new Date(now.getFullYear() - 1, 11, 1),
    };
  }
  // ALL — from the host's first pod to today. With no pods there is no window,
  // and the caller shows the empty state instead of an axis of nothing.
  if (valid.length === 0) return null;
  const earliest = new Date(Math.min(...valid.map((d) => d.getTime())));
  return { start: new Date(earliest.getFullYear(), earliest.getMonth(), 1), end: now };
}

function monthBuckets(start: Date, end: Date): { key: string; label: string }[] {
  const buckets: { key: string; label: string }[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    buckets.push({ key: monthKey(cursor), label: shortMonth(cursor) });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
}

/** Pods created per month, over the selected range. Empty months stay at 0. */
export function buildPodsOverTime(
  dates: readonly (string | null | undefined)[],
  range: HostChartRange,
  now: Date = new Date(),
): ChartDatum[] {
  const valid = parseDates(dates);
  const window = rangeWindow(range, valid, now);
  if (!window) return [];
  const keys = valid.map(monthKey);
  return monthBuckets(window.start, window.end).map((b) => ({
    label: b.label,
    value: keys.filter((key) => key === b.key).length,
  }));
}

/** The shape the participant trend reads off each pod. */
export interface ParticipantPod {
  pod_date_time?: string | null;
  pod_attendees?: readonly unknown[] | null;
  pod_hosts_id?: readonly unknown[] | null;
}

/**
 * Guests per pod over time — seats taken, minus the host(s).
 *
 * Seats rather than people: this sits beside money the host is shown, and the
 * settlement it has to agree with is priced per seat.
 */
export function buildParticipantTrend(pods: readonly ParticipantPod[]): ChartDatum[] {
  const list = pods.filter(
    (p) => !!p.pod_date_time && !Number.isNaN(new Date(p.pod_date_time).getTime()),
  );
  const sorted = [...list].sort(
    (a, b) =>
      new Date(a.pod_date_time as string).getTime() - new Date(b.pod_date_time as string).getTime(),
  );
  return sorted.map((p) => ({
    label: new Date(p.pod_date_time as string).toLocaleString('en', {
      month: 'short',
      day: 'numeric',
    }),
    value: Math.max(0, podSeatsTaken(p) - (p.pod_hosts_id?.length ?? 0)),
  }));
}

/** How the host's pods split across the four states. */
export interface StatusCounts {
  upcoming: number;
  ongoing: number;
  completed: number;
  cancelled: number;
}

/** One donut slice, ready to draw. */
export interface StatusSlice {
  label: string;
  value: number;
  color: string;
}

/** The pod-status donut: Upcoming / Ongoing / Completed / Cancelled. */
export function buildStatusSlices(
  counts: Readonly<StatusCounts>,
  palette: Readonly<StatusPalette>,
  t: InsightsTranslate,
): StatusSlice[] {
  return [
    {
      label: t('mweb.hostDashboard.insights.statusUpcoming'),
      value: counts.upcoming,
      color: palette.warning,
    },
    {
      label: t('mweb.hostDashboard.insights.statusOngoing'),
      value: counts.ongoing,
      color: palette.success,
    },
    {
      label: t('mweb.hostDashboard.insights.statusCompleted'),
      value: counts.completed,
      color: palette.info,
    },
    {
      label: t('mweb.hostDashboard.insights.statusCancelled'),
      value: counts.cancelled,
      color: palette.error,
    },
  ];
}

/** A month of host earnings as the server reports it: `"2026-08"` plus a total. */
export interface MonthlyEarning {
  month: string;
  total: number;
}

/** Monthly host-earnings bars, labelled by short month name. */
export function buildEarningsBars(rows: readonly MonthlyEarning[]): ChartDatum[] {
  return rows.map((row) => {
    const [year, month] = row.month.split('-').map(Number);
    const label = shortMonth(new Date(year || 0, (month || 1) - 1, 1));
    return { label, value: row.total };
  });
}

/** True when a chart has nothing to show, which drives the empty state. */
export function allZero(data: readonly { value: number }[]): boolean {
  return data.every((d) => d.value === 0);
}
