import { describe, expect, it } from 'vitest';

import {
  formatIsoDay,
  isIsoDay,
  parseInPattern,
  parseIsoDay,
  parseLocalDateTimeInput,
  patternPlaceholder,
  toIsoDay,
  toLocalDateTimeInput,
} from '../src/day-input';

describe('patternPlaceholder', () => {
  it('reads a pattern back as the letters a person would type', () => {
    expect(patternPlaceholder('dd MMM yyyy')).toBe('DD MMM YYYY');
    expect(patternPlaceholder('MM/dd/yy')).toBe('MM/DD/YY');
    expect(patternPlaceholder('hh:mm a')).toBe('hh:mm AM');
  });

  it('shows a quoted literal without its quotes', () => {
    expect(patternPlaceholder("dd 'of' MMMM")).toBe('DD of MMMM');
  });

  it('leaves an unknown token as written rather than dropping it', () => {
    expect(patternPlaceholder('dd Q yyyy')).toContain('Q');
  });

  it('leaves the separators alone', () => {
    expect(patternPlaceholder('yyyy-MM-dd')).toBe('YYYY-MM-DD');
  });
});

describe('parseInPattern', () => {
  it('reads a date typed in the admin’s configured pattern', () => {
    const parsed = parseInPattern('05 Jan 2000', 'dd MMM yyyy');

    expect(parsed?.getFullYear()).toBe(2000);
    expect(parsed?.getMonth()).toBe(0);
    expect(parsed?.getDate()).toBe(5);
  });

  it('accepts the month written in any case', () => {
    expect(parseInPattern('05 jan 2000', 'dd MMM yyyy')).not.toBeNull();
  });

  it('refuses text whose echo differs from what was typed, e.g. a 1-digit day for dd', () => {
    // date-fns reads '5' for `dd` and would hand back a valid date; only the
    // re-format comparison notices the shape was not the configured one.
    expect(parseInPattern('5 Jan 2000', 'dd MMM yyyy')).toBeNull();
    expect(parseInPattern('05 Jan 2000', 'd MMM yyyy')).toBeNull();
  });

  it('refuses trailing junk, which date-fns alone would silently keep', () => {
    expect(parseInPattern('05 Jan 2000 and then some', 'dd MMM yyyy')).toBeNull();
  });

  it('refuses a partial or impossible date', () => {
    expect(parseInPattern('05 Jan', 'dd MMM yyyy')).toBeNull();
    expect(parseInPattern('32 Jan 2000', 'dd MMM yyyy')).toBeNull();
  });

  it('refuses empty or whitespace-only text', () => {
    expect(parseInPattern('', 'dd MMM yyyy')).toBeNull();
    expect(parseInPattern('   ', 'dd MMM yyyy')).toBeNull();
  });

  it('trims what was typed before reading it', () => {
    expect(parseInPattern('  05 Jan 2000  ', 'dd MMM yyyy')).not.toBeNull();
  });

  it('reads the day as the LOCAL calendar day, never shifted by a zone', () => {
    expect(toIsoDay(parseInPattern('05 Jan 2000', 'dd MMM yyyy') as Date)).toBe('2000-01-05');
  });

  it('answers null rather than throwing for a pattern date-fns rejects', () => {
    // date-fns throws on YYYY on purpose — it is the classic mix-up with yyyy.
    expect(parseInPattern('2000', 'YYYY')).toBeNull();
  });
});

describe('toIsoDay', () => {
  it('writes the local calendar day, not the UTC one', () => {
    expect(toIsoDay(new Date(2000, 0, 5))).toBe('2000-01-05');
  });

  it('zero-pads the month and day so the strings sort', () => {
    expect(toIsoDay(new Date(2026, 8, 9))).toBe('2026-09-09');
  });
});

describe('isIsoDay', () => {
  it('accepts a bare calendar day', () => {
    expect(isIsoDay('2000-01-05')).toBe(true);
  });

  it.each(['2000-1-5', '2000-01-05T00:00:00Z', '', 'yesterday', '2000-01-05 '])('rejects %j', (value) => {
    expect(isIsoDay(value)).toBe(false);
  });
});

describe('parseIsoDay', () => {
  it('gives back the day that went in, for a viewer in any zone', () => {
    const date = parseIsoDay('2000-01-05') as Date;

    expect(date.getFullYear()).toBe(2000);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(5);
  });

  it('round-trips with toIsoDay', () => {
    expect(toIsoDay(parseIsoDay('2026-02-28') as Date)).toBe('2026-02-28');
  });

  it('returns null for anything that is not a bare calendar day', () => {
    expect(parseIsoDay('2000-01-05T10:00:00Z')).toBeNull();
    expect(parseIsoDay('')).toBeNull();
  });
});

describe('formatIsoDay', () => {
  it('renders a calendar day in the admin’s pattern with no zone conversion', () => {
    expect(formatIsoDay('2000-01-05', 'dd MMM yyyy')).toBe('05 Jan 2000');
  });

  it('renders nothing for a value that is not a calendar day', () => {
    expect(formatIsoDay('nonsense', 'dd MMM yyyy')).toBe('');
  });

  it('renders nothing rather than throwing on a pattern date-fns rejects', () => {
    expect(formatIsoDay('2000-01-05', 'YYYY')).toBe('');
  });
});

describe('toLocalDateTimeInput', () => {
  it('writes the browser’s own wall clock, which is what the input speaks', () => {
    expect(toLocalDateTimeInput(new Date(2026, 7, 30, 9, 5))).toBe('2026-08-30T09:05');
  });

  it('accepts an ISO string as well as a Date', () => {
    const iso = new Date(2026, 7, 30, 9, 5).toISOString();

    expect(toLocalDateTimeInput(iso)).toBe('2026-08-30T09:05');
  });

  it.each([[null], [undefined], [''], ['not-a-date']])('renders nothing for %j', (input) => {
    expect(toLocalDateTimeInput(input)).toBe('');
  });
});

describe('parseLocalDateTimeInput', () => {
  it('reads the input’s wall clock back as a local instant', () => {
    const date = parseLocalDateTimeInput('2026-08-30T09:05') as Date;

    expect(date.getFullYear()).toBe(2026);
    expect(date.getHours()).toBe(9);
    expect(date.getMinutes()).toBe(5);
  });

  it('round-trips with toLocalDateTimeInput, which is what a "has this changed?" check relies on', () => {
    const value = '2026-08-30T09:05';

    expect(toLocalDateTimeInput(parseLocalDateTimeInput(value) as Date)).toBe(value);
  });

  it.each(['2026-08-30', '2026-08-30T09:05:00', '', 'nonsense'])('returns null for %j', (value) => {
    expect(parseLocalDateTimeInput(value)).toBeNull();
  });
});
