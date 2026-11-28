/**
 * Leave maths with no database in it: which dates a request covers, how many
 * days that is, which leave year a date falls in, and what a leave type grants
 * in a year. Dates are `YYYY-MM-DD` keys in the admin's zone; every sum runs on
 * UTC calendar dates, so a server in any zone counts the same days.
 */
import { z } from 'zod';
import { LEAVE_CODE_PATTERN } from '@utils/field-formats';
import { daysInMonth, monthKeyOf, parseDayKey } from '@modules/targets/employeeTarget/employeeTarget.rules';

export const HR_LEAVE_ACCRUALS = ['YEARLY', 'MONTHLY'] as const;
export type HrLeaveAccrual = (typeof HR_LEAVE_ACCRUALS)[number];

export const HR_LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export type HrLeaveStatus = (typeof HR_LEAVE_STATUSES)[number];

/** Null on a request means whole days. A half day is only allowed on a one-day request. */
export const HR_HALF_DAYS = ['FIRST_HALF', 'SECOND_HALF'] as const;
export type HrHalfDay = (typeof HR_HALF_DAYS)[number];

/** The two halves a day is claimed in, so a morning and an afternoon request can sit on one date. */
export type DayPart = 'AM' | 'PM';

export const HR_LEAVE_LIMITS = {
  nameMax: 60,
  codeMax: 12,
  quotaMax: 365,
  reasonMax: 500,
  noteMax: 500,
  holidayNameMax: 80,
  /** The longest single request, in calendar days. */
  spanMax: 92,
  /** How far ahead a request may start. */
  aheadMax: 366,
  backdateMax: 90,
  adjustMax: 365,
} as const;

const L = HR_LEAVE_LIMITS;
const pad2 = (n: number) => String(n).padStart(2, '0');

function utcOf(key: string): Date | null {
  const parts = parseDayKey(key);
  return parts ? new Date(Date.UTC(parts.year, parts.month - 1, parts.day)) : null;
}

