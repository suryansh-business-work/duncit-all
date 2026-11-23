import { APPLE_METRICS } from '../appInsights/appInsights.metrics';
import { breakdown, fixedSlices, kpi, trend, type AnalyticsLeaderboard, type EntityAnalyticsSections } from './shapes';
import type { AnalyticsWindow } from './window';
import {
  asSlices,
  loadTotals,
  reviewStats,
  seriesOf,
  sliceMetrics,
  sliceTotals,
  starSlices,
  sumIn,
  windowDays,
  type DayRange,
} from './appInsights.data';
import { countTile, meanTile } from './appInsights.kpis';

/**
 * Analytics > App Insights > App Store: what App Store Connect's Analytics
 * Reports say, in Apple's own definitions — downloads by type, installations
 * and deletions, sessions and the devices that opened the app each day, crash
 * reports from users who share analytics, and the customer reviews of the
 * period. Apple holds back small numbers for privacy, so a quiet day can read
 * lower than it was.
 */

const STORE = 'APP_STORE' as const;
const VERSION_ROWS = 15;

/** Each app version's sessions beside its installs and crashes over the period. */
async function versionBoard(range: DayRange): Promise<AnalyticsLeaderboard> {
  const [sessions, totals] = await Promise.all([
    sliceTotals({ store: STORE, dimension: 'VERSION', metric: APPLE_METRICS.sessions, range, limit: VERSION_ROWS, mode: 'sum' }),
    sliceMetrics(STORE, 'VERSION', [APPLE_METRICS.installs, APPLE_METRICS.crashes], range),
  ]);
  return {
    key: 'ai_ios_versions',
    columns: [
      { key: 'ai_ver_sessions', format: 'COUNT' },
      { key: 'ai_ver_installs', format: 'COUNT' },
      { key: 'ai_ver_crashes', format: 'COUNT' },
    ],
    rows: sessions.map((row) => {
      const own = totals.get(row.key) ?? {};
      return {
        id: row.key,
        name: row.key,
        caption: null,
        values: [row.value, own[APPLE_METRICS.installs] ?? 0, own[APPLE_METRICS.crashes] ?? 0],
      };
    }),
  };
}

export async function appInsightsIosAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const days = windowDays(window);
  const [rows, territories, versions] = await Promise.all([
    loadTotals(STORE, window),
    sliceTotals({ store: STORE, dimension: 'COUNTRY', metric: APPLE_METRICS.firstDownloads, range: days.current, limit: 10, mode: 'sum' }),
    versionBoard(days.current),
  ]);
  const reviews = reviewStats(rows, days.current);
  const earlier = reviewStats(rows, days.previous);
  const lower = { higherIsBetter: false };
  const downloadTypes = new Map([
    ['FIRST', sumIn(rows, APPLE_METRICS.firstDownloads, days.current)],
    ['REDOWNLOAD', sumIn(rows, APPLE_METRICS.redownloads, days.current)],
    ['UPDATE', sumIn(rows, APPLE_METRICS.updates, days.current)],
  ]);

  return {
    kpis: [
      countTile('ai_ios_first_downloads', rows, APPLE_METRICS.firstDownloads, days),
      countTile('ai_ios_redownloads', rows, APPLE_METRICS.redownloads, days),
      countTile('ai_ios_updates', rows, APPLE_METRICS.updates, days),
      countTile('ai_ios_installs', rows, APPLE_METRICS.installs, days),
      countTile('ai_ios_deletions', rows, APPLE_METRICS.deletions, days, lower),
      meanTile('ai_ios_active_devices', rows, APPLE_METRICS.activeDevices, days, { format: 'DECIMAL' }),
      countTile('ai_ios_sessions', rows, APPLE_METRICS.sessions, days),
      countTile('ai_ios_crashes', rows, APPLE_METRICS.crashes, days, lower),
      kpi('ai_ios_review_avg', reviews.average ?? 0, earlier.average, { format: 'RATING' }),
      kpi('ai_ios_reviews', reviews.count, earlier.count, {}),
    ],
    trends: [
      trend('ai_ios_downloads', window, [
        { key: 'ai_ios_first_downloads', values: seriesOf(rows, APPLE_METRICS.firstDownloads, window, 'sum') },
        { key: 'ai_ios_redownloads', values: seriesOf(rows, APPLE_METRICS.redownloads, window, 'sum') },
      ]),
      trend('ai_ios_installs', window, [
        { key: 'ai_ios_installs', values: seriesOf(rows, APPLE_METRICS.installs, window, 'sum') },
        { key: 'ai_ios_deletions', values: seriesOf(rows, APPLE_METRICS.deletions, window, 'sum') },
      ]),
      trend('ai_ios_sessions', window, [
        { key: 'ai_ios_sessions', values: seriesOf(rows, APPLE_METRICS.sessions, window, 'sum') },
      ]),
      trend(
        'ai_ios_active_devices',
        window,
        [{ key: 'ai_ios_active_devices', values: seriesOf(rows, APPLE_METRICS.activeDevices, window, 'mean') }],
        'DECIMAL'
      ),
      trend('ai_ios_crashes', window, [
        { key: 'ai_ios_crashes', values: seriesOf(rows, APPLE_METRICS.crashes, window, 'sum') },
      ]),
    ],
    breakdowns: [
      breakdown('ai_ios_rating_distribution', starSlices(reviews), { ordered: true }),
      breakdown('ai_ios_top_territories', asSlices(territories)),
      breakdown('ai_ios_download_types', fixedSlices(['FIRST', 'REDOWNLOAD', 'UPDATE'], downloadTypes), { ordered: true }),
    ],
    leaderboard: versions,
  };
}
