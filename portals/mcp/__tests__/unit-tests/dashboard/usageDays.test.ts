import { describe, expect, it } from 'vitest';
import { fillDays } from '../../../src/pages/dashboard/usageDays';

const HOUR = 60 * 60 * 1000;
/** Day keys cut in UTC. */
const utcDay = (date: Date) => date.toISOString().slice(0, 10);
/** Day keys cut at UTC+05:30, the way an admin zone ahead of the reader would. */
const istDay = (date: Date) => new Date(date.getTime() + 5.5 * HOUR).toISOString().slice(0, 10);

const WINDOW = { from: '2026-10-24T00:00:00.000Z', to: '2026-10-27T00:00:00.000Z' };

describe('fillDays', () => {
  it('gives every day of the window a bar, with a zero for the quiet ones', () => {
    expect(fillDays([{ key: '2026-10-25', calls: 4, errors: 1 }], WINDOW, utcDay)).toEqual([
      { day: '2026-10-24', calls: 0, errors: 0 },
      { day: '2026-10-25', calls: 4, errors: 1 },
      { day: '2026-10-26', calls: 0, errors: 0 },
    ]);
  });

  it('draws an all-quiet window as zeros rather than nothing', () => {
    const days = fillDays([], WINDOW, utcDay);
    expect(days).toHaveLength(3);
    expect(days.every((day) => day.calls === 0 && day.errors === 0)).toBe(true);
  });

  it('keys the window’s last instant too, when the server’s zone runs ahead of the reader’s', () => {
    const days = fillDays([{ key: '2026-10-26', calls: 2, errors: 0 }], { from: '2026-10-24T00:00:00.000Z', to: '2026-10-26T00:00:00.000Z' }, istDay);
    expect(days.map((day) => day.day)).toEqual(['2026-10-24', '2026-10-25', '2026-10-26']);
    expect(days.at(-1)).toEqual({ day: '2026-10-26', calls: 2, errors: 0 });
  });

  it('keeps a day the server counted even outside the steps, in calendar order', () => {
    const days = fillDays(
      [
        { key: '2026-10-26', calls: 1, errors: 0 },
        { key: '2026-10-23', calls: 3, errors: 3 },
      ],
      WINDOW,
      utcDay,
    );
    expect(days.map((day) => day.day)).toEqual(['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26']);
    expect(days[0]).toEqual({ day: '2026-10-23', calls: 3, errors: 3 });
  });

  it('gives a one-day window exactly one bar', () => {
    expect(fillDays([], { from: '2026-10-26T00:00:00.000Z', to: '2026-10-27T00:00:00.000Z' }, utcDay)).toEqual([
      { day: '2026-10-26', calls: 0, errors: 0 },
    ]);
  });
});
