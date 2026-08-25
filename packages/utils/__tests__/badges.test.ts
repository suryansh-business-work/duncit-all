import { describe, expect, it } from 'vitest';
import {
  BADGE_CONDITIONS,
  BADGE_GOAL_KEY,
  BADGE_WINDOW,
  BADGE_WINDOW_KEY,
  BADGE_WINDOWS,
  badgeProgressPercent,
  sortBadgeProgress,
  type BadgeProgressLike,
} from '../src/badges';

/** The namespace every badge key lives under in the shared mWeb bundle. */
const NAMESPACE = 'mweb.badges.';

const row = (over: Partial<BadgeProgressLike> = {}): BadgeProgressLike => ({
  achieved: false,
  current: 0,
  target: 10,
  ...over,
});

describe('badge vocabulary', () => {
  it('states a goal for every condition, under the shared namespace', () => {
    for (const condition of BADGE_CONDITIONS) {
      expect(BADGE_GOAL_KEY[condition].startsWith(NAMESPACE)).toBe(true);
    }
    expect(new Set(Object.values(BADGE_GOAL_KEY)).size).toBe(BADGE_CONDITIONS.length);
  });

  it('measures every condition over a known window', () => {
    for (const condition of BADGE_CONDITIONS) {
      expect(BADGE_WINDOWS).toContain(BADGE_WINDOW[condition]);
    }
  });

  it('labels every window', () => {
    for (const window of BADGE_WINDOWS) {
      expect(BADGE_WINDOW_KEY[window].startsWith(NAMESPACE)).toBe(true);
    }
  });

  it('resets the count only for the monthly badge, and never for a role', () => {
    expect(BADGE_WINDOW.MONTHLY_POD_ATTEND_COUNT).toBe('CALENDAR_MONTH');
    expect(BADGE_WINDOW.ROLE_GRANTED).toBe('ON_APPROVAL');
    expect(BADGE_WINDOW.POD_ATTEND_COUNT).toBe('LIFETIME');
  });
});

describe('badgeProgressPercent', () => {
  it('reads part-way to the goal', () => {
    expect(badgeProgressPercent(row({ current: 4, target: 10 }))).toBe(40);
  });

  it('pins an achieved badge at 100 even after the metric slips back', () => {
    expect(badgeProgressPercent(row({ achieved: true, current: 3, target: 10 }))).toBe(100);
  });

  it('never runs past the goal or below zero', () => {
    expect(badgeProgressPercent(row({ current: 25, target: 10 }))).toBe(100);
    expect(badgeProgressPercent(row({ current: -4, target: 10 }))).toBe(0);
  });

  it('reads empty rather than dividing by a goal of zero', () => {
    expect(badgeProgressPercent(row({ current: 5, target: 0 }))).toBe(0);
  });
});

describe('sortBadgeProgress', () => {
  it('puts earned badges first, then the closest to unlocking', () => {
    const rows = [
      row({ current: 1, target: 10 }),
      row({ achieved: true, current: 10, target: 10 }),
      row({ current: 8, target: 10 }),
    ];
    expect(sortBadgeProgress(rows).map((r) => r.current)).toEqual([10, 8, 1]);
  });

  it('leaves the caller list untouched', () => {
    const rows = [row({ current: 1 }), row({ achieved: true })];
    const sorted = sortBadgeProgress(rows);
    expect(rows[0]?.current).toBe(1);
    expect(sorted).not.toBe(rows);
  });
});
