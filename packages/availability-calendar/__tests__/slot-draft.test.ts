import { describe, expect, it, vi } from 'vitest';
import {
  checkSlotDraft,
  emptyDraft,
  isDraftIncomplete,
  MAX_FUTURE_DAYS,
  minEndTime,
  minTimeOn,
  NO_SPACE,
  slotIssueMessage,
  type SlotDraft,
  type SlotIssueCode,
} from '../src/slot-draft';

const NOW = new Date(2026, 0, 15, 12, 0, 0);
const at = (h: number, min = 0) => new Date(2000, 0, 1, h, min);

/** A single-day timed draft on Jan 20, patched per case. */
function draft(overrides: Partial<SlotDraft> = {}): SlotDraft {
  return {
    ...emptyDraft(new Date(2026, 0, 20)),
    startTime: at(9),
    endTime: at(10),
    ...overrides,
  };
}

describe('emptyDraft', () => {
  it('seeds both dates from the clicked day, no times, and no space picked', () => {
    const day = new Date(2026, 0, 20);
    expect(emptyDraft(day)).toEqual({
      wholeDay: false,
      startDate: day,
      endDate: day,
      startTime: null,
      endTime: null,
      price: '',
      notes: '',
      spaceLabel: NO_SPACE,
    });
    expect(NO_SPACE).not.toBe(''); // '' is the whole venue, a real pick
  });
});

describe('checkSlotDraft', () => {
  it('returns the combined window for a valid timed draft', () => {
    expect(checkSlotDraft(draft(), NOW)).toEqual({
      start: new Date(2026, 0, 20, 9, 0, 0, 0),
      end: new Date(2026, 0, 20, 10, 0, 0, 0),
    });
  });

  it('spans days for a timed draft whose end date is later', () => {
    expect(checkSlotDraft(draft({ endDate: new Date(2026, 0, 22) }), NOW)).toEqual({
      start: new Date(2026, 0, 20, 9),
      end: new Date(2026, 0, 22, 10),
    });
  });

  it.each<[string, Partial<SlotDraft>, SlotIssueCode]>([
    ['no start date', { startDate: null }, 'pickDates'],
    ['no end date', { endDate: null }, 'pickDates'],
    ['end date before start date', { endDate: new Date(2026, 0, 19) }, 'endDateAfterStart'],
    ['no start time', { startTime: null }, 'pickSlotTimes'],
    ['no end time', { endTime: null }, 'pickSlotTimes'],
    ['the same start and end', { endTime: at(9) }, 'sameTime'],
    ['an end before the start', { endTime: at(8) }, 'endAfterStart'],
    ['a start already gone by today', { startDate: new Date(2026, 0, 15), endDate: new Date(2026, 0, 15) }, 'startInFuture'],
    ['a start past the publishing window', { startDate: new Date(2026, 5, 1), endDate: new Date(2026, 5, 1) }, 'maxAhead'],
  ])('reports %s', (_label, patch, code) => {
    expect(checkSlotDraft(draft(patch), NOW)).toBe(code);
  });

  it('books the whole date range without times when wholeDay is on', () => {
    const whole = draft({ wholeDay: true, startTime: null, endTime: null, endDate: new Date(2026, 0, 21) });
    expect(checkSlotDraft(whole, NOW)).toEqual({
      start: new Date(2026, 0, 20, 0, 0, 0, 0),
      end: new Date(2026, 0, 21, 23, 59, 59, 999),
    });
  });

  it("starts today's whole day a few minutes from now instead of rejecting the past midnight", () => {
    const today = new Date(2026, 0, 15);
    const whole = draft({ wholeDay: true, startDate: today, endDate: today });
    expect(checkSlotDraft(whole, NOW)).toEqual({
      start: new Date(2026, 0, 15, 12, 5),
      end: new Date(2026, 0, 15, 23, 59, 59, 999),
    });
  });

  it('still caps a whole-day draft at the publishing window', () => {
    const far = new Date(2026, 5, 1);
    expect(checkSlotDraft(draft({ wholeDay: true, startDate: far, endDate: far }), NOW)).toBe('maxAhead');
  });
});

describe('isDraftIncomplete', () => {
  it('is true only for the "not filled in yet" codes', () => {
    expect(isDraftIncomplete('pickDates')).toBe(true);
    expect(isDraftIncomplete('pickSlotTimes')).toBe(true);
    for (const code of ['endDateAfterStart', 'sameTime', 'endAfterStart', 'startInFuture', 'maxAhead'] as const) {
      expect(isDraftIncomplete(code)).toBe(false);
    }
  });
});

describe('minTimeOn', () => {
  it('bounds the picker at "now" only when the date is today', () => {
    expect(minTimeOn(null, NOW)).toBeUndefined();
    expect(minTimeOn(new Date(2026, 0, 20), NOW)).toBeUndefined();
    expect(minTimeOn(new Date(2026, 0, 15, 8), NOW)).toBe(NOW);
  });
});

describe('minEndTime', () => {
  it('is a minute past the start while the slot sits on one day', () => {
    expect(minEndTime(draft({ startTime: at(9, 30) }), NOW)).toEqual(at(9, 31));
  });

  it('falls back to the end date bound when the slot spans days or has no start time', () => {
    expect(minEndTime(draft({ endDate: new Date(2026, 0, 21) }), NOW)).toBeUndefined();
    const today = new Date(2026, 0, 15);
    expect(minEndTime(draft({ startTime: null, startDate: today, endDate: today }), NOW)).toBe(NOW);
  });
});

describe('slotIssueMessage', () => {
  it('turns every code into its own localization key, with the cap interpolated', () => {
    const t = vi.fn((key: string, options?: { vars?: Record<string, string | number> }) =>
      options?.vars ? `${key}:${options.vars.days}` : key,
    );
    const codes: SlotIssueCode[] = [
      'pickDates',
      'pickSlotTimes',
      'endDateAfterStart',
      'sameTime',
      'endAfterStart',
      'startInFuture',
    ];
    for (const code of codes) expect(slotIssueMessage(code, t)).toBe(`shell.availability.${code}`);
    expect(slotIssueMessage('maxAhead', t)).toBe(`shell.availability.maxAhead:${MAX_FUTURE_DAYS}`);
    expect(MAX_FUTURE_DAYS).toBe(60);
  });
});
