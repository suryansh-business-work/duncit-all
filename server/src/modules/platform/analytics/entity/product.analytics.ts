import { UserModel } from '@modules/access/user/user.model';
import { AppSessionModel } from '../appSession.model';
import { narrowing, type ProductScope } from '../product/product.filter';
import { screenRows } from '../product/product.screens';
import { bucketOfDay, dayKeyExpr, dayKeyIn, inRange, seriesFromDays, type AnalyticsWindow } from './window';
import { LIVE_USERS } from './users.data';
import { consoleLink } from './links';
import {
  activeInLast,
  averageDaily,
  newDevices,
  newcomerRetention,
  payingMembers,
  periodPeople,
  sessionFigures,
  type PeriodPeople,
} from './product.data';
import { breakdown, kpi, pct, topSlices, type AnalyticsKpi, type EntityAnalyticsSections } from './shapes';

/**
 * Analytics > Product > Overview — how many people use the app, how often,
 * for how long, whether they come back and whether they pay. Read from the
 * app's own events (mWeb and the native app), narrowed to one platform when
 * asked. Payments are Payment records with a paid_at, never a tap on "Pay".
 */

const PRODUCT_LINK = consoleLink('analytics', '/product/sessions');
const SCREENS_LINK = consoleLink('analytics', '/product/screens');
const RETENTION_LINK = consoleLink('analytics', '/product/retention');

const scopeOf = (window: AnalyticsWindow): ProductScope => ({ window, platform: window.platform ?? null, appVersion: null });

interface Figures {
  people: PeriodPeople;
  sessions: Awaited<ReturnType<typeof sessionFigures>>;
  devices: number;
  payers: number;
}

async function figures(scope: ProductScope, from: Date, to: Date): Promise<Figures> {
  const [people, sessions, devices] = await Promise.all([
    periodPeople(scope, from, to),
    sessionFigures(scope, from, to),
    newDevices(scope, from, to),
  ]);
  return { people, sessions, devices, payers: await payingMembers(people, from, to) };
}

const RETENTION_KEYS: ReadonlyArray<[number, string]> = [
  [1, 'prd_d1_retention'],
  [7, 'prd_d7_retention'],
  [30, 'prd_d30_retention'],
];

/** A retention tile only once some cohort of the period has reached its day — never a 0 that means "too early". */
function retentionKpis(now: Figures, before: Figures, today: string): AnalyticsKpi[] {
  const current = newcomerRetention(now.people, today);
  const previous = newcomerRetention(before.people, today);
  return RETENTION_KEYS.flatMap(([day, key]) => {
    const value = current.get(day);
    if (value === null || value === undefined) return [];
    return [kpi(key, value, previous.get(day) ?? null, { format: 'PERCENT', link: RETENTION_LINK })];
  });
}

/** Of the people active in the period before, the share not seen in this one — only when that period is the one compared with. */
function churnKpi(now: Figures, before: Figures, adjacent: boolean): AnalyticsKpi[] {
  if (!adjacent || before.people.active.size === 0) return [];
  let gone = 0;
  for (const actor of before.people.active) if (!now.people.active.has(actor)) gone += 1;
  return [kpi('prd_churn_rate', pct(gone, before.people.active.size), null, { format: 'PERCENT', higherIsBetter: false })];
}

function headlineKpis(window: AnalyticsWindow, now: Figures, before: Figures, registered: number): AnalyticsKpi[] {
  const returning = (f: Figures) => f.people.active.size - f.people.newcomers.size;
  const members = (f: Figures) => [...f.people.active].filter((actor) => !actor.startsWith('d:')).length;
  const duration = { format: 'DURATION' } as const;
  return [
    kpi('prd_registered_users', registered, null),
    kpi('prd_active_users', now.people.active.size, before.people.active.size),
    kpi('prd_dau', averageDaily(now.people, window.days), averageDaily(before.people, window.days), { format: 'DECIMAL' }),
    kpi('prd_wau', activeInLast(now.people, 7), activeInLast(before.people, 7)),
    kpi('prd_mau', activeInLast(now.people, 30), activeInLast(before.people, 30)),
    kpi('prd_new_users', now.people.newcomers.size, before.people.newcomers.size),
    kpi('prd_returning_users', returning(now), returning(before)),
    kpi('prd_new_devices', now.devices, before.devices),
    kpi('prd_sessions', now.sessions.sessions, before.sessions.sessions, { link: PRODUCT_LINK }),
    kpi('prd_avg_session', now.sessions.avgDurationMs, before.sessions.avgDurationMs, { ...duration, link: PRODUCT_LINK }),
    kpi('prd_screens_per_session', now.sessions.avgScreens, before.sessions.avgScreens, { format: 'DECIMAL', link: SCREENS_LINK }),
    kpi('prd_conversion_rate', pct(now.payers, members(now)), pct(before.payers, members(before)), { format: 'PERCENT' }),
  ];
}

