/**
 * The period a wallet account statement covers — ONE definition of the presets
 * ("This month", "Last financial year", …) for the partner console, mWeb and
 * the native app, so the same tap asks the server for the same days everywhere.
 *
 * Framework-free and dependency-free: the calendar "today" is read through
 * `Intl` in the BUSINESS time zone (Admin > Settings), never the device's. A
 * partner travelling abroad still gets the Indian financial year, 1 April to 31
 * March, turning over at Kolkata midnight.
 *
 * A period is two calendar days, both inclusive, as `yyyy-MM-dd` strings — the
 * exact shape `WalletStatementInput` takes. The server reads those days in its
 * own app time zone and re-validates every rule below; this module exists so
 * the form can refuse a bad range before the request is made, and so a preset
 * means the same thing on all three surfaces.
 */

export const STATEMENT_PRESETS = [
  'THIS_MONTH',
  'LAST_MONTH',
  'LAST_3_MONTHS',
  'LAST_6_MONTHS',
  'THIS_FINANCIAL_YEAR',
  'LAST_FINANCIAL_YEAR',
  'CUSTOM',
] as const;

export type StatementPreset = (typeof STATEMENT_PRESETS)[number];

/** The file formats a statement downloads as; the values are the server enum's members. */
export const STATEMENT_FORMATS = ['PDF', 'CSV'] as const;

export type StatementFormat = (typeof STATEMENT_FORMATS)[number];

/** A financial year can hold 366 days; the server refuses anything longer. */
export const STATEMENT_MAX_DAYS = 366;

/** The month an Indian financial year opens in (1 April). */
const FINANCIAL_YEAR_FIRST_MONTH = 4;

export interface StatementRange {
  /** First day, inclusive, `yyyy-MM-dd`. */
  from: string;
  /** Last day, inclusive, `yyyy-MM-dd`. */
  to: string;
}

export type StatementRangeError = 'MISSING' | 'INVALID' | 'ORDER' | 'FUTURE' | 'TOO_LONG';

/**
 * Translation key per preset. Written out in full, never composed, because
 * `verify-translation-keys.mjs` greps source for the literal string.
 */
export const STATEMENT_PRESET_LABEL_KEYS: Record<StatementPreset, string> = {
  THIS_MONTH: 'withdraw.statement.presetThisMonth',
  LAST_MONTH: 'withdraw.statement.presetLastMonth',
  LAST_3_MONTHS: 'withdraw.statement.presetLast3Months',
  LAST_6_MONTHS: 'withdraw.statement.presetLast6Months',
  THIS_FINANCIAL_YEAR: 'withdraw.statement.presetThisFinancialYear',
  LAST_FINANCIAL_YEAR: 'withdraw.statement.presetLastFinancialYear',
  CUSTOM: 'withdraw.statement.presetCustom',
};

/** Translation key per refusal, for the same reason. */
export const STATEMENT_RANGE_ERROR_KEYS: Record<StatementRangeError, string> = {
  MISSING: 'withdraw.statement.errorMissing',
  INVALID: 'withdraw.statement.errorInvalid',
  ORDER: 'withdraw.statement.errorOrder',
  FUTURE: 'withdraw.statement.errorFuture',
  TOO_LONG: 'withdraw.statement.errorTooLong',
};

const DAY_MS = 86_400_000;

/** A calendar day built from its parts; an overflowing month or day rolls the way a calendar does. */
const dayKey = (year: number, month: number, day: number): string =>
  new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);

/** The numbers in a `yyyy-MM-dd` key, read by position. */
const partsOf = (key: string) => ({
  year: Number(key.slice(0, 4)),
  month: Number(key.slice(5, 7)),
  day: Number(key.slice(8, 10)),
});

const dayMs = (key: string): number => new Date(`${key}T00:00:00Z`).getTime();

const dayAfter = (key: string): string => new Date(dayMs(key) + DAY_MS).toISOString().slice(0, 10);

/**
 * Today's calendar day in `timeZone`, as `yyyy-MM-dd`.
 *
 * A zone `Intl` does not know (the admin's box is free text) falls back to the
 * UTC day rather than throwing inside a dialog.
 */
