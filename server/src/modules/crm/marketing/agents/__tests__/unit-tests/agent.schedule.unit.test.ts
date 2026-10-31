/**
 * When an agent next runs, read on the admin's clock. Every case pins the
 * zone (Asia/Kolkata, +05:30) and a UTC instant so the arithmetic is checked
 * across the zone boundary, not in the process zone.
 */
jest.mock('@utils/app-time', () => ({ getAppTimeZone: jest.fn(() => 'Asia/Kolkata') }));

import { getAppTimeZone } from '@utils/app-time';
import { nextRunAt } from '../../agent.schedule';

const ZONE = 'Asia/Kolkata';
// Tuesday 03 Nov 2026, 08:00 IST.
const TUESDAY_0800 = new Date('2026-11-03T02:30:00.000Z');
const ist = (iso: string) => new Date(iso).toISOString();

describe('nextRunAt — every day', () => {
  it('is today at the hour while that is still ahead', () => {
    expect(nextRunAt({ every: 'DAY', hour: 9, weekday: 0 }, TUESDAY_0800, ZONE).toISOString()).toBe(ist('2026-11-03T03:30:00.000Z'));
  });

  it('is tomorrow once the hour has passed, or is exactly now', () => {
    expect(nextRunAt({ every: 'DAY', hour: 7, weekday: 0 }, TUESDAY_0800, ZONE).toISOString()).toBe(ist('2026-11-04T01:30:00.000Z'));
    expect(nextRunAt({ every: 'DAY', hour: 8, weekday: 0 }, TUESDAY_0800, ZONE).toISOString()).toBe(ist('2026-11-04T02:30:00.000Z'));
  });

  it('reads midnight on the admin clock, not UTC', () => {
    // 00:00 IST on 04 Nov is 18:30Z on 03 Nov.
    expect(nextRunAt({ every: 'DAY', hour: 0, weekday: 0 }, TUESDAY_0800, ZONE).toISOString()).toBe(ist('2026-11-03T18:30:00.000Z'));
  });
});

describe('nextRunAt — every week', () => {
  it('is later this week when the weekday is still ahead', () => {
    // Friday 06 Nov, 09:00 IST.
    expect(nextRunAt({ every: 'WEEK', hour: 9, weekday: 5 }, TUESDAY_0800, ZONE).toISOString()).toBe(ist('2026-11-06T03:30:00.000Z'));
  });

  it('is today when the weekday is today and the hour is ahead, a week away once it has passed', () => {
    expect(nextRunAt({ every: 'WEEK', hour: 9, weekday: 2 }, TUESDAY_0800, ZONE).toISOString()).toBe(ist('2026-11-03T03:30:00.000Z'));
    expect(nextRunAt({ every: 'WEEK', hour: 7, weekday: 2 }, TUESDAY_0800, ZONE).toISOString()).toBe(ist('2026-11-10T01:30:00.000Z'));
  });

  it('wraps to next week when the weekday has gone by', () => {
    // Monday 09 Nov, 09:00 IST.
    expect(nextRunAt({ every: 'WEEK', hour: 9, weekday: 1 }, TUESDAY_0800, ZONE).toISOString()).toBe(ist('2026-11-09T03:30:00.000Z'));
    // Sunday 08 Nov.
    expect(nextRunAt({ every: 'WEEK', hour: 9, weekday: 0 }, TUESDAY_0800, ZONE).toISOString()).toBe(ist('2026-11-08T03:30:00.000Z'));
  });
});

describe('nextRunAt — the zone', () => {
  it('reads the admin zone when none is given', () => {
    const next = nextRunAt({ every: 'DAY', hour: 9, weekday: 0 }, TUESDAY_0800);
    expect(getAppTimeZone).toHaveBeenCalled();
    expect(next.toISOString()).toBe(ist('2026-11-03T03:30:00.000Z'));
  });

  it('follows another zone when one is given', () => {
    // 09:00 in Kolkata is 03:30Z; 09:00 UTC is 09:00Z.
    expect(nextRunAt({ every: 'DAY', hour: 9, weekday: 0 }, TUESDAY_0800, 'UTC').toISOString()).toBe(ist('2026-11-03T09:00:00.000Z'));
  });
});