const keyOfUtc = (date: Date) => `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;

/** The day key `days` after (or before, when negative) `key`. */
export function addDays(key: string, days: number): string {
  const date = utcOf(key);
  if (!date) return key;
  date.setUTCDate(date.getUTCDate() + days);
  return keyOfUtc(date);
}

/** 0 = Sunday … 6 = Saturday, or -1 for a key that is not a date. */
export const weekdayOf = (key: string): number => utcOf(key)?.getUTCDay() ?? -1;

/** The longest range any caller walks day by day is a leave year; this is that with room to spare. */
const MAX_WALK_DAYS = 400;

/** Every day key from `from` to `to`, both included. Empty when `to` is before `from`. */
export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  for (let key = from; key <= to && days.length < MAX_WALK_DAYS; key = addDays(key, 1)) days.push(key);
  return days;
}

/** Inclusive count of calendar days. */
export const calendarDays = (from: string, to: string): number => eachDay(from, to).length;

export const firstDayOf = (month: string) => `${month}-01`;
export function lastDayOf(month: string): string {
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return `${month}-${pad2(daysInMonth(year, m))}`;
}

/** Leave days are counted in halves; two decimals keep a monthly accrual of 1.25 exact. */
export const roundDays = (days: number): number => Math.round(days * 100) / 100;

/** What makes a date a working day for leave: the weekly offs and the holiday list. */
export interface WorkingDayRules {
  weeklyOffs: ReadonlySet<number>;
  holidays: ReadonlySet<string>;
}

export const isWorkingDay = (key: string, rules: WorkingDayRules): boolean =>
  !rules.weeklyOffs.has(weekdayOf(key)) && !rules.holidays.has(key);

/**
 * The working days a request covers and how much of each: 1 for a whole day,
 * 0.5 for a half day. Weekly offs and holidays inside the range cost nothing.
 */
export function requestDays(start: string, end: string, halfDay: HrHalfDay | null, rules: WorkingDayRules): Map<string, number> {
  const days = new Map<string, number>();
  for (const key of eachDay(start, end)) {
    if (isWorkingDay(key, rules)) days.set(key, halfDay ? 0.5 : 1);
  }
  return days;
}

export const totalDays = (days: ReadonlyMap<string, number>): number => roundDays([...days.values()].reduce((sum, d) => sum + d, 0));

/** The halves a request takes on each of its dates — the keys of the overlap guard. */
export const partsFor = (halfDay: HrHalfDay | null): DayPart[] => {
  if (halfDay === 'FIRST_HALF') return ['AM'];
  if (halfDay === 'SECOND_HALF') return ['PM'];
  return ['AM', 'PM'];
};

// --- Leave years -------------------------------------------------------------

/** The calendar year a date's leave year starts in (an April–March year that starts in April 2026 is 2026). */
export function leaveYearOf(key: string, startMonth: number): number {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  return month >= startMonth ? year : year - 1;
}

export function leaveYearRange(year: number, startMonth: number): { from: string; to: string } {
  const endYear = startMonth === 1 ? year : year + 1;
  const endMonth = startMonth === 1 ? 12 : startMonth - 1;
  return { from: `${monthKeyOf(year, startMonth)}-01`, to: lastDayOf(monthKeyOf(endYear, endMonth)) };
}

/** The twelve `YYYY-MM` keys of a leave year, in order. */
export function leaveYearMonths(year: number, startMonth: number): string[] {
  return Array.from({ length: 12 }, (_, i) => {
    const index = startMonth - 1 + i;
    return monthKeyOf(year + Math.floor(index / 12), (index % 12) + 1);
  });
}

/** The rule a leave type grants by. */
export interface LeaveGrantRule {
  annual_quota: number;
  accrual: HrLeaveAccrual;
}

/**
 * Days a leave type has granted in a leave year by the day `asOf`.
 *
 * Only months the person is employed in count, the joining month in full.
 * YEARLY grants those months' share of the quota on the first day of the year
 * (or on joining); MONTHLY grants a twelfth at the start of each month, so a
 * month not yet begun has granted nothing. A year that has ended has granted
 * everything it ever will.
 *
 * A balance shown today passes today; a request is checked as of its own last
 * date, so leave booked for a later month counts what will have accrued by then.
 */
export function grantedIn(rule: LeaveGrantRule, year: number, startMonth: number, joining: string, asOf: string): number {
  const joiningMonth = joining.slice(0, 7);
  const asOfMonth = asOf.slice(0, 7);
  const months = leaveYearMonths(year, startMonth).filter((month) => month >= joiningMonth);
  const share = rule.annual_quota / 12;
  if (rule.accrual === 'YEARLY') {
    const started = asOf >= leaveYearRange(year, startMonth).from && asOf >= joining;
    return started ? roundDays(share * months.length) : 0;
  }
  return roundDays(share * months.filter((month) => month <= asOfMonth).length);
}

/** One leave type's figures for one leave year. */
export interface LeaveYearFigures {
  granted: number;
  carried: number;
  adjusted: number;
  taken: number;
  pending: number;
}

/** What is left to ask for: granted, carried and adjusted, less what is taken or waiting. */
export const availableOf = (f: LeaveYearFigures): number => roundDays(f.granted + f.carried + f.adjusted - f.taken - f.pending);

/** What a year closes on — the pending requests are not taken yet. */
export const closingOf = (f: LeaveYearFigures): number => roundDays(f.granted + f.carried + f.adjusted - f.taken);

/** A closing balance carried into the next year, capped and never negative. */
export const carryOf = (closing: number, cap: number): number => roundDays(Math.max(0, Math.min(closing, cap)));

// --- Inputs ------------------------------------------------------------------

const dayKeySchema = z.string().refine((v) => parseDayKey(v) !== null, 'Use a YYYY-MM-DD date');
const trimmed = (max: number) => z.string().trim().max(max, `At most ${max} characters`);
const optionalText = (max: number) =>
  trimmed(max)
    .nullish()
    .transform((v) => v || null);
const halfStep = (min: number, max: number, what: string) =>
  z
    .number()
    .min(min, `${what} must be between ${min} and ${max}`)
    .max(max, `${what} must be between ${min} and ${max}`)
    .refine((v) => Number.isInteger(v * 2), `${what} must be in steps of half a day`);

export const leaveTypeSchema = z.object({
  name: trimmed(L.nameMax).min(1, 'Name the leave type'),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(LEAVE_CODE_PATTERN, 'Use 1-12 capital letters, digits or _ for the code, starting with a letter'),
  paid: z.boolean(),
  annual_quota: halfStep(0, L.quotaMax, 'The yearly quota'),
  accrual: z.enum(HR_LEAVE_ACCRUALS),
  carry_forward_max: halfStep(0, L.quotaMax, 'The carry-forward limit'),
  allow_half_day: z.boolean(),
  active: z.boolean(),
});
export type LeaveTypeInput = z.output<typeof leaveTypeSchema>;

export const leaveRequestSchema = z
  .object({
    leave_type_id: z.string().min(1, 'Choose a leave type'),
    start_date: dayKeySchema,
    end_date: dayKeySchema,
    half_day: z.enum(HR_HALF_DAYS).nullish().transform((v) => v ?? null),
    reason: optionalText(L.reasonMax),
    client_request_id: z
      .string()
      .regex(/^[A-Za-z0-9_-]{8,64}$/, 'The request id is malformed')
      .nullish()
      .transform((v) => v ?? null),
  })
  .refine((v) => v.end_date >= v.start_date, { message: 'The last day cannot be before the first day', path: ['end_date'] })
  .refine((v) => !v.half_day || v.start_date === v.end_date, { message: 'A half day must start and end on the same date', path: ['half_day'] })
  .refine((v) => calendarDays(v.start_date, v.end_date) <= L.spanMax, {
    message: `One request can cover at most ${L.spanMax} days`,
    path: ['end_date'],
  });
export type LeaveRequestInput = z.output<typeof leaveRequestSchema>;

export const leaveDecisionSchema = z
  .object({
    approve: z.boolean(),
    note: optionalText(L.noteMax),
  })
  .refine((v) => v.approve || (v.note?.length ?? 0) >= 3, { message: 'Say why the request is declined', path: ['note'] });

export const leaveCancelSchema = z.object({ note: optionalText(L.noteMax) });

export const leaveAdjustmentSchema = z.object({
  employee_id: z.string().min(1, 'Choose the employee'),
  leave_type_id: z.string().min(1, 'Choose a leave type'),
  leave_year: z.number().int().min(2000).max(2100),
  days: z
    .number()
    .min(-L.adjustMax, `Adjust by at most ${L.adjustMax} days`)
    .max(L.adjustMax, `Adjust by at most ${L.adjustMax} days`)
    .refine((v) => v !== 0, 'Adjust by more than zero days')
    .refine((v) => Number.isInteger(v * 2), 'Adjust in steps of half a day'),
  note: trimmed(L.noteMax).min(3, 'Say why the balance changes'),
});
export type LeaveAdjustmentInput = z.output<typeof leaveAdjustmentSchema>;

export const holidaySchema = z.object({
  date: dayKeySchema,
  name: trimmed(L.holidayNameMax).min(1, 'Name the holiday'),
});
export type HolidayInput = z.output<typeof holidaySchema>;

export const leaveSettingsSchema = z.object({
  weekly_off_days: z
    .array(z.number().int().min(0).max(6))
    .max(6, 'At least one day of the week must be a working day')
    .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
  leave_year_start_month: z.number().int().min(1, 'Choose a month').max(12, 'Choose a month'),
  backdate_days: z.number().int().min(0).max(L.backdateMax, `At most ${L.backdateMax} days back`),
});
export type LeaveSettingsInput = z.output<typeof leaveSettingsSchema>;
