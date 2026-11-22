/**
 * The arithmetic of the AI portal Dashboard.
 *
 * What has to hold:
 *  - the error rate is failed over all calls to one decimal, and 0 with no calls;
 *  - a call with no user is not a person, and one person calling twice is one;
 *  - a window with no rows answers zeros, never undefined;
 *  - the change against the previous window is a percent to one decimal, null
 *    with no baseline, and the error rate's change is in points;
 *  - status, risk and channel tallies come back in the enum's order with every
 *    value present, and an unknown value is kept rather than dropped;
 *  - the Monitoring and Automation summaries count the right states;
 *  - a long failure reason is trimmed for the one-line list.
 */
import {
  ERROR_PREVIEW_CHARS,
  automationSummary,
  changeBetween,
  distinctUsers,
  emptyOverviewDay,
  errorRate,
  monitoringSummary,
  orderedCounts,
  percentChange,
  toTotals,
  trimError,
  type PeriodRow,
} from '../../aiOverview.math';

const period = (over: Partial<PeriodRow> = {}): PeriodRow => ({
  calls: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  prompt_tokens: 0,
  completion_tokens: 0,
  total_tokens: 0,
  cost: 0,
  duration: 0,
  unpriced: 0,
  users: [],
  ...over,
});

describe('errorRate', () => {
  it('is failed over all calls, to one decimal', () => {
    expect(errorRate(1, 3)).toBe(33.3);
    expect(errorRate(3, 3)).toBe(100);
  });

  it('is 0 with no calls instead of dividing by zero', () => {
    expect(errorRate(0, 0)).toBe(0);
  });
});

describe('distinctUsers', () => {
  it('counts each person once and ignores calls with no user', () => {
    expect(distinctUsers(['a', 'b', 'a', null, undefined, ''])).toBe(2);
    expect(distinctUsers([])).toBe(0);
  });
});

describe('toTotals', () => {
  it('answers zeros for a window with no calls', () => {
    expect(toTotals(undefined)).toEqual({
      calls: 0,
      success_calls: 0,
      failed_calls: 0,
      skipped_calls: 0,
      error_rate: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      cost_usd: 0,
      avg_duration_ms: 0,
      active_users: 0,
      unpriced_calls: 0,
    });
  });

  it('maps a grouped row, rounding money to six places and time to whole ms', () => {
    const totals = toTotals(
      period({
        calls: 8,
        success: 5,
        failed: 2,
        skipped: 1,
        prompt_tokens: 600,
        completion_tokens: 400,
        total_tokens: 1000,
        cost: 0.12345678,
        duration: 1234.6,
        unpriced: 1,
        users: ['u1', 'u2', 'u1', null],
      }),
    );

    expect(totals).toEqual({
      calls: 8,
      success_calls: 5,
      failed_calls: 2,
      skipped_calls: 1,
      error_rate: 25,
      prompt_tokens: 600,
      completion_tokens: 400,
      total_tokens: 1000,
      cost_usd: 0.123457,
      avg_duration_ms: 1235,
      active_users: 2,
      unpriced_calls: 1,
    });
  });

  it('treats a missing average as zero', () => {
    expect(toTotals(period({ calls: 1, duration: null })).avg_duration_ms).toBe(0);
  });
});

describe('percentChange', () => {
  it('is the change against the previous figure, to one decimal', () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(1, 3)).toBe(-66.7);
    expect(percentChange(100, 100)).toBe(0);
  });

  it('is null with no baseline, even when the current figure is zero too', () => {
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });
});

describe('changeBetween', () => {
  it('compares every headline figure, the error rate in points', () => {
    const current = toTotals(period({ calls: 20, failed: 4, total_tokens: 300, cost: 3, duration: 900, users: ['a', 'b', 'c'] }));
    const previous = toTotals(period({ calls: 10, failed: 1, total_tokens: 300, cost: 4, duration: 1200, users: ['a', 'b'] }));

    expect(changeBetween(current, previous)).toEqual({
      calls: 100,
      cost_usd: -25,
      total_tokens: 0,
      active_users: 50,
      avg_duration_ms: -25,
      // 20% now against 10% before: +10 points, not +100%.
      error_rate_points: 10,
    });
  });

  it('has no baseline for anything when the previous window had no calls', () => {
    const current = toTotals(period({ calls: 5, failed: 1 }));

    expect(changeBetween(current, toTotals(undefined))).toEqual({
      calls: null,
      cost_usd: null,
      total_tokens: null,
      active_users: null,
      avg_duration_ms: null,
      error_rate_points: null,
    });
  });
});

