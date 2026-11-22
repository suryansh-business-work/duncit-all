/**
 * The words App Insights stores numbers under.
 *
 * Each store reports its own measures with its own definitions, so every
 * metric here is named for exactly what its store counts and is never filled
 * from the other store's report. A Google Play "new install" is a user
 * installing the app on their first device; an App Store "first-time download"
 * is an Apple account downloading it for the first time — close enough to be
 * shown side by side and added up as "new installs", which the Overview does,
 * and said so in its hint. Everything that is NOT comparable (Google's 30-day
 * active device installs against Apple's daily unique devices, Google's
 * lifetime average rating) stays on its own store's tab.
 */

export type AppInsightStore = 'GOOGLE_PLAY' | 'APP_STORE';

export const APP_INSIGHT_STORES: readonly AppInsightStore[] = ['GOOGLE_PLAY', 'APP_STORE'];

/** TOTAL is the whole app for the day; COUNTRY and VERSION split the same day by one dimension. */
export type AppInsightDimension = 'TOTAL' | 'COUNTRY' | 'VERSION';

/** Google Play's daily statistics reports (Play Console → Download reports → Statistics). */
export const PLAY_METRICS = {
  /** Daily User Installs: users who installed the app on their first device that day. */
  newInstalls: 'new_installs',
  /** Daily Device Installs: devices the app was installed on that day. */
  deviceInstalls: 'device_installs',
  /** Daily Device Uninstalls. */
  uninstalls: 'uninstalls',
  /** Daily User Uninstalls: users who removed the app from all their devices. */
  userUninstalls: 'user_uninstalls',
  /** Daily Device Upgrades: devices that updated the app. */
  updates: 'updates',
  /** Active Device Installs: devices with the app installed that were online in the last 30 days. A level, not a count of the day. */
  activeDevices: 'active_devices',
  /** Total User Installs: every user who ever installed the app. A level. */
  totalInstalls: 'total_installs',
  installEvents: 'install_events',
  uninstallEvents: 'uninstall_events',
  updateEvents: 'update_events',
  /** Daily Crashes and Daily ANRs (from users who opted in to sharing diagnostics). */
  crashes: 'crashes',
  anrs: 'anrs',
  /** Daily Average Rating — of the ratings given that day. */
  ratingDaily: 'rating_daily_avg',
  /** Total Average Rating — Google's lifetime average. A level. */
  ratingTotal: 'rating_total_avg',
} as const;

/** App Store Connect's Analytics Reports (Standard reports) for the app. */
export const APPLE_METRICS = {
  /** App Downloads Standard, Download Type "First-time download". */
  firstDownloads: 'first_downloads',
  /** App Downloads Standard, Download Type "Redownload". */
  redownloads: 'redownloads',
  /** App Downloads Standard, any update Download Type (auto or manual). */
  updates: 'updates',
  /** App Store Installation and Deletion Standard, Event "Install". */
  installs: 'installs',
  /** App Store Installation and Deletion Standard, Event "Delete". */
  deletions: 'deletions',
  /** App Sessions Standard. */
  sessions: 'sessions',
  /** App Sessions Standard, Unique Devices: devices that opened the app that day. */
  activeDevices: 'active_devices',
  /** App Crashes. */
  crashes: 'crashes',
} as const;

/** Reviews received each day, per star. Both stores fill these from their own reviews. */
export const REVIEW_METRICS = ['reviews_1', 'reviews_2', 'reviews_3', 'reviews_4', 'reviews_5'] as const;

export type ReviewMetric = (typeof REVIEW_METRICS)[number];

/** The metric for a 1-5 star rating, or null for anything else. */
export function reviewMetricOf(stars: number): ReviewMetric | null {
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return null;
  return REVIEW_METRICS[stars - 1] ?? null;
}

/**
 * Levels — numbers that describe the state on a day rather than what happened
 * during it. They are never added up across days: a period reads the last
 * day's value, and a chart's week or month reads its last day.
 */
export const LEVEL_METRICS: ReadonlySet<string> = new Set([
  PLAY_METRICS.activeDevices,
  PLAY_METRICS.totalInstalls,
  PLAY_METRICS.ratingTotal,
]);

/** Averages of the day — read as a mean across days, never summed. */
export const AVERAGE_METRICS: ReadonlySet<string> = new Set([PLAY_METRICS.ratingDaily, APPLE_METRICS.activeDevices]);

/** One stored day of one store, for one slice. */
export interface MetricRow {
  day: string;
  dimension: AppInsightDimension;
  /** '' for TOTAL; an ISO country code; a version (code on Google Play, string on the App Store). */
  key: string;
  metrics: Record<string, number>;
}

/** Adds `value` to `metric` on the row for (day, dimension, key), creating the row. */
export function addTo(
  rows: Map<string, MetricRow>,
  at: { day: string; dimension: AppInsightDimension; key: string },
  metric: string,
  value: number
): void {
  if (!Number.isFinite(value)) return;
  const id = `${at.day}|${at.dimension}|${at.key}`;
  const row = rows.get(id) ?? { day: at.day, dimension: at.dimension, key: at.key, metrics: {} };
  row.metrics[metric] = (row.metrics[metric] ?? 0) + value;
  rows.set(id, row);
}
