import { PLAY_METRICS } from '../appInsights/appInsights.metrics';
import { breakdown, kpi, trend, type AnalyticsLeaderboard, type EntityAnalyticsSections } from './shapes';
import type { AnalyticsWindow } from './window';
import {
  asSlices,
  loadTotals,
  reviewStats,
  seriesOf,
  sliceMetrics,
  sliceTotals,
  starSlices,
  windowDays,
  type DayRange,
} from './appInsights.data';
import { countTile, levelTile, meanTile } from './appInsights.kpis';

/**
 * Analytics > App Insights > Google Play: what Google's statistics reports
 * say, in Google's own definitions — new users, device uninstalls and
 * upgrades, 30-day active devices, crashes and ANRs from users who share
 * diagnostics, the lifetime average rating, and the reviews of the period.
 */

const STORE = 'GOOGLE_PLAY' as const;
const VERSION_ROWS = 15;

/** Each version code's active devices (latest day) beside its period installs, crashes and ANRs. */
async function versionBoard(range: DayRange): Promise<AnalyticsLeaderboard> {
  const [active, totals] = await Promise.all([
    sliceTotals({ store: STORE, dimension: 'VERSION', metric: PLAY_METRICS.activeDevices, range, limit: VERSION_ROWS, mode: 'last' }),
    sliceMetrics(STORE, 'VERSION', [PLAY_METRICS.deviceInstalls, PLAY_METRICS.crashes, PLAY_METRICS.anrs], range),
  ]);
  return {
    key: 'ai_play_versions',
    columns: [
      { key: 'ai_ver_active_devices', format: 'COUNT' },
      { key: 'ai_ver_installs', format: 'COUNT' },
      { key: 'ai_ver_crashes', format: 'COUNT' },
      { key: 'ai_ver_anrs', format: 'COUNT' },
    ],
    rows: active.map((row) => {
      const own = totals.get(row.key) ?? {};
      return {
        id: row.key,
        name: row.key,
        caption: null,
        values: [
          row.value,
          own[PLAY_METRICS.deviceInstalls] ?? 0,
          own[PLAY_METRICS.crashes] ?? 0,
          own[PLAY_METRICS.anrs] ?? 0,
        ],
      };
    }),
  };
}

export async function appInsightsAndroidAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const days = windowDays(window);
  const [rows, countries, versions] = await Promise.all([
    loadTotals(STORE, window),
    sliceTotals({ store: STORE, dimension: 'COUNTRY', metric: PLAY_METRICS.newInstalls, range: days.current, limit: 10, mode: 'sum' }),
    versionBoard(days.current),
  ]);
  const reviews = reviewStats(rows, days.current);
  const earlier = reviewStats(rows, days.previous);
  const lower = { higherIsBetter: false };

  return {
    kpis: [
      levelTile('ai_play_total_installs', rows, PLAY_METRICS.totalInstalls, days),
      countTile('ai_play_new_installs', rows, PLAY_METRICS.newInstalls, days),
      countTile('ai_play_uninstalls', rows, PLAY_METRICS.uninstalls, days, lower),
      countTile('ai_play_updates', rows, PLAY_METRICS.updates, days),
      levelTile('ai_play_active_devices', rows, PLAY_METRICS.activeDevices, days),
      countTile('ai_play_crashes', rows, PLAY_METRICS.crashes, days, lower),
      countTile('ai_play_anrs', rows, PLAY_METRICS.anrs, days, lower),
      levelTile('ai_play_rating', rows, PLAY_METRICS.ratingTotal, days, { format: 'RATING' }),
      kpi('ai_play_review_avg', reviews.average ?? 0, earlier.average, { format: 'RATING' }),
      kpi('ai_play_reviews', reviews.count, earlier.count, {}),
      meanTile('ai_play_daily_rating', rows, PLAY_METRICS.ratingDaily, days, { format: 'RATING' }),
    ],
    trends: [
      trend('ai_play_installs', window, [
        { key: 'ai_play_new_installs', values: seriesOf(rows, PLAY_METRICS.newInstalls, window, 'sum') },
        { key: 'ai_play_uninstalls', values: seriesOf(rows, PLAY_METRICS.uninstalls, window, 'sum') },
        { key: 'ai_play_updates', values: seriesOf(rows, PLAY_METRICS.updates, window, 'sum') },
      ]),
      trend('ai_play_active_devices', window, [
        { key: 'ai_play_active_devices', values: seriesOf(rows, PLAY_METRICS.activeDevices, window, 'last') },
      ]),
      trend('ai_play_stability', window, [
        { key: 'ai_play_crashes', values: seriesOf(rows, PLAY_METRICS.crashes, window, 'sum') },
        { key: 'ai_play_anrs', values: seriesOf(rows, PLAY_METRICS.anrs, window, 'sum') },
      ]),
      trend(
        'ai_play_daily_rating',
        window,
        [{ key: 'ai_play_daily_rating', values: seriesOf(rows, PLAY_METRICS.ratingDaily, window, 'mean') }],
        'RATING'
      ),
    ],
    breakdowns: [
      breakdown('ai_play_rating_distribution', starSlices(reviews), { ordered: true }),
      breakdown('ai_play_top_countries', asSlices(countries)),
      breakdown('ai_play_versions_active', asSlices(versions.rows.slice(0, 10).map((r) => ({ key: r.id, value: r.values[0] ?? 0 })))),
    ],
    leaderboard: versions,
  };
}
