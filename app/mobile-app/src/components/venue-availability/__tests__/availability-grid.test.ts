import { MAX_FUTURE_DAYS } from '@duncit/slots';

import {
  countSlotsByDay,
  dayCellState,
  dayFromKey,
  dayKeyOf,
  lastPublishableDay,
  periodLabel,
  shiftAnchor,
  slotsOnDay,
  viewCells,
  viewRange,
  type PeriodFormatter,
} from '../availability-grid';

// Every instant is built from LOCAL parts, because day keys are in the device
// zone — a UTC literal would land on a different day on a CI box east of UTC.
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const iso = (y: number, m: number, d: number, h = 0) => at(y, m, d, h).toISOString();

// Wednesday 9 January 2030; the month starts on a Tuesday.
const anchor = at(2030, 1, 9, 15, 30);

describe('day keys', () => {
  it('round-trips a local date through its key', () => {
    expect(dayKeyOf(anchor)).toBe('2030-01-09');
    const back = dayFromKey('2030-01-09');
    expect(back.getFullYear()).toBe(2030);
    expect(back.getMonth()).toBe(0);
    expect(back.getDate()).toBe(9);
    expect(back.getHours()).toBe(0);
  });
});

describe('viewRange', () => {
  it('spans the anchor’s day', () => {
    const { from, to } = viewRange('day', anchor);
    expect(from).toEqual(at(2030, 1, 9));
    expect(dayKeyOf(to)).toBe('2030-01-09');
    expect(to.getHours()).toBe(23);
  });

  it('spans a Monday-first week', () => {
    const { from, to } = viewRange('week', anchor);
    expect(dayKeyOf(from)).toBe('2030-01-07');
    expect(dayKeyOf(to)).toBe('2030-01-13');
  });

  it('spans the whole month', () => {
    const { from, to } = viewRange('month', anchor);
    expect(dayKeyOf(from)).toBe('2030-01-01');
    expect(dayKeyOf(to)).toBe('2030-01-31');
  });
});

describe('shiftAnchor', () => {
  it('moves by a month, a week or a day in either direction', () => {
    expect(dayKeyOf(shiftAnchor('month', anchor, 1))).toBe('2030-02-09');
    expect(dayKeyOf(shiftAnchor('month', anchor, -1))).toBe('2029-12-09');
    expect(dayKeyOf(shiftAnchor('week', anchor, 1))).toBe('2030-01-16');
    expect(dayKeyOf(shiftAnchor('week', anchor, -1))).toBe('2030-01-02');
    expect(dayKeyOf(shiftAnchor('day', anchor, 1))).toBe('2030-01-10');
    expect(dayKeyOf(shiftAnchor('day', anchor, -1))).toBe('2030-01-08');
  });
});

describe('periodLabel', () => {
  const fmt: PeriodFormatter = {
    formatDay: jest.fn((key: string) => `day:${key}`),
    formatPattern: jest.fn((input: Date, pattern: string) => `${pattern}@${dayKeyOf(input)}`),
  };

  it('names a day through the day formatter', () => {
    expect(periodLabel('day', anchor, fmt)).toBe('day:2030-01-09');
  });

  it('names a week by its first and last day', () => {
    expect(periodLabel('week', anchor, fmt)).toBe('dd MMM@2030-01-07 – dd MMM@2030-01-13');
  });

  it('names a month by month and year', () => {
    expect(periodLabel('month', anchor, fmt)).toBe('MMMM yyyy@2030-01-09');
  });
});

describe('viewCells', () => {
  it('lays out the month in Monday-first rows padded with nulls', () => {
    const rows = viewCells('month', anchor);
    expect(rows.every((row) => row.length === 7)).toBe(true);
    expect(rows[0][0]).toBeNull();
    expect(rows[0][1]).toBe('2030-01-01');
    expect(rows.flat().filter(Boolean)).toHaveLength(31);
  });

  it('draws one row of seven days for a week', () => {
    expect(viewCells('week', anchor)).toEqual([
      ['2030-01-07', '2030-01-08', '2030-01-09', '2030-01-10', '2030-01-11', '2030-01-12', '2030-01-13'],
    ]);
  });

  it('draws the single anchor day for a day', () => {
    expect(viewCells('day', anchor)).toEqual([['2030-01-09']]);
  });
});