export function zonedToday(now: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const part = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${part.year}-${part.month}-${part.day}`;
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/**
 * The calendar year a day's Indian financial year STARTS in: 31 March 2026
 * belongs to FY 2025-26 (→ 2025), 1 April 2026 opens FY 2026-27 (→ 2026).
 */
export function financialYearStartYear(day: string): number {
  const { year, month } = partsOf(day);
  return month >= FINANCIAL_YEAR_FIRST_MONTH ? year : year - 1;
}

/**
 * The same day-of-month `months` earlier, clamped to the length of the month it
 * lands in — three months before 31 May is 28 (or 29) February, not 3 March.
 */
function monthsBefore(day: string, months: number): string {
  const { year, month, day: dayOfMonth } = partsOf(day);
  const lastOfTarget = new Date(Date.UTC(year, month - months, 0)).getUTCDate();
  return dayKey(year, month - months, Math.min(dayOfMonth, lastOfTarget));
}

/** A rolling window of whole months ending today: 12 July – 11 October for three months on 11 October. */
const rollingMonths = (today: string, months: number): StatementRange => ({
  from: dayAfter(monthsBefore(today, months)),
  to: today,
});

const PRESET_RANGE: Record<Exclude<StatementPreset, 'CUSTOM'>, (today: string) => StatementRange> = {
  THIS_MONTH: (today) => {
    const { year, month } = partsOf(today);
    return { from: dayKey(year, month, 1), to: today };
  },
  LAST_MONTH: (today) => {
    const { year, month } = partsOf(today);
    return { from: dayKey(year, month - 1, 1), to: dayKey(year, month, 0) };
  },
  LAST_3_MONTHS: (today) => rollingMonths(today, 3),
  LAST_6_MONTHS: (today) => rollingMonths(today, 6),
  // Up to today, not to 31 March: a statement never reaches into the future.
  THIS_FINANCIAL_YEAR: (today) => ({
    from: dayKey(financialYearStartYear(today), FINANCIAL_YEAR_FIRST_MONTH, 1),
    to: today,
  }),
  LAST_FINANCIAL_YEAR: (today) => {
    const start = financialYearStartYear(today);
    return {
      from: dayKey(start - 1, FINANCIAL_YEAR_FIRST_MONTH, 1),
      to: dayKey(start, FINANCIAL_YEAR_FIRST_MONTH, 0),
    };
  },
};

/**
 * The days a preset covers at `now`, in `timeZone`. Null for CUSTOM — that
 * range is whatever the reader picks.
 */
export function statementPresetRange(
  preset: StatementPreset,
  now: Date,
  timeZone: string,
): StatementRange | null {
  if (preset === 'CUSTOM') return null;
  return PRESET_RANGE[preset](zonedToday(now, timeZone));
}

/** True for a real `yyyy-MM-dd` calendar day — '2026-02-30' and '1/4/26' are not. */
function isRealDay(key: string): boolean {
  const date = new Date(`${key}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === key;
}

/** How many calendar days a range covers, both ends included. */
export function statementRangeDays(range: Readonly<StatementRange>): number {
  return Math.round((dayMs(range.to) - dayMs(range.from)) / DAY_MS) + 1;
}

/**
 * Why a range cannot be a statement period, or null when it can. The order is
 * the order a reader fixes things in: fill both days, make them real, put them
 * the right way round, keep them out of the future, then shorten the span.
 */
export function statementRangeError(
  range: Readonly<StatementRange>,
  now: Date,
  timeZone: string,
): StatementRangeError | null {
  if (!range.from || !range.to) return 'MISSING';
  if (!isRealDay(range.from) || !isRealDay(range.to)) return 'INVALID';
  if (range.from > range.to) return 'ORDER';
  if (range.to > zonedToday(now, timeZone)) return 'FUTURE';
  if (statementRangeDays(range) > STATEMENT_MAX_DAYS) return 'TOO_LONG';
  return null;
}

/** What the statement form holds: a preset, and the two days used when it is CUSTOM. */
export interface StatementPeriodChoice {
  preset: StatementPreset;
  from: string;
  to: string;
}

/**
 * The range a choice asks for: the preset's own days, or the two custom days
 * exactly as picked (validate those with {@link statementRangeError}).
 */
export function resolveStatementRange(
  choice: Readonly<StatementPeriodChoice>,
  now: Date,
  timeZone: string,
): StatementRange {
  return statementPresetRange(choice.preset, now, timeZone) ?? { from: choice.from, to: choice.to };
}
