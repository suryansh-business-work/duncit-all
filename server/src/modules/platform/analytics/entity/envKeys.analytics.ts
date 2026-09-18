import { CATEGORY_LABELS } from '@modules/platform/envEntry/envEntry.fields';
import { ENV_CATEGORIES } from '@modules/platform/envEntry/envEntry.model';
import { PORTAL_REGISTRY } from '@modules/platform/portalMode/portalMode.registry';
import { cumulative, dayTotals, seriesFromDays, type AnalyticsWindow } from './window';
import {
  bandSlices,
  breakdown,
  fixedSlices,
  kpi,
  tally,
  topSlices,
  trend,
  type AnalyticsBreakdown,
  type AnalyticsLeaderboard,
  type Band,
  type EntityAnalyticsSections,
} from './shapes';
import {
  ENTRY_STATUSES,
  healthOf,
  isServing,
  loadEnvRows,
  statusOf,
  TEST_HEALTH,
  type EnvRow,
} from './envKeys.data';

/**
 * Analytics > Tech > Env Keys — the credentials in Tech > Environment
 * Variables: how many there are, which services have one serving, and whether
 * anybody has checked they still work. Counts only — no value is ever read.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const TEST_AGE_BANDS: Band[] = [
  { key: 'tested_7d', min: 0 },
  { key: 'tested_30d', min: 8 },
  { key: 'tested_90d', min: 31 },
  { key: 'tested_older', min: 91 },
];

const categoryNames = new Map<string, string>(Object.entries(CATEGORY_LABELS));
const portalNames = new Map(PORTAL_REGISTRY.map((portal) => [portal.key, portal.name]));

function testAgeSlices(active: readonly EnvRow[], now: Date) {
  const tested = active.flatMap((row) => (row.last_tested_at ? [row.last_tested_at] : []));
  const ages = tested.map((at) => Math.floor((now.getTime() - at.getTime()) / DAY_MS));
  return [...bandSlices(ages, TEST_AGE_BANDS), { key: 'tested_never', label: null, value: active.length - tested.length }];
}

function envBreakdowns(rows: readonly EnvRow[], active: readonly EnvRow[], now: Date): AnalyticsBreakdown[] {
  const perCategory = tally(rows.map((row) => row.category));
  const perPortal = tally(rows.flatMap((row) => row.assigned_portals));
  return [
    breakdown('env_by_category', topSlices(perCategory, categoryNames, ENV_CATEGORIES.length), { scope: 'ALL_TIME' }),
    breakdown('env_test_health', fixedSlices(TEST_HEALTH, tally(active.map(healthOf))), { scope: 'ALL_TIME', ordered: true }),
    breakdown('env_status', fixedSlices(ENTRY_STATUSES, tally(rows.map(statusOf))), { scope: 'ALL_TIME', ordered: true }),
    breakdown('env_test_age', testAgeSlices(active, now), { scope: 'ALL_TIME', ordered: true }),
    breakdown('env_by_portal', topSlices(perPortal, portalNames), { scope: 'ALL_TIME' }),
  ];
}

/** Every category, worst first: a failing or untested credential is the row to read. */
function categoryLeaderboard(rows: readonly EnvRow[]): AnalyticsLeaderboard {
  const tallies = ENV_CATEGORIES.map((category) => {
    const own = rows.filter((row) => row.category === category);
    const active = own.filter((row) => row.is_active);
    const health = tally(active.map(healthOf));
    return {
      category,
      values: [own.length, active.length, health.get('PASSING') ?? 0, health.get('FAILING') ?? 0, health.get('UNTESTED') ?? 0],
    };
  });
  tallies.sort((a, b) => b.values[3] - a.values[3] || b.values[4] - a.values[4] || b.values[0] - a.values[0]);
  return {
    key: 'env_categories',
    columns: ['entries', 'active', 'passing', 'failing', 'untested'].map((key) => ({ key, format: 'COUNT' as const })),
    rows: tallies.map(({ category, values }) => ({ id: category, name: CATEGORY_LABELS[category], caption: null, values })),
  };
}

export async function envKeyAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const rows = await loadEnvRows();
  const active = rows.filter((row) => row.is_active);
  const serving = new Set(rows.filter(isServing).map((row) => row.category));
  const inWindow = (at: Date | null): at is Date => at !== null && at >= window.from && at < window.to;
  const created = rows.filter((row) => inWindow(row.created_at));
  const createdBefore = rows.filter((row) => row.created_at >= window.prevFrom && row.created_at < window.from);
  const testedAt = active.map((row) => row.last_tested_at).filter(inWindow);
  const newPerBucket = seriesFromDays(dayTotals(created, (row) => row.created_at, window.zone), window);
  const health = tally(active.map(healthOf));

  return {
    kpis: [
      kpi('env_entries', rows.length, null),
      kpi('env_new_entries', created.length, createdBefore.length),
      kpi('env_active', active.length, null),
      kpi('env_services_ready', serving.size, null),
      kpi('env_services_missing', ENV_CATEGORIES.length - serving.size, null, { higherIsBetter: false }),
      kpi('env_failing', health.get('FAILING') ?? 0, null, { higherIsBetter: false }),
      kpi('env_untested', health.get('UNTESTED') ?? 0, null, { higherIsBetter: false }),
      kpi('env_tested', testedAt.length, null),
    ],
    trends: [
      trend('env_activity', window, [
        { key: 'env_new_entries', values: newPerBucket },
        { key: 'env_tested', values: seriesFromDays(dayTotals(testedAt, (at) => at, window.zone), window) },
      ]),
      trend('env_growth', window, [{ key: 'env_entries', values: cumulative(rows.length - created.length, newPerBucket) }]),
    ],
    breakdowns: envBreakdowns(rows, active, window.to),
    leaderboard: categoryLeaderboard(rows),
  };
}
