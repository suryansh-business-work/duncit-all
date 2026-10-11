/**
 * The statement period presets, which three surfaces share.
 *
 * The rule worth pinning is WHERE midnight is: the Indian financial year turns
 * over at 00:00 on 1 April in the business time zone. One minute either side of
 * that instant has to land in different financial years, and the same instant
 * read in another zone has to land in the old one.
 */
import { describe, expect, it } from 'vitest';
import {
  STATEMENT_FORMATS,
  STATEMENT_MAX_DAYS,
  STATEMENT_PRESETS,
  STATEMENT_PRESET_LABEL_KEYS,
  STATEMENT_RANGE_ERROR_KEYS,
  financialYearStartYear,
  resolveStatementRange,
  statementPresetRange,
  statementRangeDays,
  statementRangeError,
  zonedToday,
  type StatementPreset,
} from '../src/statement-period';

const KOLKATA = 'Asia/Kolkata';

/** A wall-clock moment in Kolkata (UTC+05:30, no daylight saving) as an instant. */
const kolkata = (day: string, time = '12:00') => new Date(`${day}T${time}:00+05:30`);

const range = (preset: StatementPreset, now: Date, zone = KOLKATA) =>
  statementPresetRange(preset, now, zone);

describe('the vocabulary', () => {
  it('lists the presets in the order every picker shows them, custom last', () => {
    expect(STATEMENT_PRESETS).toEqual([
      'THIS_MONTH',
      'LAST_MONTH',
      'LAST_3_MONTHS',
      'LAST_6_MONTHS',
      'THIS_FINANCIAL_YEAR',
      'LAST_FINANCIAL_YEAR',
      'CUSTOM',
    ]);
  });

  it('offers the two formats the server enum has', () => {
    expect(STATEMENT_FORMATS).toEqual(['PDF', 'CSV']);
  });

  it('caps a statement at one leap financial year', () => {
    expect(STATEMENT_MAX_DAYS).toBe(366);
  });

  it('has a distinct withdraw.statement key for every preset', () => {
    const keys = STATEMENT_PRESETS.map((preset) => STATEMENT_PRESET_LABEL_KEYS[preset]);
    expect(new Set(keys).size).toBe(STATEMENT_PRESETS.length);
    for (const key of keys) expect(key.startsWith('withdraw.statement.preset')).toBe(true);
  });

  it('has a distinct withdraw.statement key for every refusal', () => {
    expect(STATEMENT_RANGE_ERROR_KEYS).toEqual({
      MISSING: 'withdraw.statement.errorMissing',
      INVALID: 'withdraw.statement.errorInvalid',
      ORDER: 'withdraw.statement.errorOrder',
      FUTURE: 'withdraw.statement.errorFuture',
      TOO_LONG: 'withdraw.statement.errorTooLong',
    });
  });
});

describe('zonedToday', () => {
  it('reads the calendar day in the zone it is given, not in UTC', () => {
    // 20:00 UTC on 10 Oct is already 01:30 on 11 Oct in Kolkata.
    const now = new Date('2026-10-10T20:00:00Z');
    expect(zonedToday(now, KOLKATA)).toBe('2026-10-11');
    expect(zonedToday(now, 'UTC')).toBe('2026-10-10');
  });

  it('reads the earlier day for a zone behind UTC', () => {
    expect(zonedToday(new Date('2026-10-11T02:00:00Z'), 'America/New_York')).toBe('2026-10-10');
  });

  it('pads single-digit months and days', () => {
    expect(zonedToday(kolkata('2026-04-01'), KOLKATA)).toBe('2026-04-01');
  });

  it('falls back to the UTC day for a zone Intl does not know', () => {
    expect(zonedToday(new Date('2026-10-10T20:00:00Z'), 'Not/A_Zone')).toBe('2026-10-10');
  });
});

describe('financialYearStartYear', () => {
  it('puts January to March in the year before', () => {
    expect(financialYearStartYear('2026-01-01')).toBe(2025);
    expect(financialYearStartYear('2026-03-31')).toBe(2025);
  });

  it('opens the new year on 1 April', () => {
    expect(financialYearStartYear('2026-04-01')).toBe(2026);
    expect(financialYearStartYear('2026-12-31')).toBe(2026);
  });
});

