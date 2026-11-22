/**
 * The arithmetic of the AI Features dashboard.
 *
 * What has to hold:
 *  - totals are the sum of the feature rows, so the dashboard and the AI
 *    Features table can never disagree;
 *  - the overall and per-area average latency weigh each feature by its calls
 *    (a plain mean of averages lets one call outvote ten thousand);
 *  - areas come back most expensive first, then busiest, then by name;
 *  - the daily series has one entry per calendar day in the admin's zone, with
 *    no gaps and no duplicates, a missing day being zeros.
 */
import {
  dayKeys,
  featureAreas,
  featureTotals,
  fillDays,
  type FeatureUsage,
} from '../../aiFeature.dashboard';

const row = (over: Partial<FeatureUsage> = {}): FeatureUsage => ({
  module: 'Moderation',
  enabled: true,
  calls: 0,
  failed_calls: 0,
  skipped_calls: 0,
  prompt_tokens: 0,
  completion_tokens: 0,
  total_tokens: 0,
  cost_usd: 0,
  avg_duration_ms: 0,
  unpriced_calls: 0,
  ...over,
});

describe('featureTotals', () => {
  it('adds up every feature row and counts enabled and used features', () => {
    const totals = featureTotals([
      row({
        calls: 10,
        failed_calls: 2,
        skipped_calls: 1,
        prompt_tokens: 100,
        completion_tokens: 40,
        total_tokens: 140,
        cost_usd: 0.1234564,
        avg_duration_ms: 1000,
        unpriced_calls: 1,
      }),
      row({ enabled: false, calls: 30, total_tokens: 60, cost_usd: 0.0000002, avg_duration_ms: 200 }),
      row({ enabled: false }),
    ]);

    expect(totals).toEqual({
      features_total: 3,
      features_enabled: 1,
      features_used: 2,
      calls: 40,
      failed_calls: 2,
      skipped_calls: 1,
      prompt_tokens: 100,
      completion_tokens: 40,
      total_tokens: 200,
      cost_usd: 0.123457,
      // (1000 × 10 + 200 × 30) / 40 — weighted by calls, not (1000 + 200) / 2.
      avg_duration_ms: 400,
      unpriced_calls: 1,
    });
  });

  it('answers zeros, not NaN, when nothing was called', () => {
    const totals = featureTotals([row(), row({ enabled: false })]);

    expect(totals).toMatchObject({ features_total: 2, features_used: 0, calls: 0, avg_duration_ms: 0, cost_usd: 0 });
  });

  it('answers zeros for an empty catalogue', () => {
    expect(featureTotals([])).toMatchObject({ features_total: 0, features_enabled: 0, avg_duration_ms: 0 });
  });
});

describe('featureAreas', () => {
  it('rolls features up per area, with enabled counts and weighted latency', () => {
    const areas = featureAreas([
      row({ module: 'CRM', calls: 1, cost_usd: 0.5, total_tokens: 10, avg_duration_ms: 900, failed_calls: 1 }),
      row({ module: 'CRM', enabled: false, calls: 3, cost_usd: 0.25, total_tokens: 30, avg_duration_ms: 100 }),
      row({ module: 'Support', calls: 7, cost_usd: 2, total_tokens: 70, avg_duration_ms: 50 }),
    ]);

    expect(areas).toEqual([
      { module: 'Support', features: 1, enabled: 1, calls: 7, failed_calls: 0, total_tokens: 70, cost_usd: 2, avg_duration_ms: 50 },
      { module: 'CRM', features: 2, enabled: 1, calls: 4, failed_calls: 1, total_tokens: 40, cost_usd: 0.75, avg_duration_ms: 300 },
    ]);
  });

  it('breaks a cost tie by calls, then a full tie by area name', () => {
    const areas = featureAreas([
      row({ module: 'Zeta', calls: 1, cost_usd: 1 }),
      row({ module: 'Beta' }),
      row({ module: 'Alpha' }),
      row({ module: 'Gamma', calls: 5, cost_usd: 1 }),
    ]);

    expect(areas.map((area) => area.module)).toEqual(['Gamma', 'Zeta', 'Alpha', 'Beta']);
  });
});

describe('dayKeys', () => {
  it('lists every calendar day of a 7-day window in the admin zone, oldest first', () => {
    // 18:30 UTC is midnight in Kolkata, so the window starts on the 16th there.
    const since = new Date('2026-11-15T18:30:00.000Z');
    const now = new Date('2026-11-22T18:30:00.000Z');

    expect(dayKeys(since, now, 'Asia/Kolkata')).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
      '2026-11-23',
    ]);
  });

  it('names days by the zone, not by UTC', () => {
    const at = new Date('2026-11-22T20:00:00.000Z');

    expect(dayKeys(at, at, 'Asia/Kolkata')).toEqual(['2026-11-23']);
    expect(dayKeys(at, at, 'UTC')).toEqual(['2026-11-22']);
  });

  it('neither skips nor repeats a date across a daylight-saving change', () => {
    // New York falls back on 1 Nov 2026: that day is 25 hours long.
    const since = new Date('2026-10-30T12:00:00.000Z');
    const now = new Date('2026-11-03T12:00:00.000Z');

    expect(dayKeys(since, now, 'America/New_York')).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
    ]);
  });
});

describe('fillDays', () => {
  it('keeps the days that had calls and fills the rest with zeros, in key order', () => {
    const busy = {
      date: '2026-11-21',
      calls: 4,
      failed_calls: 1,
      skipped_calls: 0,
      total_tokens: 99,
      cost_usd: 0.02,
      avg_duration_ms: 700,
    };

    const days = fillDays(['2026-11-20', '2026-11-21', '2026-11-22'], [busy]);

    expect(days).toEqual([
      { date: '2026-11-20', calls: 0, failed_calls: 0, skipped_calls: 0, total_tokens: 0, cost_usd: 0, avg_duration_ms: 0 },
      busy,
      { date: '2026-11-22', calls: 0, failed_calls: 0, skipped_calls: 0, total_tokens: 0, cost_usd: 0, avg_duration_ms: 0 },
    ]);
  });

  it('drops a row whose date is outside the window', () => {
    const stray = { date: '2020-01-01', calls: 9, failed_calls: 0, skipped_calls: 0, total_tokens: 0, cost_usd: 0, avg_duration_ms: 0 };

    expect(fillDays(['2026-11-22'], [stray]).map((day) => day.calls)).toEqual([0]);
  });

  it('fills a richer series with the empty day it is given', () => {
    const busy = { date: '2026-11-21', visits: 3 };

    const days = fillDays(['2026-11-20', '2026-11-21'], [busy], (date) => ({ date, visits: 0 }));

    expect(days).toEqual([{ date: '2026-11-20', visits: 0 }, busy]);
  });
});
