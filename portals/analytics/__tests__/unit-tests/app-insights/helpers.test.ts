import { describe, expect, it } from 'vitest';
import { APP_INSIGHTS_TABS, syncStoreOf, tabSpec } from '../../../src/pages/app-insights/tabs';
import { periodRange } from '../../../src/pages/app-insights/period-range';
import { dailyColumns, dailySearchOf } from '../../../src/pages/app-insights/daily-columns';
import { syncLogColumns } from '../../../src/pages/app-insights/sync-log-columns';
import { initialPeriod } from '../../../src/pages/entity-analytics/period-state';
import { countryName } from '../../../src/pages/entity-analytics/slice-label';
import { dailyRow, syncLog } from '../../mocks/app-insights';

const t = (key: string) => `t:${key}`;

describe('tabs', () => {
  it('gives each tab its own dashboard and stores, with Overview as the fallback', () => {
    expect(APP_INSIGHTS_TABS.map((tab) => [tab.value, tab.page.entity, tab.page.dashboardId])).toEqual([
      ['overview', 'APP_INSIGHTS', 'analytics.appInsights'],
      ['google-play', 'APP_INSIGHTS_ANDROID', 'analytics.appInsightsAndroid'],
      ['app-store', 'APP_INSIGHTS_IOS', 'analytics.appInsightsIos'],
    ]);
    expect(tabSpec('nope' as never).value).toBe('overview');
  });

  it('syncs the one store of a store tab, and both from the Overview', () => {
    expect(syncStoreOf(tabSpec('overview'))).toBeNull();
    expect(syncStoreOf(tabSpec('google-play'))).toBe('GOOGLE_PLAY');
    expect(syncStoreOf(tabSpec('app-store'))).toBe('APP_STORE');
  });
});

describe('periodRange', () => {
  it('uses a custom range as it is, and the last N days otherwise', () => {
    expect(periodRange({ ...initialPeriod(), range: { from: '2026-01-01', to: '2026-01-31' } })).toEqual({
      from: '2026-01-01',
      to: '2026-01-31',
    });
    expect(periodRange({ ...initialPeriod(), days: 7 }, new Date(2026, 10, 22, 12))).toEqual({ from: '2026-11-15', to: '2026-11-22' });
  });
});

describe('dailyColumns', () => {
  it('shows each store only its own metrics, and the slice column only when split', () => {
    const play = dailyColumns('GOOGLE_PLAY', 'TOTAL', t).map((c) => c.field);
    expect(play).toEqual(expect.arrayContaining(['day', 'new_installs', 'anrs', 'rating_total_avg', 'reviews_5']));
    expect(play).not.toContain('first_downloads');
    expect(play).not.toContain('key');

    const apple = dailyColumns('APP_STORE', 'VERSION', t);
    expect(apple.map((c) => c.field)).toEqual(expect.arrayContaining(['key', 'first_downloads', 'sessions']));
    expect(apple.map((c) => c.field)).not.toContain('anrs');
    expect(apple.find((c) => c.field === 'key')?.headerName).toBe('t:analytics.appInsights.col.version');
  });

  it('searches a row by its day and slice', () => {
    expect(dailySearchOf(dailyRow({ day: '2026-11-20', key: 'IN' }))).toBe('2026-11-20 IN');
  });
});

describe('syncLogColumns', () => {
  it('formats the start, the store, the trigger and the duration in words', () => {
    const columns = syncLogColumns(t, (v) => `at ${v}`, (ms) => `${ms} ms`);
    const value = (field: string, row = syncLog()) => columns.find((c) => c.field === field)?.valueGetter?.(row);
    expect(value('started_at')).toBe('at 2026-11-22T04:00:00.000Z');
    expect(value('store')).toBe('t:analytics.appInsights.store.googlePlay');
    expect(value('trigger')).toBe('t:analytics.appInsights.log.schedule');
    expect(value('outcome')).toBe('t:analytics.appInsights.log.success');
    expect(value('duration_ms')).toBe('4200 ms');
    expect(value('duration_ms', syncLog({ duration_ms: null }))).toBe('');
  });
});

describe('countryName', () => {
  it('names a country code in the reader’s language, and keeps a code it cannot name', () => {
    expect(countryName('IN', 'en')).toBe('India');
    expect(countryName('xx-not-a-region', 'en')).toBe('xx-not-a-region');
  });
});
