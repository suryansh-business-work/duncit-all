import { describe, expect, it } from 'vitest';
import { initialPeriod, periodVariables } from '../../../src/pages/entity-analytics/period-state';

describe('initialPeriod', () => {
  it('starts on the default 30 days, against the previous period, in every city and on every platform', () => {
    expect(initialPeriod()).toEqual({ days: 30, range: null, compare: 'PREVIOUS', city: null, platform: null });
  });
});

describe('periodVariables', () => {
  it('sends the rolling length when no range is chosen', () => {
    expect(periodVariables({ days: 90, range: null, compare: 'YEAR', city: 'loc-1', platform: null })).toEqual({
      compare: 'YEAR',
      city: 'loc-1',
      platform: null,
      days: 90,
    });
  });

  it('sends the calendar range instead of the days when one is set', () => {
    expect(
      periodVariables({
        days: 90,
        range: { from: '2026-09-01', to: '2026-09-30' },
        compare: 'PREVIOUS',
        city: null,
        platform: null,
      }),
    ).toEqual({ compare: 'PREVIOUS', city: null, platform: null, from: '2026-09-01', to: '2026-09-30' });
  });

  it('narrows to the one platform a Product page picked, with either kind of period', () => {
    expect(periodVariables({ days: 7, range: null, compare: 'PREVIOUS', city: null, platform: 'ios' })).toMatchObject({
      platform: 'ios',
      days: 7,
    });
    expect(
      periodVariables({
        days: 7,
        range: { from: '2026-10-01', to: '2026-10-07' },
        compare: 'PREVIOUS',
        city: null,
        platform: 'android',
      }),
    ).toMatchObject({ platform: 'android', from: '2026-10-01', to: '2026-10-07' });
  });
});
