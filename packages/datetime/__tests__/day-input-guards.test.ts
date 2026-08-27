import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseIsoDay, parseLocalDateTimeInput } from '../src/day-input';

/**
 * The NaN guards after `new Date(year, month, …)` cannot fire with the real
 * constructor — four-digit years never overflow the Date range — so the only
 * way to prove they answer null (rather than leaking an Invalid Date to a
 * caller) is a Date whose parts-construction comes back invalid.
 */
const RealDate = Date;

class InvalidPartsDate extends RealDate {
  constructor(...parts: number[]) {
    if (parts.length >= 3) {
      // Parts-construction (year, month, day, …) yields an Invalid Date.
      super(Number.NaN);
    } else {
      super();
    }
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Invalid Date guards', () => {
  it('parseIsoDay answers null when the constructed date is invalid', () => {
    vi.stubGlobal('Date', InvalidPartsDate);
    expect(parseIsoDay('2026-01-05')).toBeNull();
  });

  it('parseLocalDateTimeInput answers null when the constructed date is invalid', () => {
    vi.stubGlobal('Date', InvalidPartsDate);
    expect(parseLocalDateTimeInput('2026-01-05T18:30')).toBeNull();
  });
});
