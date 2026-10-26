import { describe, expect, it } from 'vitest';
import { initialPeriod, periodVariables } from '../../../src/pages/entity-analytics/period-state';

describe('initialPeriod', () => {
  it('starts on the default 30 days, against the previous period, in every city', () => {
    expect(initialPeriod()).toEqual({ days: 30, range: null, compare: 'PREVIOUS', city: null });
  });
});

describe('periodVariables', () => {
  it('sends the rolling length when no range is chosen', () => {
    expect(periodVariables({ days: 90, range: null, compare: 'YEAR', city: 'loc-1' })).toEqual({
      compare: 'YEAR',
      city: 'loc-1',
      days: 90,
    });
  });

  it('sends the calendar range instead of the days when one is set', () => {
    expect(
      periodVariables({ days: 90, range: { from: '2026-09-01', to: '2026-09-30' }, compare: 'PREVIOUS', city: null }),
    ).toEqual({ compare: 'PREVIOUS', city: null, from: '2026-09-01', to: '2026-09-30' });
  });
});
