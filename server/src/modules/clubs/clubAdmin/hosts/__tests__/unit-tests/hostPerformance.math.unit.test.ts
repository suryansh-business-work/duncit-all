/**
 * Host Performance arithmetic: the score, the month boundaries in the admin's
 * zone, and the inactivity window.
 */
import {
  dayOfMonthIn,
  hostPerformanceScore,
  isHostInactive,
  isUnderperforming,
  periodOf,
  periodRange,
  podsShortOfTarget,
  recentPeriods,
  shiftPeriod,
} from '../../hostPerformance.math';

const IST = 'Asia/Kolkata';
const DAY = 24 * 60 * 60 * 1000;

describe('hostPerformanceScore', () => {
  it.each([
    [0, 8, 0],
    [4, 8, 50],
    [5, 8, 63],
    [8, 8, 100],
    [12, 8, 100],
    [1, 3, 33],
    [3, 10, 30],
  ])('%p of %p scores %p', (completed, target, score) => {
    expect(hostPerformanceScore(completed, target)).toBe(score);
  });

  it('rescales when the admin changes the target', () => {
    expect(hostPerformanceScore(6, 8)).toBe(75);
    expect(hostPerformanceScore(6, 12)).toBe(50);
    expect(hostPerformanceScore(6, 4)).toBe(100);
  });

  it('never divides by zero or goes negative', () => {
    expect(hostPerformanceScore(3, 0)).toBe(100);
    expect(hostPerformanceScore(-2, 8)).toBe(0);
  });
});

describe('podsShortOfTarget', () => {
  it('counts the pods still needed, zero once met', () => {
    expect(podsShortOfTarget(5, 8)).toBe(3);
    expect(podsShortOfTarget(8, 8)).toBe(0);
    expect(podsShortOfTarget(11, 8)).toBe(0);
  });
});

describe('months on the admin clock', () => {
  it('puts 31 Oct 20:00 UTC in November for an IST admin', () => {
    const at = new Date('2026-10-31T20:00:00Z'); // 1 Nov 01:30 IST
    expect(periodOf(at, IST)).toBe('2026-11');
    expect(periodOf(at, 'UTC')).toBe('2026-10');
    expect(dayOfMonthIn(at, IST)).toBe(1);
  });

  it('bounds a month at local midnight on the 1st', () => {
    const { start, end } = periodRange('2026-11', IST);
    expect(start.toISOString()).toBe('2026-10-31T18:30:00.000Z');
    expect(end.toISOString()).toBe('2026-11-30T18:30:00.000Z');
  });

  it('crosses the year in both directions', () => {
    expect(shiftPeriod('2026-01', -1)).toBe('2025-12');
    expect(shiftPeriod('2026-12', 1)).toBe('2027-01');
    expect(periodRange('2026-12', 'UTC').end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('lists the recent months oldest first', () => {
    expect(recentPeriods('2026-02', 3)).toEqual(['2025-12', '2026-01', '2026-02']);
  });
});

describe('inactivity and underperformance', () => {
  const now = new Date('2026-11-20T12:00:00Z');

  it('flags a host with no completed pod at all', () => {
    expect(isHostInactive(null, now, 14)).toBe(true);
  });

  it('keeps a host active up to exactly the window and flags them after it', () => {
    expect(isHostInactive(new Date(now.getTime() - 14 * DAY), now, 14)).toBe(false);
    expect(isHostInactive(new Date(now.getTime() - 14 * DAY - 1), now, 14)).toBe(true);
    expect(isHostInactive(new Date(now.getTime() - 3 * DAY), now, 2)).toBe(true);
  });

  it('reads the threshold as strictly below', () => {
    expect(isUnderperforming(99, 100)).toBe(true);
    expect(isUnderperforming(100, 100)).toBe(false);
    expect(isUnderperforming(50, 50)).toBe(false);
    expect(isUnderperforming(49, 50)).toBe(true);
  });
});
