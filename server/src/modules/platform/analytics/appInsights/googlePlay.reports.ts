import { addTo, PLAY_METRICS, REVIEW_METRICS, reviewMetricOf, type AppInsightDimension, type MetricRow } from './appInsights.metrics';
import { dayOf, decodeReport, reportRows, type ReportRow } from './appInsights.csv';

/**
 * Google Play's bulk reports, as App Insights reads them.
 *
 * The Play Developer API has no install, rating or crash statistics; Google
 * publishes them only as monthly CSV files in the developer account's Cloud
 * Storage bucket (Play Console → Download reports). Each file covers one
 * month, is rewritten every day of that month, and is read here into one
 * store-day row per day and slice. Which numbers a file OWNS is fixed per kind
 * — re-reading a file replaces exactly those numbers for its month.
 */

export interface PlayReportKind {
  /** Stable id, also the object-name pattern's family. */
  id: string;
  /** The object name prefix before `<package>_`. */
  prefix: string;
  /** The suffix after `_<yyyyMM>`; '' for the reviews file, which has none. */
  suffix: string;
  dimension: AppInsightDimension;
  /** The metrics this kind writes — and clears for its month before writing. */
  owns: readonly string[];
  /** The slice key of one row ('' for TOTAL). */
  keyOf: (row: ReportRow) => string;
  read: (row: ReportRow, rows: Map<string, MetricRow>, at: { day: string; dimension: AppInsightDimension; key: string }) => void;
}

const INSTALL_COLUMNS: ReadonlyArray<readonly [string, readonly string[]]> = [
  [PLAY_METRICS.newInstalls, ['Daily User Installs']],
  [PLAY_METRICS.deviceInstalls, ['Daily Device Installs']],
  [PLAY_METRICS.uninstalls, ['Daily Device Uninstalls']],
  [PLAY_METRICS.userUninstalls, ['Daily User Uninstalls']],
  [PLAY_METRICS.updates, ['Daily Device Upgrades']],
  [PLAY_METRICS.activeDevices, ['Active Device Installs', 'Current Device Installs']],
  [PLAY_METRICS.totalInstalls, ['Total User Installs']],
  [PLAY_METRICS.installEvents, ['Install events']],
  [PLAY_METRICS.uninstallEvents, ['Uninstall events']],
  [PLAY_METRICS.updateEvents, ['Update events']],
];

const CRASH_COLUMNS: ReadonlyArray<readonly [string, readonly string[]]> = [
  [PLAY_METRICS.crashes, ['Daily Crashes']],
  [PLAY_METRICS.anrs, ['Daily ANRs']],
];

const RATING_COLUMNS: ReadonlyArray<readonly [string, readonly string[]]> = [
  [PLAY_METRICS.ratingDaily, ['Daily Average Rating']],
  [PLAY_METRICS.ratingTotal, ['Total Average Rating']],
];

/** Reads each listed column that the file has and holds a number. */
const columnsReader =
  (columns: ReadonlyArray<readonly [string, readonly string[]]>): PlayReportKind['read'] =>
  (row, rows, at) => {
    for (const [metric, headings] of columns) {
      const value = row.num(...headings);
      if (value !== null) addTo(rows, at, metric, value);
    }
  };

const ownsOf = (columns: ReadonlyArray<readonly [string, readonly string[]]>) => columns.map(([metric]) => metric);
const total = () => '';
const country = (row: ReportRow) => row.text('Country').toUpperCase();
const versionCode = (row: ReportRow) => row.text('App Version Code');