/** Active, new and returning people per bucket of the window. */
function peopleTrend(window: AnalyticsWindow, people: PeriodPeople) {
  const active = new Map<string, Set<string>>();
  for (const actor of people.active) {
    for (const day of people.activity.get(actor) ?? []) {
      if (day < people.fromDay || day > people.toDay) continue;
      const bucket = bucketOfDay(day, window.granularity);
      active.set(bucket, (active.get(bucket) ?? new Set<string>()).add(actor));
    }
  }
  const fresh = new Map<string, number>();
  for (const day of people.newcomers.values()) {
    const bucket = bucketOfDay(day, window.granularity);
    fresh.set(bucket, (fresh.get(bucket) ?? 0) + 1);
  }
  const series = (of: (bucket: string) => number) => window.buckets.map(of);
  return {
    key: 'prd_people_trend',
    format: 'COUNT' as const,
    granularity: window.granularity,
    buckets: window.buckets,
    series: [
      { key: 'prd_series_active', values: series((bucket) => active.get(bucket)?.size ?? 0) },
      { key: 'prd_series_new', values: series((bucket) => fresh.get(bucket) ?? 0) },
      {
        key: 'prd_series_returning',
        values: series((bucket) => (active.get(bucket)?.size ?? 0) - (fresh.get(bucket) ?? 0)),
      },
    ],
    link: PRODUCT_LINK,
  };
}

async function sessionsTrend(scope: ProductScope) {
  const { window } = scope;
  const rows = await AppSessionModel.aggregate<{ _id: string; value: number }>([
    { $match: { started_at: inRange(window.from, window.to), ...narrowing(scope) } },
    { $group: { _id: dayKeyExpr('started_at', window.zone), value: { $sum: 1 } } },
  ]);
  return {
    key: 'prd_sessions_trend',
    format: 'COUNT' as const,
    granularity: window.granularity,
    buckets: window.buckets,
    series: [{ key: 'prd_series_sessions', values: seriesFromDays(rows, window) }],
    link: PRODUCT_LINK,
  };
}

/**
 * Sessions of the period split by one of their fields, largest first. A field
 * with a fixed set of values (platform, device type) sends bare keys the console
 * names; a free one (a version, a screen) sends the value as its own label.
 */
async function sessionsBy(scope: ProductScope, field: string, key: string, named = true) {
  const rows = await AppSessionModel.aggregate<{ _id: string; count: number }>([
    { $match: { started_at: inRange(scope.window.from, scope.window.to), ...narrowing(scope), [field]: { $ne: '' } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);
  const counts = new Map(rows.map((row) => [row._id, row.count]));
  const labels = named ? new Map([...counts.keys()].map((name) => [name, name])) : new Map<string, string>();
  return breakdown(key, topSlices(counts, labels), { link: PRODUCT_LINK });
}

async function topScreens(scope: ProductScope) {
  const rows = (await screenRows(scope)).sort((a, b) => b.views - a.views).slice(0, 10);
  return {
    key: 'prd_top_screens',
    columns: [
      { key: 'prd_col_views', format: 'COUNT' as const },
      { key: 'prd_col_users', format: 'COUNT' as const },
      { key: 'prd_col_avg_time', format: 'DURATION' as const },
      { key: 'prd_col_exit_rate', format: 'PERCENT' as const },
    ],
    rows: rows.map((row) => ({
      id: row.screen_name,
      name: row.screen_name,
      caption: null,
      values: [row.views, row.unique_users, row.avg_time_ms, row.exit_rate],
    })),
    link: SCREENS_LINK,
  };
}

export async function productAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const scope = scopeOf(window);
  const [now, before, registered, sessions, breakdowns, leaderboard] = await Promise.all([
    figures(scope, window.from, window.to),
    figures(scope, window.prevFrom, window.prevTo),
    UserModel.countDocuments(LIVE_USERS),
    sessionsTrend(scope),
    Promise.all([
      sessionsBy(scope, 'platform', 'prd_platforms', false),
      sessionsBy(scope, 'app_version', 'prd_app_versions'),
      sessionsBy(scope, 'device_type', 'prd_device_types', false),
      sessionsBy(scope, 'os_version', 'prd_os_versions'),
      sessionsBy(scope, 'entry_screen', 'prd_entry_screens'),
    ]),
    topScreens(scope),
  ]);
  const today = dayKeyIn(new Date(), window.zone);
  return {
    kpis: [
      ...headlineKpis(window, now, before, registered),
      ...retentionKpis(now, before, today),
      ...churnKpi(now, before, window.prevTo.getTime() === window.from.getTime()),
    ],
    trends: [peopleTrend(window, now.people), sessions],
    breakdowns,
    leaderboard,
    link: PRODUCT_LINK,
  };
}
