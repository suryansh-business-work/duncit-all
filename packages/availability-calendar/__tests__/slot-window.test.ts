import { describe, expect, it } from 'vitest';
import { isSlotConflictError } from '../src/conflict';
import { slotCoveredDays, slotCoversDay, wholeDayWindow } from '../src/slot-window';

const NOW = new Date(2026, 0, 15, 12, 0, 0);
const iso = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m, d, h, min).toISOString();

describe('wholeDayWindow', () => {
  it('runs from midnight to the last millisecond of the end date for a future range', () => {
    expect(wholeDayWindow(new Date(2026, 0, 20, 15), new Date(2026, 0, 21, 3), NOW)).toEqual({
      start: new Date(2026, 0, 20, 0, 0, 0, 0),
      end: new Date(2026, 0, 21, 23, 59, 59, 999),
    });
  });

  it('starts five minutes from now when the range begins today (or earlier)', () => {
    expect(wholeDayWindow(new Date(2026, 0, 15), new Date(2026, 0, 15), NOW).start).toEqual(
      new Date(2026, 0, 15, 12, 5),
    );
    expect(wholeDayWindow(new Date(2026, 0, 10), new Date(2026, 0, 16), NOW)).toEqual({
      start: new Date(2026, 0, 15, 12, 5),
      end: new Date(2026, 0, 16, 23, 59, 59, 999),
    });
  });

  it('reads the real clock when no "now" is passed', () => {
    const { start } = wholeDayWindow(new Date(2000, 0, 1), new Date(2000, 0, 1));
    expect(start.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('slotCoversDay', () => {
  const slot = { start_at: iso(2026, 0, 20, 10), end_at: iso(2026, 0, 22, 18) };

  it('is true for every day the span touches, including a later day of a multi-day slot', () => {
    expect(slotCoversDay(slot, new Date(2026, 0, 20, 23))).toBe(true);
    expect(slotCoversDay(slot, new Date(2026, 0, 21))).toBe(true);
    expect(slotCoversDay(slot, new Date(2026, 0, 22, 1))).toBe(true);
  });

  it('is false outside the span', () => {
    expect(slotCoversDay(slot, new Date(2026, 0, 19))).toBe(false);
    expect(slotCoversDay(slot, new Date(2026, 0, 23))).toBe(false);
  });

  it('does not claim the next day when the slot ends exactly at midnight', () => {
    const toMidnight = { start_at: iso(2026, 0, 20, 22), end_at: iso(2026, 0, 21, 0, 0) };
    expect(slotCoversDay(toMidnight, new Date(2026, 0, 20))).toBe(true);
    expect(slotCoversDay(toMidnight, new Date(2026, 0, 21))).toBe(false);
  });
});

describe('slotCoveredDays', () => {
  it('lists a single-day slot as its one day', () => {
    expect(slotCoveredDays({ start_at: iso(2026, 0, 20, 9), end_at: iso(2026, 0, 20, 10) })).toEqual([
      new Date(2026, 0, 20),
    ]);
  });

  it('lists every calendar day of a multi-day slot', () => {
    expect(slotCoveredDays({ start_at: iso(2026, 0, 20, 10), end_at: iso(2026, 0, 22, 18) })).toEqual([
      new Date(2026, 0, 20),
      new Date(2026, 0, 21),
      new Date(2026, 0, 22),
    ]);
  });

  it('treats the end as exclusive, so a midnight end adds no day', () => {
    expect(slotCoveredDays({ start_at: iso(2026, 0, 20, 22), end_at: iso(2026, 0, 21, 0, 0) })).toEqual([
      new Date(2026, 0, 20),
    ]);
  });

  it('still lists the start day when the end is not after the start', () => {
    expect(slotCoveredDays({ start_at: iso(2026, 0, 20, 10), end_at: iso(2026, 0, 20, 10) })).toEqual([
      new Date(2026, 0, 20),
    ]);
  });
});

describe('isSlotConflictError', () => {
  it('recognises only a GraphQL error carrying the CONFLICT code', () => {
    expect(isSlotConflictError({ graphQLErrors: [{ extensions: { code: 'CONFLICT' } }] })).toBe(true);
    expect(
      isSlotConflictError({ graphQLErrors: [{ extensions: { code: 'FORBIDDEN' } }, { extensions: { code: 'CONFLICT' } }] }),
    ).toBe(true);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a plain Error', new Error('boom')],
    ['a string', 'boom'],
    ['an empty error list', { graphQLErrors: [] }],
    ['another code', { graphQLErrors: [{ extensions: { code: 'BAD_USER_INPUT' } }] }],
    ['an error without extensions', { graphQLErrors: [{}] }],
  ])('is false for %s', (_label, error) => {
    expect(isSlotConflictError(error)).toBe(false);
  });
});
