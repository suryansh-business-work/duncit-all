import { gunzipSync } from 'node:zlib';
import { addTo, APPLE_METRICS, REVIEW_METRICS, reviewMetricOf, type AppInsightDimension, type MetricRow } from './appInsights.metrics';
import { dayOf, decodeReport, normalizeHeading, reportRows, type ReportRow } from './appInsights.csv';

/**
 * App Store Connect's Analytics Reports, as App Insights reads them.
 *
 * Apple publishes app analytics only through report requests: an ONGOING
 * request makes Apple produce daily report instances, each split into
 * gzip-compressed, tab-separated segments. Four Standard reports carry what
 * the dashboard shows. Each row is one combination of Apple's dimensions with
 * a count; App Insights adds rows up into the whole app, per territory and per
 * app version.
 *
 * Apple's "Unique Devices" are distinct within one row only. Adding them across
 * rows counts a device twice when it appears in two rows of a day (say, two
 * source types), so App Store active devices are a close upper estimate — the
 * page says so.
 */

type AppleReader = (row: ReportRow) => Array<readonly [string, number]>;

export interface AppleReportKind {
  /** Apple's report name. */
  name: string;
  /** What this report writes, on every dimension it splits by. */
  owns: readonly string[];
  /** The dimensions it can be split by (crashes have no territory). */
  dimensions: readonly AppInsightDimension[];
  read: AppleReader;
}

const counts = (row: ReportRow) => row.num('Counts', 'Count') ?? 0;

/** Which download metric a Download Type is: first-time, redownload or update; null for the rest (restores, pre-orders). */
export function downloadMetricOf(downloadType: string): string | null {
  const type = downloadType.toLowerCase();
  if (type.includes('first')) return APPLE_METRICS.firstDownloads;
  if (type.includes('redownload')) return APPLE_METRICS.redownloads;
  if (type.includes('update')) return APPLE_METRICS.updates;
  return null;
}

export const APPLE_REPORT_KINDS: readonly AppleReportKind[] = [
  {
    name: 'App Downloads Standard',
    owns: [APPLE_METRICS.firstDownloads, APPLE_METRICS.redownloads, APPLE_METRICS.updates],
    dimensions: ['TOTAL', 'COUNTRY', 'VERSION'],
    read: (row) => {
      const metric = downloadMetricOf(row.text('Download Type'));
      return metric ? [[metric, counts(row)]] : [];
    },
  },
  {
    name: 'App Store Installation and Deletion Standard',
    owns: [APPLE_METRICS.installs, APPLE_METRICS.deletions],
    dimensions: ['TOTAL', 'COUNTRY', 'VERSION'],
    read: (row) => {
      const event = row.text('Event').toLowerCase();
      if (event.startsWith('install')) return [[APPLE_METRICS.installs, counts(row)]];
      if (event.startsWith('delet')) return [[APPLE_METRICS.deletions, counts(row)]];
      return [];
    },
  },
  {
    name: 'App Sessions Standard',
    owns: [APPLE_METRICS.sessions, APPLE_METRICS.activeDevices],
    dimensions: ['TOTAL', 'COUNTRY', 'VERSION'],
    read: (row) => [
      [APPLE_METRICS.sessions, row.num('Sessions') ?? 0],
      [APPLE_METRICS.activeDevices, row.num('Unique Devices') ?? 0],
    ],
  },
  {
    name: 'App Crashes',
    owns: [APPLE_METRICS.crashes],
    dimensions: ['TOTAL', 'VERSION'],
    read: (row) => [[APPLE_METRICS.crashes, row.num('Crashes', 'Crash Count') ?? 0]],
  },
];

/** The kind for one of Apple's report names, compared loosely; null for a report App Insights does not read. */
export function appleKindOf(name: string): AppleReportKind | null {
  const wanted = normalizeHeading(name);
  return APPLE_REPORT_KINDS.find((kind) => normalizeHeading(kind.name) === wanted) ?? null;
}

const GZIP_MAGIC = [0x1f, 0x8b];

/** A segment's bytes, unzipped when gzip (Apple's segments are; a test fixture may not be). */
export function unzipSegment(bytes: Uint8Array): Uint8Array {
  return bytes[0] === GZIP_MAGIC[0] && bytes[1] === GZIP_MAGIC[1] ? new Uint8Array(gunzipSync(bytes)) : bytes;
}

function keyOf(row: ReportRow, dimension: AppInsightDimension): string {
  if (dimension === 'COUNTRY') return row.text('Territory').toUpperCase();
  if (dimension === 'VERSION') return row.text('App Version');
  return '';
}

/** Adds one segment's rows into `rows`, on every dimension the kind splits by. */
export function readAppleSegment(bytes: Uint8Array, kind: AppleReportKind, rows: Map<string, MetricRow>): void {
  for (const row of reportRows(decodeReport(unzipSegment(bytes)))) {
    const day = dayOf(row.text('Date'));
    if (!day) continue;
    const values = kind.read(row);
    for (const dimension of kind.dimensions) {
      const key = keyOf(row, dimension);
      if (dimension !== 'TOTAL' && !key) continue;
      for (const [metric, value] of values) addTo(rows, { day, dimension, key }, metric, value);
    }
  }
}

/** The first and last day rows cover, or null for none. */
export function dayBounds(rows: Iterable<MetricRow>): { from: string; to: string } | null {
  let from = '';
  let to = '';
  for (const row of rows) {
    if (!from || row.day < from) from = row.day;
    if (!to || row.day > to) to = row.day;
  }
  return from ? { from, to } : null;
}

export interface AppleReview {
  rating: number;
  createdDate: string;
}

/** Reviews counted into their day, per star. */
export function countAppleReviews(reviews: readonly AppleReview[]): MetricRow[] {
  const rows = new Map<string, MetricRow>();
  for (const review of reviews) {
    const day = dayOf(review.createdDate);
    const metric = reviewMetricOf(review.rating);
    if (day && metric) addTo(rows, { day, dimension: 'TOTAL', key: '' }, metric, 1);
  }
  return [...rows.values()];
}

export const APPLE_REVIEW_OWNS = REVIEW_METRICS;