describe('countSlotsByDay', () => {
  it('counts each status per day, and unknown statuses as blocked', () => {
    const counts = countSlotsByDay([
      { start_at: iso(2030, 1, 9, 10), end_at: iso(2030, 1, 9, 11), status: 'AVAILABLE' },
      { start_at: iso(2030, 1, 9, 12), end_at: iso(2030, 1, 9, 13), status: 'AVAILABLE' },
      { start_at: iso(2030, 1, 9, 14), end_at: iso(2030, 1, 9, 15), status: 'PENDING' },
      { start_at: iso(2030, 1, 9, 16), end_at: iso(2030, 1, 9, 17), status: 'BOOKED' },
      { start_at: iso(2030, 1, 9, 18), end_at: iso(2030, 1, 9, 19), status: 'BLOCKED' },
      { start_at: iso(2030, 1, 9, 20), end_at: iso(2030, 1, 9, 21), status: 'MYSTERY' },
    ]);
    expect(counts.get('2030-01-09')).toEqual({ available: 2, pending: 1, booked: 1, blocked: 2 });
    expect(counts.size).toBe(1);
  });

  it('counts a multi-day slot on every day it covers', () => {
    const counts = countSlotsByDay([
      { start_at: iso(2030, 1, 9, 10), end_at: iso(2030, 1, 11, 10), status: 'BOOKED' },
    ]);
    expect([...counts.keys()]).toEqual(['2030-01-09', '2030-01-10', '2030-01-11']);
    expect(counts.get('2030-01-10')?.booked).toBe(1);
  });

  it('is empty for no slots', () => {
    expect(countSlotsByDay([]).size).toBe(0);
  });
});

describe('lastPublishableDay', () => {
  it('is the server window past today', () => {
    const expected = new Date(2030, 0, 9 + MAX_FUTURE_DAYS);
    expect(lastPublishableDay(anchor)).toBe(dayKeyOf(expected));
  });
});

describe('dayCellState', () => {
  const holidays = new Set(['2030-01-12']);
  const today = '2030-01-09';
  const last = '2030-03-10';

  it('disables days before today and after the window', () => {
    expect(dayCellState('2030-01-08', today, last, holidays)).toBe('disabled');
    expect(dayCellState('2030-03-11', today, last, holidays)).toBe('disabled');
  });

  it('marks a holiday inside the window', () => {
    expect(dayCellState('2030-01-12', today, last, holidays)).toBe('holiday');
  });

  it('opens today and the last day', () => {
    expect(dayCellState(today, today, last, holidays)).toBe('open');
    expect(dayCellState(last, today, last, holidays)).toBe('open');
  });
});

describe('slotsOnDay', () => {
  const slot = (id: string, start: number, end: number, space?: string | null, day = 9) => ({
    id,
    start_at: iso(2030, 1, day, start),
    end_at: iso(2030, 1, day, end),
    status: 'AVAILABLE',
    space_label: space,
  });

  it('keeps only the day’s slots, ordered by space then start time', () => {
    const rows = slotsOnDay(
      [
        slot('court-b-10', 10, 11, 'Court B'),
        slot('court-a-12', 12, 13, 'Court A'),
        slot('court-a-09', 9, 10, 'Court A'),
        slot('venue', 8, 9, null),
        slot('tomorrow', 9, 10, 'Court A', 10),
      ],
      '2030-01-09',
    );
    expect(rows.map((r) => r.id)).toEqual(['venue', 'court-a-09', 'court-a-12', 'court-b-10']);
  });

  it('includes a multi-day slot on a middle day', () => {
    const long = { start_at: iso(2030, 1, 8, 10), end_at: iso(2030, 1, 10, 10), status: 'BOOKED' };
    expect(slotsOnDay([long], '2030-01-09')).toEqual([long]);
  });

  it('orders two slots with no space label by start', () => {
    const rows = slotsOnDay([slot('late', 14, 15), slot('early', 9, 10)], '2030-01-09');
    expect(rows.map((r) => r.id)).toEqual(['early', 'late']);
  });
});