describe('emptyOverviewDay', () => {
  it('is a zero for every figure on that date', () => {
    expect(emptyOverviewDay('2026-11-01')).toEqual({
      date: '2026-11-01',
      calls: 0,
      success_calls: 0,
      failed_calls: 0,
      skipped_calls: 0,
      total_tokens: 0,
      cost_usd: 0,
      avg_duration_ms: 0,
      active_users: 0,
    });
  });
});

describe('orderedCounts', () => {
  it('lists every known value in the enum order, zeros included', () => {
    expect(orderedCounts([{ _id: 'HIGH', count: 2 }], ['LOW', 'HIGH'])).toEqual([
      { key: 'LOW', count: 0 },
      { key: 'HIGH', count: 2 },
    ]);
  });

  it('keeps a value the enum no longer lists, after the known ones', () => {
    expect(orderedCounts([{ _id: 'LEGACY', count: 1 }, { _id: 'LOW', count: 3 }], ['LOW'])).toEqual([
      { key: 'LOW', count: 3 },
      { key: 'LEGACY', count: 1 },
    ]);
  });

  it('answers every value at zero when there are no tallies', () => {
    expect(orderedCounts(undefined, ['A', 'B'])).toEqual([
      { key: 'A', count: 0 },
      { key: 'B', count: 0 },
    ]);
  });
});

describe('monitoringSummary', () => {
  const RISKS = ['PENDING', 'LOW', 'MEDIUM', 'HIGH'];
  const ACTIONS = ['NONE', 'ALLOWED', 'FLAGGED', 'BLOCKED'];
  const STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'SKIPPED'];

  it('counts checks, flags, blocks and failed checks', () => {
    const summary = monitoringSummary(
      {
        risk: [{ _id: 'HIGH', count: 2 }, { _id: 'LOW', count: 5 }],
        action: [{ _id: 'BLOCKED', count: 2 }, { _id: 'FLAGGED', count: 1 }, { _id: 'ALLOWED', count: 4 }],
        status: [{ _id: 'COMPLETED', count: 7 }, { _id: 'FAILED', count: 3 }],
      },
      RISKS,
      ACTIONS,
      STATUSES,
    );

    expect(summary).toEqual({
      scanned: 10,
      flagged: 1,
      blocked: 2,
      failed: 3,
      by_risk: [
        { key: 'PENDING', count: 0 },
        { key: 'LOW', count: 5 },
        { key: 'MEDIUM', count: 0 },
        { key: 'HIGH', count: 2 },
      ],
    });
  });

  it('answers zeros when the facet came back empty', () => {
    expect(monitoringSummary(undefined, RISKS, ACTIONS, STATUSES)).toMatchObject({ scanned: 0, flagged: 0, blocked: 0, failed: 0 });
  });
});

describe('automationSummary', () => {
  const STATUSES = ['RUNNING', 'WAITING_REPLY', 'WAITING_DELAY', 'COMPLETED', 'FAILED', 'CANCELLED'];

  it('counts runs, completions, failures and the runs still going', () => {
    const summary = automationSummary(
      {
        status: [
          { _id: 'COMPLETED', count: 6 },
          { _id: 'FAILED', count: 2 },
          { _id: 'RUNNING', count: 1 },
          { _id: 'WAITING_REPLY', count: 2 },
          { _id: 'WAITING_DELAY', count: 1 },
          { _id: 'CANCELLED', count: 1 },
        ],
        channel: [{ _id: 'EMAIL', count: 13 }],
      },
      { active: 3, total: 5 },
      STATUSES,
      ['WHATSAPP', 'EMAIL'],
    );

    expect(summary).toMatchObject({ runs: 13, completed: 6, failed: 2, in_progress: 4, active_flows: 3, total_flows: 5 });
    expect(summary.by_channel).toEqual([
      { key: 'WHATSAPP', count: 0 },
      { key: 'EMAIL', count: 13 },
    ]);
  });

  it('answers zeros with no runs', () => {
    expect(automationSummary(undefined, { active: 0, total: 0 }, STATUSES, ['WHATSAPP'])).toMatchObject({
      runs: 0,
      completed: 0,
      failed: 0,
      in_progress: 0,
    });
  });
});

describe('trimError', () => {
  it('leaves a short reason alone and trims a long one to the preview length', () => {
    expect(trimError('  timeout  ')).toBe('timeout');
    const trimmed = trimError('x'.repeat(500));
    expect(trimmed).toHaveLength(ERROR_PREVIEW_CHARS);
    expect(trimmed.endsWith('…')).toBe(true);
  });

  it('answers blank for a missing reason', () => {
    expect(trimError(undefined)).toBe('');
    expect(trimError(null)).toBe('');
  });
});
