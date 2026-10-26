import { describe, expect, it } from 'vitest';
import { alertErrorKey } from '../../../src/pages/analytics-alerts/alert-errors';

describe('alertErrorKey', () => {
  it('words each code the server sends', () => {
    expect(alertErrorKey('TILE_GONE')).toBe('analytics.alerts.errorTileGone');
    expect(alertErrorKey('NO_COMPARISON')).toBe('analytics.alerts.errorNoComparison');
    expect(alertErrorKey('LOAD_FAILED')).toBe('analytics.alerts.errorLoadFailed');
  });

  it('falls back to the generic load failure for a missing or unknown code', () => {
    expect(alertErrorKey(null)).toBe('analytics.alerts.errorLoadFailed');
    expect(alertErrorKey(undefined)).toBe('analytics.alerts.errorLoadFailed');
    expect(alertErrorKey('')).toBe('analytics.alerts.errorLoadFailed');
    expect(alertErrorKey('SOMETHING_NEW')).toBe('analytics.alerts.errorLoadFailed');
  });
});
