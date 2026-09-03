import { describe, expect, it } from 'vitest';
import {
  TAB_ORDER,
  canCancelVenuePod,
  cancelDisabledReason,
  cancelPenaltyHeadline,
  matchesTab,
  tabCounts,
  type VenuePodRow,
} from '../src/venue-pods';

/** Rows as `venuePods` hands them over, cut down to what the rules read. */
const UPCOMING: VenuePodRow = { bucket: 'UPCOMING', cancelled_at: null };
const ONGOING: VenuePodRow = { bucket: 'ONGOING', cancelled_at: null };
const COMPLETED: VenuePodRow = { bucket: 'COMPLETED', cancelled_at: null };
const CANCELLED: VenuePodRow = { bucket: 'CANCELLED', cancelled_at: '2026-07-03T00:00:00.000Z' };

describe('canCancelVenuePod', () => {
  it('allows only a pod that has not started', () => {
    expect(canCancelVenuePod(UPCOMING)).toBe(true);
    expect(canCancelVenuePod(ONGOING)).toBe(false);
    expect(canCancelVenuePod(COMPLETED)).toBe(false);
    expect(canCancelVenuePod(CANCELLED)).toBe(false);
  });

  it('refuses a pod that is already cancelled, whatever its bucket says', () => {
    // The bucket is computed from the clock, the timestamp from the fact.
    expect(canCancelVenuePod({ bucket: 'UPCOMING', cancelled_at: '2026-07-03T00:00:00.000Z' })).toBe(false);
  });

  it('reads a row that carries no cancelled_at at all as live', () => {
    expect(canCancelVenuePod({ bucket: 'UPCOMING' })).toBe(true);
  });
});

describe('cancelDisabledReason', () => {
  it('stays silent while the action is live', () => {
    expect(cancelDisabledReason(UPCOMING)).toBeNull();
  });

  it('names every reason the action is off', () => {
    expect(cancelDisabledReason(CANCELLED)).toBe('ALREADY_CANCELLED');
    expect(cancelDisabledReason({ bucket: 'UPCOMING', cancelled_at: '2026-07-03T00:00:00.000Z' })).toBe(
      'ALREADY_CANCELLED',
    );
    expect(cancelDisabledReason(ONGOING)).toBe('ALREADY_STARTED');
    expect(cancelDisabledReason(COMPLETED)).toBe('ALREADY_FINISHED');
  });
});

describe('cancelPenaltyHeadline', () => {
  it('leaves the number out until the admin-configured penalty has arrived', () => {
    expect(cancelPenaltyHeadline(null)).toBe('UNKNOWN');
    expect(cancelPenaltyHeadline(undefined)).toBe('UNKNOWN');
  });

  it('promises no Account Health hit when an admin has set the penalty to zero', () => {
    expect(cancelPenaltyHeadline(0)).toBe('NONE');
  });

  it('warns with the points otherwise', () => {
    expect(cancelPenaltyHeadline(1)).toBe('POINTS');
    expect(cancelPenaltyHeadline(7)).toBe('POINTS');
  });
});

describe('tabs', () => {
  const rows = [UPCOMING, ONGOING, COMPLETED, CANCELLED];

  it('lists the tabs in the order the strip draws them', () => {
    expect(TAB_ORDER).toEqual(['ALL', 'UPCOMING', 'CANCELLED', 'COMPLETED']);
  });

  it('puts a live pod under Upcoming, and everything under All', () => {
    expect(matchesTab(ONGOING, 'UPCOMING')).toBe(true);
    expect(matchesTab(ONGOING, 'COMPLETED')).toBe(false);
    expect(matchesTab(CANCELLED, 'CANCELLED')).toBe(true);
    expect(matchesTab(CANCELLED, 'ALL')).toBe(true);
  });

  it('counts every tab, with Upcoming covering live pods too', () => {
    expect(tabCounts(rows)).toEqual({ ALL: 4, UPCOMING: 2, CANCELLED: 1, COMPLETED: 1 });
  });

  it('counts an empty list as zero everywhere', () => {
    expect(tabCounts([])).toEqual({ ALL: 0, UPCOMING: 0, CANCELLED: 0, COMPLETED: 0 });
  });
});
