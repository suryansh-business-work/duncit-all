import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { formatDate } from '@duncit/datetime';
import { periodLabel, shiftAnchor, viewRange } from '../src/calendar-period';

// Wednesday 5 Aug 2026, mid-morning, so every view's edges differ from it.
const ANCHOR = new Date(2026, 7, 5, 10, 30);

describe('viewRange', () => {
  it('is the single day in day view', () => {
    expect(viewRange('day', ANCHOR)).toEqual({ from: startOfDay(ANCHOR), to: endOfDay(ANCHOR) });
  });

  it('is the Sunday-first week in week view', () => {
    expect(viewRange('week', ANCHOR)).toEqual({
      from: startOfWeek(ANCHOR, { weekStartsOn: 0 }),
      to: endOfWeek(ANCHOR, { weekStartsOn: 0 }),
    });
  });

  it('is the whole month in month view', () => {
    expect(viewRange('month', ANCHOR)).toEqual({ from: startOfMonth(ANCHOR), to: endOfMonth(ANCHOR) });
  });
});

describe('periodLabel', () => {
  it('prints the admin-format date, the week span, or the month', () => {
    expect(periodLabel('day', ANCHOR, viewRange('day', ANCHOR))).toBe(formatDate(ANCHOR));
    const week = viewRange('week', ANCHOR);
    expect(periodLabel('week', ANCHOR, week)).toBe(`${format(week.from, 'dd MMM')} – ${format(week.to, 'dd MMM')}`);
    expect(periodLabel('month', ANCHOR, viewRange('month', ANCHOR))).toBe('August 2026');
  });
});

describe('shiftAnchor', () => {
  it('steps a month, a week or a day per the active view', () => {
    expect(shiftAnchor('month', ANCHOR, 1)).toEqual(addMonths(ANCHOR, 1));
    expect(shiftAnchor('week', ANCHOR, -1)).toEqual(addDays(ANCHOR, -7));
    expect(shiftAnchor('day', ANCHOR, 1)).toEqual(addDays(ANCHOR, 1));
  });
});
