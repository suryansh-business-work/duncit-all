import { describe, expect, it } from 'vitest';

import {
  MERIDIEMS,
  hourChips,
  meridiemOf,
  twelveHourLabel,
  withMeridiem,
} from '../src/hour-cycle';

describe('MERIDIEMS', () => {
  it('is the two halves of the day, in clock order', () => {
    expect(MERIDIEMS).toEqual(['AM', 'PM']);
  });
});

describe('meridiemOf', () => {
  it('splits the day at noon', () => {
    expect(meridiemOf(0)).toBe('AM');
    expect(meridiemOf(11)).toBe('AM');
    expect(meridiemOf(12)).toBe('PM');
    expect(meridiemOf(23)).toBe('PM');
  });
});

describe('withMeridiem', () => {
  it('keeps the clock number and moves it to the other half', () => {
    expect(withMeridiem(9, 'PM')).toBe(21);
    expect(withMeridiem(21, 'AM')).toBe(9);
  });

  it('treats midnight and noon as the same clock number', () => {
    expect(withMeridiem(0, 'PM')).toBe(12);
    expect(withMeridiem(12, 'AM')).toBe(0);
  });

  it('is its own inverse across a round trip', () => {
    for (const hour of [0, 5, 11, 12, 17, 23]) {
      expect(withMeridiem(withMeridiem(hour, 'PM'), meridiemOf(hour))).toBe(hour);
    }
  });
});

describe('twelveHourLabel', () => {
  it('writes midnight and noon as 12 rather than 0', () => {
    expect(twelveHourLabel(0)).toBe('12');
    expect(twelveHourLabel(12)).toBe('12');
  });

  it('writes the afternoon on the clock face, not on the wire', () => {
    expect(twelveHourLabel(13)).toBe('1');
    expect(twelveHourLabel(23)).toBe('11');
    expect(twelveHourLabel(9)).toBe('9');
  });
});

describe('hourChips', () => {
  it('offers all 24 zero-padded hours on a 24-hour clock', () => {
    const chips = hourChips(false);
    expect(chips).toHaveLength(24);
    expect(chips[0]).toEqual({ hour: 0, label: '00' });
    expect(chips[9]).toEqual({ hour: 9, label: '09' });
    expect(chips[23]).toEqual({ hour: 23, label: '23' });
  });

  it('offers the morning twelve, labelled in clock order, when no half is named', () => {
    const chips = hourChips(true);
    expect(chips).toHaveLength(12);
    expect(chips[0]).toEqual({ hour: 0, label: '12' });
    expect(chips[1]).toEqual({ hour: 1, label: '1' });
    expect(chips[11]).toEqual({ hour: 11, label: '11' });
  });

  it('offers the afternoon twelve for PM, still carrying 0-23 values', () => {
    const chips = hourChips(true, 'PM');
    expect(chips).toHaveLength(12);
    expect(chips[0]).toEqual({ hour: 12, label: '12' });
    expect(chips[1]).toEqual({ hour: 13, label: '1' });
    expect(chips[11]).toEqual({ hour: 23, label: '11' });
  });

  it('names the same 0-23 hours on either clock — only the writing changes', () => {
    const twentyFour = hourChips(false).map((chip) => chip.hour);
    const twelve = [...hourChips(true, 'AM'), ...hourChips(true, 'PM')].map((chip) => chip.hour);
    expect(twelve).toEqual(twentyFour);
  });
});