export const PLAY_REPORT_KINDS: readonly PlayReportKind[] = [
  {
    id: 'installs_overview',
    prefix: 'stats/installs/installs_',
    suffix: '_overview',
    dimension: 'TOTAL',
    owns: ownsOf(INSTALL_COLUMNS),
    keyOf: total,
    read: columnsReader(INSTALL_COLUMNS),
  },
  {
    id: 'installs_country',
    prefix: 'stats/installs/installs_',
    suffix: '_country',
    dimension: 'COUNTRY',
    owns: ownsOf(INSTALL_COLUMNS),
    keyOf: country,
    read: columnsReader(INSTALL_COLUMNS),
  },
  {
    id: 'installs_app_version',
    prefix: 'stats/installs/installs_',
    suffix: '_app_version',
    dimension: 'VERSION',
    owns: ownsOf(INSTALL_COLUMNS),
    keyOf: versionCode,
    read: columnsReader(INSTALL_COLUMNS),
  },
  {
    id: 'crashes_overview',
    prefix: 'stats/crashes/crashes_',
    suffix: '_overview',
    dimension: 'TOTAL',
    owns: ownsOf(CRASH_COLUMNS),
    keyOf: total,
    read: columnsReader(CRASH_COLUMNS),
  },
  {
    id: 'crashes_app_version',
    prefix: 'stats/crashes/crashes_',
    suffix: '_app_version',
    dimension: 'VERSION',
    owns: ownsOf(CRASH_COLUMNS),
    keyOf: versionCode,
    read: columnsReader(CRASH_COLUMNS),
  },
  {
    id: 'ratings_overview',
    prefix: 'stats/ratings/ratings_',
    suffix: '_overview',
    dimension: 'TOTAL',
    owns: ownsOf(RATING_COLUMNS),
    keyOf: total,
    read: columnsReader(RATING_COLUMNS),
  },
];

/** The reviews file: one row per review, counted into its submit day by star. */
export const PLAY_REVIEWS_KIND = {
  id: 'reviews',
  prefix: 'reviews/reviews_',
  dimension: 'TOTAL' as const,
  owns: REVIEW_METRICS,
};

/** One report object worth reading: which kind, which month. */
export interface PlayReportFile {
  name: string;
  generation: string;
  month: string;
  kind: PlayReportKind | typeof PLAY_REVIEWS_KIND;
}

const MONTH_TAIL = /_(\d{6})(_[a-z_]+)?\.csv$/;

/** Which kind and month an object in the bucket is, or null for a file App Insights does not read. */
export function classifyPlayObject(name: string, packageName: string): { kind: PlayReportFile['kind']; month: string } | null {
  const tail = MONTH_TAIL.exec(name);
  if (!tail) return null;
  const month = tail[1] ?? '';
  const suffix = tail[2] ?? '';
  const stem = name.slice(0, tail.index);
  if (stem === `${PLAY_REVIEWS_KIND.prefix}${packageName}` && suffix === '') return { kind: PLAY_REVIEWS_KIND, month };
  const kind = PLAY_REPORT_KINDS.find((k) => stem === `${k.prefix}${packageName}` && suffix === k.suffix);
  return kind ? { kind, month } : null;
}

/** The first and last day a month file can hold: `202405` → 2024-05-01 … 2024-05-31. */
export function monthDays(month: string): { from: string; to: string } {
  const year = month.slice(0, 4);
  const mm = month.slice(4, 6);
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-31` };
}

/** A statistics file's rows: one per day (and slice), metrics as the kind reads them. */
export function parsePlayStats(bytes: Uint8Array, kind: PlayReportKind): MetricRow[] {
  const rows = new Map<string, MetricRow>();
  for (const row of reportRows(decodeReport(bytes))) {
    const day = dayOf(row.text('Date'));
    if (!day) continue;
    const key = kind.keyOf(row);
    if (kind.dimension !== 'TOTAL' && !key) continue;
    kind.read(row, rows, { day, dimension: kind.dimension, key });
  }
  return [...rows.values()];
}

/** The reviews file's rows: reviews submitted per day, per star. */
export function parsePlayReviews(bytes: Uint8Array): MetricRow[] {
  const rows = new Map<string, MetricRow>();
  for (const row of reportRows(decodeReport(bytes))) {
    const day = dayOf(row.text('Review Submit Date and Time'));
    const metric = reviewMetricOf(row.num('Star Rating') ?? 0);
    if (day && metric) addTo(rows, { day, dimension: 'TOTAL', key: '' }, metric, 1);
  }
  return [...rows.values()];
}
