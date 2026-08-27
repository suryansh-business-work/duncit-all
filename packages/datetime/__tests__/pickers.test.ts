import { describe, expect, it } from 'vitest';

import { FALLBACK_DATE_FORMAT, FALLBACK_TIME_FORMAT } from '../src/format';
import {
  formatTokens,
  isPickerSafeFormat,
  muiDateFormats,
  unsupportedPickerTokens,
  usesTwelveHourClock,
} from '../src/pickers';

describe('formatTokens', () => {
  it('lists the date-fns tokens in a pattern, in order', () => {
    expect(formatTokens('dd MMM yyyy')).toEqual(['dd', 'MMM', 'yyyy']);
    expect(formatTokens('hh:mm a')).toEqual(['hh', 'mm', 'a']);
  });

  it('skips quoted literal text — its letters are not tokens', () => {
    expect(formatTokens("dd 'of' MMMM")).toEqual(['dd', 'MMMM']);
  });

  it('answers empty for a pattern of pure separators', () => {
    expect(formatTokens('--/ :')).toEqual([]);
  });
});

describe('unsupportedPickerTokens', () => {
  it('answers empty for a pattern every picker field can edit', () => {
    expect(unsupportedPickerTokens('dd MMM yyyy')).toEqual([]);
    expect(unsupportedPickerTokens('HH:mm')).toEqual([]);
  });

  it('names the tokens a MUI X field would throw on', () => {
    expect(unsupportedPickerTokens('PPP')).toEqual(['PPP']);
    expect(unsupportedPickerTokens('dd MMM yyyy w')).toEqual(['w']);
  });
});

describe('isPickerSafeFormat', () => {
  it('accepts the shared fallbacks — they must never degrade themselves', () => {
    expect(isPickerSafeFormat(FALLBACK_DATE_FORMAT)).toBe(true);
    expect(isPickerSafeFormat(FALLBACK_TIME_FORMAT)).toBe(true);
  });

  it('rejects a pattern carrying an unsupported token', () => {
    expect(isPickerSafeFormat('QQQ yyyy')).toBe(false);
  });
});

describe('usesTwelveHourClock', () => {
  it('is true for h/hh hours with a meridiem', () => {
    expect(usesTwelveHourClock('hh:mm a')).toBe(true);
    expect(usesTwelveHourClock('h:mm aa')).toBe(true);
  });

  it('is false for a 24-hour pattern', () => {
    expect(usesTwelveHourClock('HH:mm')).toBe(false);
  });

  it('reads the shared fallback (12-hour) when no pattern is configured yet', () => {
    expect(usesTwelveHourClock(null)).toBe(true);
    expect(usesTwelveHourClock(undefined)).toBe(true);
    expect(usesTwelveHourClock('')).toBe(true);
  });
});

describe('muiDateFormats', () => {
  it('hands the admin patterns to every date- and time-bearing key', () => {
    const formats = muiDateFormats('dd/MM/yyyy', 'HH:mm');
    expect(formats.keyboardDate).toBe('dd/MM/yyyy');
    expect(formats.fullDate).toBe('dd/MM/yyyy');
    expect(formats.fullDateWithWeekday).toBe('dd/MM/yyyy');
    expect(formats.normalDate).toBe('dd/MM/yyyy');
    expect(formats.normalDateWithWeekday).toBe('dd/MM/yyyy');
    expect(formats.shortDate).toBe('dd/MM/yyyy');
    expect(formats.fullTime).toBe('HH:mm');
    // The explicit 12h/24h variants both follow the admin, so a component that
    // hardcodes `ampm` cannot opt out of the configured clock.
    expect(formats.fullTime12h).toBe('HH:mm');
    expect(formats.fullTime24h).toBe('HH:mm');
    expect(formats.keyboardDateTime).toBe('dd/MM/yyyy HH:mm');
    expect(formats.keyboardDateTime12h).toBe('dd/MM/yyyy HH:mm');
    expect(formats.keyboardDateTime24h).toBe('dd/MM/yyyy HH:mm');
    expect(formats.fullDateTime).toBe('dd/MM/yyyy HH:mm');
    expect(formats.fullDateTime12h).toBe('dd/MM/yyyy HH:mm');
    expect(formats.fullDateTime24h).toBe('dd/MM/yyyy HH:mm');
  });

  it('falls back when no pattern is configured yet', () => {
    const formats = muiDateFormats(null, undefined);
    expect(formats.keyboardDate).toBe(FALLBACK_DATE_FORMAT);
    expect(formats.fullTime).toBe(FALLBACK_TIME_FORMAT);
    expect(formats.fullDateTime).toBe(`${FALLBACK_DATE_FORMAT} ${FALLBACK_TIME_FORMAT}`);
  });

  it('degrades a pattern a picker would throw on to the fallback — never the page', () => {
    const formats = muiDateFormats('PPP', 'X');
    expect(formats.keyboardDate).toBe(FALLBACK_DATE_FORMAT);
    expect(formats.fullTime).toBe(FALLBACK_TIME_FORMAT);
  });

  it('degrades each half independently', () => {
    const formats = muiDateFormats('PPP', 'HH:mm');
    expect(formats.keyboardDate).toBe(FALLBACK_DATE_FORMAT);
    expect(formats.fullTime).toBe('HH:mm');
    expect(formats.fullDateTime).toBe(`${FALLBACK_DATE_FORMAT} HH:mm`);
  });
});
