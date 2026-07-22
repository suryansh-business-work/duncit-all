// Pure data helpers for the Host Insights charts (Host Studio dashboard). Kept
// framework-free so the mobile (gifted-charts) and mWeb (@mui/x-charts) charts
// render identical numbers. Mirrors app/mweb/src/pages/host-dashboard-page/insights.ts.

export type HostChartRange =
  | 'ALL'
  | 'LAST_YEAR'
  | 'CURRENT_YEAR'
  | 'PAST_6_MONTHS'
  | 'PAST_3_MONTHS';

/** Default "Pods by Month" range (feature 2). */
export const DEFAULT_HOST_CHART_RANGE: HostChartRange = 'PAST_6_MONTHS';

export interface ChartDatum {
  label: string;
  value: number;
}

export interface RangeMeta {
  title: string;
  description: string;
}

// Donut slice colours = semantic tokens (auth-tokens): amber / green / blue / red.
export const STATUS_SLICE_COLORS = {
  upcoming: '#f59e0b',
  ongoing: '#22c55e',
  completed: '#3b82f6',
  cancelled: '#ef4444',
} as const;

const shortMonth = (d: Date) => d.toLocaleString('en', { month: 'short' });
const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

/** The filter options — "All" only appears once the host has at least one pod. */
export function hostRangeOptions(hasPods: boolean): [HostChartRange, string][] {
  const now = new Date();
  const options: [HostChartRange, string][] = [
    ['LAST_YEAR', `Last Year (${now.getFullYear() - 1})`],
    ['CURRENT_YEAR', `Current Year (${now.getFullYear()})`],
    ['PAST_6_MONTHS', 'Past 6 Months'],
    ['PAST_3_MONTHS', 'Past 3 Months'],
  ];
  if (hasPods) options.unshift(['ALL', 'All']);
  return options;
}

/** Dynamic title + description for the selected range (feature 2). */
export function hostRangeMeta(range: HostChartRange): RangeMeta {
  const now = new Date();
  if (range === 'PAST_3_MONTHS') {
    return {
      title: 'Pods Hosted in Past 3 Months',
      description: 'Your hosted Pods over the last 3 months.',
    };
  }
  if (range === 'CURRENT_YEAR') {
    const year = now.getFullYear();
    return { title: `Pods Hosted in ${year}`, description: `Your hosted Pods during ${year}.` };
  }
  if (range === 'LAST_YEAR') {
    const year = now.getFullYear() - 1;
    return { title: `Pods Hosted in ${year}`, description: `Your hosted Pods during ${year}.` };
  }
  if (range === 'ALL') {
    return { title: 'All Hosted Pods', description: 'Your complete Pod hosting history.' };
  }
  return {
    title: 'Pods Hosted in Past 6 Months',
    description: 'Your hosted Pods over the last 6 months.',
  };
}

const parseDates = (dates: readonly (string | null | undefined)[]): Date[] =>
  dates
    .map((value) => (value ? new Date(value) : null))
    .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()));

function rangeWindow(
  range: HostChartRange,
  valid: readonly Date[],
): { start: Date; end: Date } | null {
  const now = new Date();
  if (range === 'PAST_3_MONTHS')
    return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end: now };
  if (range === 'PAST_6_MONTHS')
    return { start: new Date(now.getFullYear(), now.getMonth() - 5, 1), end: now };
  if (range === 'CURRENT_YEAR') {
    return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 1) };
  }
  if (range === 'LAST_YEAR') {
    return {
      start: new Date(now.getFullYear() - 1, 0, 1),
      end: new Date(now.getFullYear() - 1, 11, 1),
    };
  }
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

/** Pods-created-over-time series (line/bar) for the selected range (features 1 + 2). */
export function buildPodsOverTime(
  dates: readonly (string | null | undefined)[],
  range: HostChartRange,
): ChartDatum[] {
  const valid = parseDates(dates);
  const window = rangeWindow(range, valid);
  if (!window) return [];
  const keys = valid.map(monthKey);
  return monthBuckets(window.start, window.end).map((b) => ({
    label: b.label,
    value: keys.filter((key) => key === b.key).length,
  }));
}

export interface ParticipantPod {
  pod_date_time?: string | null;
  pod_attendees?: readonly unknown[] | null;
  pod_hosts_id?: readonly unknown[] | null;
}

/** Guest count per pod over time (line/area) — attendees minus the host(s). */
export function buildParticipantTrend(pods: readonly ParticipantPod[]): ChartDatum[] {
  const list = pods.filter(
    (p) => !!p.pod_date_time && !Number.isNaN(new Date(p.pod_date_time).getTime()),
  );
  list.sort(
    (a, b) =>
      new Date(a.pod_date_time as string).getTime() - new Date(b.pod_date_time as string).getTime(),
  );
  return list.map((p) => ({
    label: new Date(p.pod_date_time as string).toLocaleString('en', {
      month: 'short',
      day: 'numeric',
    }),
    value: Math.max(0, (p.pod_attendees?.length ?? 0) - (p.pod_hosts_id?.length ?? 0)),
  }));
}

export interface StatusCounts {
  upcoming: number;
  ongoing: number;
  completed: number;
  cancelled: number;
}

export interface StatusSlice {
  label: string;
  value: number;
  color: string;
}

/** Pod-status donut slices (Upcoming / Ongoing / Completed / Cancelled). */
export function buildStatusSlices(counts: StatusCounts): StatusSlice[] {
  return [
    { label: 'Upcoming', value: counts.upcoming, color: STATUS_SLICE_COLORS.upcoming },
    { label: 'Ongoing', value: counts.ongoing, color: STATUS_SLICE_COLORS.ongoing },
    { label: 'Completed', value: counts.completed, color: STATUS_SLICE_COLORS.completed },
    { label: 'Cancelled', value: counts.cancelled, color: STATUS_SLICE_COLORS.cancelled },
  ];
}

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

/** True when a chart has no data to show (drives the empty state). */
export function allZero(data: readonly { value: number }[]): boolean {
  return data.every((d) => d.value === 0);
}
