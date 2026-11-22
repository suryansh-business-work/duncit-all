jest.mock('@utils/app-time', () => ({ getAppTimeZone: () => 'Asia/Kolkata' }));
jest.mock('../../appInsights/appInsights.model', () => ({
  AppInsightDayModel: { find: jest.fn(), aggregate: jest.fn() },
}));

import { AppInsightDayModel } from '../../appInsights/appInsights.model';
import { resolvePeriod } from '../../entity/window';
import { appInsightsOverviewAnalytics } from '../../entity/appInsightsOverview.analytics';
import { appInsightsAndroidAnalytics } from '../../entity/appInsightsAndroid.analytics';
import { appInsightsIosAnalytics } from '../../entity/appInsightsIos.analytics';
import type { EntityAnalyticsSections } from '../../entity/shapes';

const m = (fn: unknown) => fn as jest.Mock;
const window = resolvePeriod({ days: 7 }, new Date('2026-05-07T18:30:00Z'));

/** Whole-app days per store, as find().select().sort().lean() returns them. */
const TOTALS: Record<string, Array<{ day: string; m: Record<string, number> }>> = {
  GOOGLE_PLAY: [
    { day: '2026-04-26', m: { new_installs: 10, uninstalls: 2, crashes: 1, total_installs: 900 } },
    { day: '2026-05-02', m: { new_installs: 30, uninstalls: 5, crashes: 4, anrs: 1, active_devices: 410, total_installs: 960, rating_total_avg: 4.4, reviews_5: 3, reviews_2: 1 } },
  ],
  APP_STORE: [
    { day: '2026-05-03', m: { first_downloads: 10, redownloads: 2, updates: 7, deletions: 1, crashes: 2, sessions: 50, active_devices: 20, reviews_4: 2 } },
  ],
};

/** Per-slice aggregate answers keyed by store + dimension + the metric matched. */
function aggregateAnswer(pipeline: Array<{ $match?: Record<string, unknown> }>) {
  const match = pipeline[0]?.$match ?? {};
  const metric = Object.keys(match).find((k) => k.startsWith('m.'));
  const key = `${String(match.store)}|${String(match.dimension)}|${metric ?? 'multi'}`;
  const answers: Record<string, unknown[]> = {
    'GOOGLE_PLAY|COUNTRY|multi': [{ _id: 'IN', new_installs: 25 }, { _id: 'US', new_installs: 5 }],
    'APP_STORE|COUNTRY|multi': [{ _id: 'US', first_downloads: 8 }, { _id: 'GB', first_downloads: 2 }],
    'GOOGLE_PLAY|COUNTRY|m.new_installs': [{ _id: 'IN', value: 25 }],
    'GOOGLE_PLAY|VERSION|m.active_devices': [{ _id: '181', value: 400 }],
    'GOOGLE_PLAY|VERSION|multi': [{ _id: '181', device_installs: 6, crashes: 3, anrs: 1 }],
    'APP_STORE|COUNTRY|m.first_downloads': [{ _id: 'US', value: 8 }],
    'APP_STORE|VERSION|m.sessions': [{ _id: '1.81', value: 50 }],
    'APP_STORE|VERSION|multi': [{ _id: '1.81', installs: 4, crashes: 2 }],
  };
  return Promise.resolve(answers[key] ?? []);
}

beforeEach(() => {
  m(AppInsightDayModel.find).mockImplementation(({ store }: { store: string }) => ({
    select: () => ({ sort: () => ({ lean: () => Promise.resolve(TOTALS[store] ?? []) }) }),
  }));
  m(AppInsightDayModel.aggregate).mockImplementation(aggregateAnswer);
});

const kpis = (board: EntityAnalyticsSections) => Object.fromEntries(board.kpis.map((k) => [k.key, k]));

describe('Overview', () => {
  it('adds only like measures across stores and compares only where history allows', async () => {
    const board = await appInsightsOverviewAnalytics(window);
    const k = kpis(board);
    // The App Store has numbers this week but none for the week before, so a combined
    // "previous" would compare two stores with one: those tiles are not compared.
    expect(k.ai_new_installs).toMatchObject({ value: 40, previous: null });
    expect(k.ai_new_installs_android).toMatchObject({ value: 30, previous: 10 });
    expect(k.ai_new_installs_ios).toMatchObject({ value: 10, previous: null });
    expect(k.ai_android_share).toMatchObject({ value: 75, format: 'PERCENT' });
    expect(k.ai_uninstalls).toMatchObject({ value: 6, higher_is_better: false });
    expect(k.ai_crashes).toMatchObject({ value: 6, previous: null });
    expect(k.ai_play_review_avg).toMatchObject({ value: 4.25, format: 'RATING' });
    expect(k.ai_ios_review_avg).toMatchObject({ value: 4 });
    // Active devices mean different things on the two stores, so the Overview has no such tile.
    expect(Object.keys(k).some((key) => key.includes('active'))).toBe(false);
  });

  it('charts each store as its own series and ranks countries across both', async () => {
    const board = await appInsightsOverviewAnalytics(window);
    const installs = board.trends.find((t) => t.key === 'ai_new_installs_by_store');
    expect(installs?.series.map((s) => [s.key, s.values.reduce((a, b) => a + b, 0)])).toEqual([
      ['ai_store_android', 30],
      ['ai_store_ios', 10],
    ]);
    expect(board.breakdowns.find((b) => b.key === 'ai_top_countries')?.slices.map((s) => [s.key, s.value])).toEqual([
      ['IN', 25],
      ['US', 13],
      ['GB', 2],
    ]);
    expect(board.leaderboard?.rows[1]).toMatchObject({ id: 'US', values: [5, 8, 13] });
  });
});

describe('Google Play', () => {
  it("reports Google's own measures, levels read on the last day", async () => {
    const board = await appInsightsAndroidAnalytics(window);
    const k = kpis(board);
    expect(k.ai_play_total_installs).toMatchObject({ value: 960, previous: 900 });
    expect(k.ai_play_active_devices).toMatchObject({ value: 410, previous: null });
    expect(k.ai_play_rating).toMatchObject({ value: 4.4, format: 'RATING' });
    expect(k.ai_play_reviews).toMatchObject({ value: 4 });
    expect(board.breakdowns.find((b) => b.key === 'ai_play_rating_distribution')).toMatchObject({
      ordered: true,
      slices: [
        { key: '1', value: 0 },
        { key: '2', value: 1 },
        { key: '3', value: 0 },
        { key: '4', value: 0 },
        { key: '5', value: 3 },
      ],
    });
    expect(board.leaderboard).toMatchObject({ key: 'ai_play_versions', rows: [{ id: '181', values: [400, 6, 3, 1] }] });
  });
});

describe('App Store', () => {
  it("reports Apple's own measures with downloads split by type", async () => {
    const board = await appInsightsIosAnalytics(window);
    const k = kpis(board);
    expect(k.ai_ios_first_downloads).toMatchObject({ value: 10 });
    expect(k.ai_ios_deletions).toMatchObject({ value: 1, higher_is_better: false });
    expect(k.ai_ios_active_devices).toMatchObject({ value: 20 });
    expect(board.breakdowns.find((b) => b.key === 'ai_ios_download_types')?.slices).toEqual([
      { key: 'FIRST', label: null, value: 10 },
      { key: 'REDOWNLOAD', label: null, value: 2 },
      { key: 'UPDATE', label: null, value: 7 },
    ]);
    expect(board.leaderboard).toMatchObject({ key: 'ai_ios_versions', rows: [{ id: '1.81', values: [50, 4, 2] }] });
  });
});
