import { APPLE_METRICS, PLAY_METRICS } from '../appInsights/appInsights.metrics';
import { breakdown, fixedSlices, kpi, pct, trend, type EntityAnalyticsSections } from './shapes';
import type { AnalyticsWindow } from './window';
import { loadTotals, reviewStats, seriesOf, sliceMetrics, sumIn, windowDays, type DayRow } from './appInsights.data';
import { combinedTile, countTile } from './appInsights.kpis';

/**
 * Analytics > App Insights > Overview: both stores side by side.
 *
 * Only like is added to like. "New installs" is Google Play's new users plus
 * the App Store's first-time downloads — each store's count of somebody
 * getting the app for the first time; uninstalls are device uninstalls and
 * deletions; crashes are crash reports. Ratings stay per store (Google's
 * report and Apple's API do not count the same reviews), and active devices
 * are not shown here at all — Google counts 30-day devices, Apple daily ones.
 */

const COUNTRY_ROWS = 15;

/** Each country's new installs on each store, largest total first. */
async function countryRows(range: { from: string; to: string }) {
  const [play, apple] = await Promise.all([
    sliceMetrics('GOOGLE_PLAY', 'COUNTRY', [PLAY_METRICS.newInstalls], range),
    sliceMetrics('APP_STORE', 'COUNTRY', [APPLE_METRICS.firstDownloads], range),
  ]);
  const keys = new Set([...play.keys(), ...apple.keys()]);
  return [...keys]
    .map((key) => {
      const android = play.get(key)?.[PLAY_METRICS.newInstalls] ?? 0;
      const ios = apple.get(key)?.[APPLE_METRICS.firstDownloads] ?? 0;
      return { key, android, ios, total: android + ios };
    })
    .filter((row) => row.key && row.total > 0)
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
}

function storeSeries(key: string, play: DayRow[], apple: DayRow[], metrics: [string, string], window: AnalyticsWindow) {
  return trend(key, window, [
    { key: 'ai_store_android', values: seriesOf(play, metrics[0], window, 'sum') },
    { key: 'ai_store_ios', values: seriesOf(apple, metrics[1], window, 'sum') },
  ]);
}

export async function appInsightsOverviewAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const days = windowDays(window);
  const [play, apple, countries] = await Promise.all([
    loadTotals('GOOGLE_PLAY', window),
    loadTotals('APP_STORE', window),
    countryRows(days.current),
  ]);
  const android = sumIn(play, PLAY_METRICS.newInstalls, days.current);
  const ios = sumIn(apple, APPLE_METRICS.firstDownloads, days.current);
  const playReviews = reviewStats(play, days.current);
  const appleReviews = reviewStats(apple, days.current);
  const installs = [
    { rows: play, metric: PLAY_METRICS.newInstalls },
    { rows: apple, metric: APPLE_METRICS.firstDownloads },
  ];

  return {
    kpis: [
      combinedTile('ai_new_installs', installs, days),
      countTile('ai_new_installs_android', play, PLAY_METRICS.newInstalls, days),
      countTile('ai_new_installs_ios', apple, APPLE_METRICS.firstDownloads, days),
      kpi('ai_android_share', pct(android, android + ios), null, { format: 'PERCENT' }),
      combinedTile(
        'ai_uninstalls',
        [
          { rows: play, metric: PLAY_METRICS.uninstalls },
          { rows: apple, metric: APPLE_METRICS.deletions },
        ],
        days,
        { higherIsBetter: false }
      ),
      combinedTile(
        'ai_crashes',
        [
          { rows: play, metric: PLAY_METRICS.crashes },
          { rows: apple, metric: APPLE_METRICS.crashes },
        ],
        days,
        { higherIsBetter: false }
      ),
      kpi('ai_play_review_avg', playReviews.average ?? 0, reviewStats(play, days.previous).average, { format: 'RATING' }),
      kpi('ai_ios_review_avg', appleReviews.average ?? 0, reviewStats(apple, days.previous).average, { format: 'RATING' }),
    ],
    trends: [
      storeSeries('ai_new_installs_by_store', play, apple, [PLAY_METRICS.newInstalls, APPLE_METRICS.firstDownloads], window),
      storeSeries('ai_uninstalls_by_store', play, apple, [PLAY_METRICS.uninstalls, APPLE_METRICS.deletions], window),
      storeSeries('ai_crashes_by_store', play, apple, [PLAY_METRICS.crashes, APPLE_METRICS.crashes], window),
    ],
    breakdowns: [
      breakdown('ai_installs_by_store', fixedSlices(['ANDROID', 'IOS'], new Map([['ANDROID', android], ['IOS', ios]]))),
      breakdown(
        'ai_top_countries',
        countries.slice(0, 10).map((row) => ({ key: row.key, label: null, value: row.total }))
      ),
      breakdown('ai_reviews_by_store', fixedSlices(['ANDROID', 'IOS'], new Map([['ANDROID', playReviews.count], ['IOS', appleReviews.count]]))),
    ],
    leaderboard: {
      key: 'ai_countries',
      columns: [
        { key: 'ai_country_android', format: 'COUNT' },
        { key: 'ai_country_ios', format: 'COUNT' },
        { key: 'ai_country_total', format: 'COUNT' },
      ],
      rows: countries.slice(0, COUNTRY_ROWS).map((row) => ({
        id: row.key,
        name: row.key,
        caption: null,
        values: [row.android, row.ios, row.total],
      })),
    },
  };
}
