/**
 * When a pod's post goes out: calendar days before the pod's day, at the
 * configured hour in the admin zone; the next slot when that has passed; and
 * nothing for a pod a day or less away.
 */
import { dueForPlanning, idealSlot, nextSlotAfter, postSlot } from '../../podPromo.schedule';

const ZONE = 'Asia/Kolkata';
// Saturday 14 Nov 2026, 7:00 pm in Kolkata.
const START = new Date('2026-11-14T13:30:00.000Z');

describe('idealSlot', () => {
  it('lands on the calendar day N days before the pod, at the post hour in the admin zone', () => {
    // Wednesday 11 Nov, 6:00 pm IST = 12:30 UTC.
    expect(idealSlot(START, 3, 18, ZONE).toISOString()).toBe('2026-11-11T12:30:00.000Z');
  });

  it('counts calendar days, not 24-hour blocks, for a pod just after midnight', () => {
    const earlyPod = new Date('2026-11-13T19:00:00.000Z'); // 14 Nov, 00:30 IST
    expect(idealSlot(earlyPod, 1, 9, ZONE).toISOString()).toBe('2026-11-13T03:30:00.000Z'); // 13 Nov, 9:00 IST
  });

  it('reads the hour in another zone when the admin uses one', () => {
    expect(idealSlot(new Date('2026-07-10T18:00:00.000Z'), 2, 10, 'Europe/London').toISOString()).toBe('2026-07-08T09:00:00.000Z');
  });
});

describe('nextSlotAfter', () => {
  it('is today at the hour when that is still ahead', () => {
    expect(nextSlotAfter(new Date('2026-11-12T05:00:00.000Z'), 18, ZONE).toISOString()).toBe('2026-11-12T12:30:00.000Z');
  });

  it('is tomorrow when today’s hour has passed (strictly after now)', () => {
    expect(nextSlotAfter(new Date('2026-11-12T12:30:00.000Z'), 18, ZONE).toISOString()).toBe('2026-11-13T12:30:00.000Z');
  });
});

describe('postSlot', () => {
  const base = { start: START, daysBefore: 3, postHour: 18, zone: ZONE };

  it('uses the ideal slot while it is in the future', () => {
    expect(postSlot({ ...base, now: new Date('2026-11-01T00:00:00.000Z') })?.toISOString()).toBe('2026-11-11T12:30:00.000Z');
  });

  it('falls to the next post hour when the ideal slot has passed but the pod is more than a day away', () => {
    const now = new Date('2026-11-12T14:00:00.000Z'); // 12 Nov, 7:30 pm IST
    expect(postSlot({ ...base, now })?.toISOString()).toBe('2026-11-13T12:30:00.000Z');
  });

  it('gives nothing for a pod a day or less away', () => {
    expect(postSlot({ ...base, now: new Date(START.getTime() - 24 * 3_600_000) })).toBeNull();
    expect(postSlot({ ...base, now: new Date(START.getTime() - 2 * 3_600_000) })).toBeNull();
  });

  it('always lands before the pod starts, even at the edge of the window', () => {
    const now = new Date(START.getTime() - 24 * 3_600_000 - 60_000);
    const slot = postSlot({ ...base, now });
    expect(slot).not.toBeNull();
    expect(slot?.getTime() ?? Infinity).toBeLessThan(START.getTime());
    expect(slot?.getTime() ?? 0).toBeGreaterThan(now.getTime());
  });
});

describe('dueForPlanning', () => {
  const now = new Date('2026-11-10T00:00:00.000Z');
  it('plans slots within two days and leaves later ones for a later tick', () => {
    expect(dueForPlanning(new Date('2026-11-11T23:59:00.000Z'), now)).toBe(true);
    expect(dueForPlanning(new Date('2026-11-12T00:00:00.000Z'), now)).toBe(true);
    expect(dueForPlanning(new Date('2026-11-12T00:01:00.000Z'), now)).toBe(false);
  });
});