describe('statementPresetRange — the financial year boundary', () => {
  it('is still the old financial year at 23:59 on 31 March, business time', () => {
    const now = kolkata('2026-03-31', '23:59');
    expect(range('THIS_FINANCIAL_YEAR', now)).toEqual({ from: '2025-04-01', to: '2026-03-31' });
    expect(range('LAST_FINANCIAL_YEAR', now)).toEqual({ from: '2024-04-01', to: '2025-03-31' });
  });

  it('is the new financial year at 00:00 on 1 April, business time', () => {
    const now = kolkata('2026-04-01', '00:00');
    expect(range('THIS_FINANCIAL_YEAR', now)).toEqual({ from: '2026-04-01', to: '2026-04-01' });
    expect(range('LAST_FINANCIAL_YEAR', now)).toEqual({ from: '2025-04-01', to: '2026-03-31' });
  });

  it('follows the business zone, not the instant: the same moment is still March in UTC', () => {
    const now = kolkata('2026-04-01', '00:00'); // 18:30 UTC on 31 March
    expect(range('THIS_FINANCIAL_YEAR', now, 'UTC')).toEqual({
      from: '2025-04-01',
      to: '2026-03-31',
    });
  });

  it('runs the current financial year only up to today', () => {
    expect(range('THIS_FINANCIAL_YEAR', kolkata('2026-01-10'))).toEqual({
      from: '2025-04-01',
      to: '2026-01-10',
    });
  });

  it('covers 366 days when the last financial year held a 29 February', () => {
    const last = range('LAST_FINANCIAL_YEAR', kolkata('2024-06-01'));
    expect(last).toEqual({ from: '2023-04-01', to: '2024-03-31' });
    expect(statementRangeDays(last ?? { from: '', to: '' })).toBe(366);
  });

  it('covers 365 days for an ordinary financial year', () => {
    const last = range('LAST_FINANCIAL_YEAR', kolkata('2026-06-01'));
    expect(statementRangeDays(last ?? { from: '', to: '' })).toBe(365);
  });
});

describe('statementPresetRange — months', () => {
  it('runs this month from the 1st to today', () => {
    expect(range('THIS_MONTH', kolkata('2026-10-11'))).toEqual({
      from: '2026-10-01',
      to: '2026-10-11',
    });
  });

  it('is a single day on the 1st', () => {
    expect(range('THIS_MONTH', kolkata('2026-10-01'))).toEqual({
      from: '2026-10-01',
      to: '2026-10-01',
    });
  });

  it('covers the whole previous month', () => {
    expect(range('LAST_MONTH', kolkata('2026-10-11'))).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
    });
  });

  it('steps back over the new year from January', () => {
    expect(range('LAST_MONTH', kolkata('2026-01-10'))).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
  });

  it('ends last month on 29 February in a leap year and 28 otherwise', () => {
    expect(range('LAST_MONTH', kolkata('2024-03-15'))).toEqual({
      from: '2024-02-01',
      to: '2024-02-29',
    });
    expect(range('LAST_MONTH', kolkata('2025-03-15'))).toEqual({
      from: '2025-02-01',
      to: '2025-02-28',
    });
  });

  it('rolls three whole months back from today', () => {
    expect(range('LAST_3_MONTHS', kolkata('2026-10-11'))).toEqual({
      from: '2026-07-12',
      to: '2026-10-11',
    });
  });

  it('clamps to the end of a shorter month instead of spilling into the next', () => {
    // Three months before 31 May is the last day of February, leap or not.
    expect(range('LAST_3_MONTHS', kolkata('2024-05-31'))).toEqual({
      from: '2024-03-01',
      to: '2024-05-31',
    });
    expect(range('LAST_3_MONTHS', kolkata('2025-05-31'))).toEqual({
      from: '2025-03-01',
      to: '2025-05-31',
    });
  });

  it('rolls six months back across a year boundary', () => {
    expect(range('LAST_6_MONTHS', kolkata('2026-01-15'))).toEqual({
      from: '2025-07-16',
      to: '2026-01-15',
    });
  });

  it('has no range of its own for a custom period', () => {
    expect(range('CUSTOM', kolkata('2026-10-11'))).toBeNull();
  });
});

