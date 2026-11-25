import { formatDate } from '@duncit/datetime';

import { fallbackT } from '@/i18n/fallback';
import { reminderDueDate } from '@/forms/reminder';
import { agendaDays, monthGridDays, stepCursor, viewRange, viewTitle } from '../calendarView';

/** The Reminders calendar's views on the phone: their periods, headings and the days they list. */

const cursor = new Date(2026, 10, 25, 15, 30); // Wed 25 Nov 2026
const event = (
  id: string,
  date: Date,
  over: Partial<{ kind: 'reminder' | 'followup'; status: string | undefined }> = {},
) => ({
  id,
  date,
  title: id,
  kind: 'reminder' as 'reminder' | 'followup',
  status: 'PENDING',
  entity: 'GENERAL',
  ...over,
});

describe('periods', () => {
  it('pages each view by its own period', () => {
    expect(stepCursor('day', cursor, 1).getDate()).toBe(26);
    expect(stepCursor('week', cursor, -1).getDate()).toBe(18);
    expect(stepCursor('month', cursor, 1).getMonth()).toBe(11);
    expect(stepCursor('year', cursor, -1).getFullYear()).toBe(2025);
    expect(stepCursor('upcoming', cursor, 1).getMonth()).toBe(11);
  });

  it('covers whole days, weeks, months, years and the next 60 days', () => {
    expect(viewRange('day', cursor)).toEqual({
      start: new Date(2026, 10, 25),
      end: new Date(2026, 10, 25, 23, 59, 59, 999),
    });
    expect(viewRange('week', cursor).start).toEqual(new Date(2026, 10, 22));
    expect(viewRange('month', cursor).end).toEqual(new Date(2026, 10, 30, 23, 59, 59, 999));
    expect(viewRange('year', cursor).start).toEqual(new Date(2026, 0, 1));
    expect(viewRange('upcoming', cursor, cursor)).toEqual({
      start: new Date(2026, 10, 25),
      end: new Date(2027, 0, 24, 23, 59, 59, 999),
    });
    expect(viewRange('upcoming', cursor).start.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('heads each view with its period', () => {
    expect(viewTitle('day', cursor, fallbackT)).toBe(formatDate(cursor));
    expect(viewTitle('week', cursor, fallbackT)).toBe(
      `${formatDate(new Date(2026, 10, 22))} – ${formatDate(new Date(2026, 10, 28, 23, 59, 59, 999))}`,
    );
    expect(viewTitle('month', cursor, fallbackT)).toBe('November 2026');
    expect(viewTitle('year', cursor, fallbackT)).toBe('2026');
    expect(viewTitle('upcoming', cursor, fallbackT)).toBe('Upcoming');
  });

  it('draws the month in whole weeks', () => {
    const days = monthGridDays(cursor);
    expect(days.length % 7).toBe(0);
    expect(days[0]).toEqual(new Date(2026, 10, 1));
    expect(days.at(-1)).toEqual(new Date(2026, 11, 5));
  });
});

describe('agendaDays', () => {
  const events = [
    event('old-pending', new Date(2026, 10, 20, 9)),
    event('old-done', new Date(2026, 10, 20, 10), { status: 'DONE' }),
    event('old-followup', new Date(2026, 10, 21, 9), { kind: 'followup', status: undefined }),
    event('today-1', new Date(2026, 10, 25, 9)),
    event('today-2', new Date(2026, 10, 25, 18)),
    event('next-week', new Date(2026, 11, 2, 9)),
  ];

  it('groups a view’s events by day', () => {
    const week = agendaDays(events, 'week', cursor);
    expect(week.map((d) => d.events.map((e) => e.id))).toEqual([['today-1', 'today-2']]);
    expect(week[0]?.day).toEqual(new Date(2026, 10, 25));
  });

  it('keeps earlier pending reminders at the top of Upcoming, but not done ones or follow-ups', () => {
    const upcoming = agendaDays(events, 'upcoming', cursor, cursor);
    expect(upcoming.map((d) => d.events.map((e) => e.id))).toEqual([
      ['old-pending'],
      ['today-1', 'today-2'],
      ['next-week'],
    ]);
    expect(
      agendaDays(events, 'month', cursor)
        .flatMap((d) => d.events)
        .map((e) => e.id),
    ).not.toContain('next-week');
  });
});

describe('reminderDueDate', () => {
  const now = new Date(2026, 10, 25, 10, 0);

  it('is the picked date and time, or a quick choice from now', () => {
    const picked = new Date(2026, 11, 1, 16, 45);
    expect(reminderDueDate({ due: 'custom', at: picked }, now)).toBe(picked);
    expect(reminderDueDate({ due: 'hour', at: null }, now)).toEqual(new Date(2026, 10, 25, 11, 0));
    expect(reminderDueDate({ due: 'custom', at: null }, now)).toBe(now);
    expect(reminderDueDate({ due: 'week' }).getTime()).toBeGreaterThan(Date.now());
  });
});