describe('every preset is a period the server will accept', () => {
  const moments = [
    kolkata('2024-02-29'),
    kolkata('2024-03-31', '23:59'),
    kolkata('2024-04-01', '00:00'),
    kolkata('2025-12-31'),
    kolkata('2026-01-01'),
    kolkata('2026-10-11'),
  ];
  const presets = STATEMENT_PRESETS.filter((preset) => preset !== 'CUSTOM');

  it.each(presets)('%s passes its own validation at every moment', (preset) => {
    for (const now of moments) {
      const resolved = statementPresetRange(preset, now, KOLKATA);
      expect(resolved, now.toISOString()).not.toBeNull();
      expect(statementRangeError(resolved ?? { from: '', to: '' }, now, KOLKATA)).toBeNull();
    }
  });
});

describe('statementRangeDays', () => {
  it('counts both ends', () => {
    expect(statementRangeDays({ from: '2026-10-11', to: '2026-10-11' })).toBe(1);
    expect(statementRangeDays({ from: '2026-04-01', to: '2026-06-30' })).toBe(91);
  });
});

describe('statementRangeError — a custom range', () => {
  const now = kolkata('2026-10-11');
  const check = (from: string, to: string) => statementRangeError({ from, to }, now, KOLKATA);

  it('accepts a range inside the limits', () => {
    expect(check('2026-04-01', '2026-06-30')).toBeNull();
  });

  it('accepts a single day, and a range ending today', () => {
    expect(check('2026-10-11', '2026-10-11')).toBeNull();
  });

  it('asks for both days', () => {
    expect(check('', '2026-06-30')).toBe('MISSING');
    expect(check('2026-04-01', '')).toBe('MISSING');
  });

  it('refuses text that is not a date', () => {
    expect(check('not-a-date', '2026-06-30')).toBe('INVALID');
    expect(check('2026-04-01', '30/06/2026')).toBe('INVALID');
  });

  it('refuses a day the calendar does not have', () => {
    expect(check('2026-02-30', '2026-06-30')).toBe('INVALID');
    expect(check('2025-02-29', '2025-06-30')).toBe('INVALID');
  });

  it('accepts 29 February in a leap year', () => {
    expect(check('2024-02-29', '2024-03-31')).toBeNull();
  });

  it('refuses a range that is back to front', () => {
    expect(check('2026-06-30', '2026-04-01')).toBe('ORDER');
  });

  it('refuses a range reaching past today in the business zone', () => {
    expect(check('2026-10-01', '2026-10-12')).toBe('FUTURE');
  });

  it('judges the future in the business zone, not in UTC', () => {
    // 20:00 UTC on 10 Oct is 11 Oct in Kolkata: the 11th is today there.
    const late = new Date('2026-10-10T20:00:00Z');
    const eleventh = { from: '2026-10-11', to: '2026-10-11' };
    expect(statementRangeError(eleventh, late, KOLKATA)).toBeNull();
    expect(statementRangeError(eleventh, late, 'UTC')).toBe('FUTURE');
  });

  it('allows exactly 366 days and refuses 367', () => {
    expect(statementRangeDays({ from: '2025-10-10', to: '2026-10-10' })).toBe(366);
    expect(check('2025-10-10', '2026-10-10')).toBeNull();
    expect(check('2025-10-09', '2026-10-10')).toBe('TOO_LONG');
  });
});

describe('resolveStatementRange', () => {
  const now = kolkata('2026-10-11');

  it('uses the preset own days and ignores whatever the custom boxes hold', () => {
    expect(
      resolveStatementRange({ preset: 'LAST_MONTH', from: '2020-01-01', to: '2020-01-31' }, now, KOLKATA),
    ).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });

  it('passes a custom range through exactly as picked', () => {
    expect(
      resolveStatementRange({ preset: 'CUSTOM', from: '2026-04-01', to: '2026-06-30' }, now, KOLKATA),
    ).toEqual({ from: '2026-04-01', to: '2026-06-30' });
  });
});
