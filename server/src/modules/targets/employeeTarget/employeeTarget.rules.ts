/**
 * Monthly employee targets — the rules every write and every reminder obeys.
 *
 * Pure on purpose (no mongoose, no clock): the window maths is where month
 * lengths, leap years and the app's time zone meet, and it is tested on plain
 * strings. The caller turns "now" into today's `YYYY-MM-DD` in the admin's zone
 * once (`appFormat`), so nothing here can drift onto the container's UTC day.
 *
 * TWIN: the limits below are mirrored by `EMPLOYEE_TARGET_LIMITS` in
 * packages/utils/src/employee-target.ts, which the two consoles validate with.
 * The server cannot import `@duncit/*`; change one, change the other.
 */
import { GraphQLError } from 'graphql';
import { z } from 'zod';

export const EMPLOYEE_TARGET_STATUSES = ['ASSIGNED', 'SUBMITTED', 'REVIEWED'] as const;
export type EmployeeTargetStatus = (typeof EMPLOYEE_TARGET_STATUSES)[number];

export const EMPLOYEE_TARGET_LIMITS = {
  goalsMax: 20,
  goalTitleMax: 120,
  goalDescriptionMax: 1000,
  goalUnitMax: 40,
  goalTargetMax: 1_000_000_000_000,
  notesMax: 2000,
  achievementsMax: 30,
  achievementTitleMax: 120,
  achievementDetailsMax: 2000,
  updatesMax: 5000,
  commentMax: 2000,
} as const;

/** The admin-set reminder window, as the settings store holds it. */
export interface ReminderWindow {
  enabled: boolean;
  /** How many of the month's last days are inside the window (1 = only the last day). */
  daysBeforeEnd: number;
  /** How many of the next month's first days still remind while unsubmitted (0 = none). */
  graceDays: number;
}

export const REMINDER_BOUNDS = {
  daysBeforeEnd: { min: 1, max: 15, fallback: 3 },
  graceDays: { min: 0, max: 15, fallback: 3 },
} as const;

const L = EMPLOYEE_TARGET_LIMITS;

const pad2 = (n: number) => String(n).padStart(2, '0');

/** `{year, month}` for a `YYYY-MM` key, or null for anything else. */
export function parseMonthKey(key: unknown): { year: number; month: number } | null {
  if (typeof key !== 'string' || key.length !== 7 || key[4] !== '-') return null;
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5));
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  return { year, month };
}

export const monthKeyOf = (year: number, month: number): string => `${year}-${pad2(month)}`;

/** Days in a month — Date.UTC's day 0 is the last day of the month before. */
export const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** `{year, month, day}` for a `YYYY-MM-DD` key, or null. */
export function parseDayKey(key: string): { year: number; month: number; day: number } | null {
  const ym = parseMonthKey(key.slice(0, 7));
  if (!ym || key.length !== 10 || key[7] !== '-') return null;
  const day = Number(key.slice(8));
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(ym.year, ym.month)) return null;
  return { ...ym, day };
}

/**
 * The months whose reminder window contains `todayKey` (the app zone's
 * `YYYY-MM-DD`). A month's window is its last `daysBeforeEnd` days and the
 * first `graceDays` of the month after, so near a short month's end both the
 * month closing and the one just closed can be due on the same day.
 */
export function reminderMonthsFor(todayKey: string, window: ReminderWindow): string[] {
  const today = parseDayKey(todayKey);
  if (!today || !window.enabled) return [];
  const months: string[] = [];
  const lastDay = daysInMonth(today.year, today.month);
  if (today.day > lastDay - window.daysBeforeEnd) months.push(monthKeyOf(today.year, today.month));
  if (today.day <= window.graceDays) {
    const previous = today.month === 1 ? { year: today.year - 1, month: 12 } : { year: today.year, month: today.month - 1 };
    months.push(monthKeyOf(previous.year, previous.month));
  }
  return months;
}

/** The last day (`YYYY-MM-DD`) a month's window reminds on: its last grace day, or its own last day. */
export function windowEndDayKey(monthKey: string, window: Pick<ReminderWindow, 'graceDays'>): string | null {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return null;
  if (window.graceDays <= 0) return `${monthKey}-${pad2(daysInMonth(parsed.year, parsed.month))}`;
  const next = parsed.month === 12 ? { year: parsed.year + 1, month: 1 } : { year: parsed.year, month: parsed.month + 1 };
  return `${monthKeyOf(next.year, next.month)}-${pad2(window.graceDays)}`;
}

/** A whole number inside a setting's bounds; junk keeps the current value. */
export function clampSetting(key: keyof typeof REMINDER_BOUNDS, value: unknown, current: number): number {
  const n = Number(value);
  if (value === null || value === undefined || !Number.isFinite(n)) return current;
  const { min, max } = REMINDER_BOUNDS[key];
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/** Goals are the admin's promise to the employee: only changed before any progress is reported. */
export const canEditGoals = (status: EmployeeTargetStatus) => status === 'ASSIGNED';
/** The employee reports, and may correct the report, until an admin has reviewed it. */
export const canSubmit = (status: EmployeeTargetStatus) => status !== 'REVIEWED';
export const canReview = (status: EmployeeTargetStatus) => status === 'SUBMITTED';
export const canReopen = (status: EmployeeTargetStatus) => status === 'REVIEWED';

const text = (max: number) => z.string().trim().max(max, `Must be at most ${max} characters`);
const required = (max: number, label: string) => text(max).min(1, `${label} is required`);

const goalSchema = z.object({
  title: required(L.goalTitleMax, 'Goal title'),
  description: text(L.goalDescriptionMax).nullish().transform((v) => v ?? ''),
  target_value: z
    .number()
    .min(0, 'Target value cannot be negative')
    .max(L.goalTargetMax, 'Target value is too large')
    .nullish()
    .transform((v) => v ?? null),
  unit: text(L.goalUnitMax).nullish().transform((v) => v ?? ''),
});

const goalsSchema = z
  .array(goalSchema)
  .min(1, 'Add at least one goal')
  .max(L.goalsMax, `At most ${L.goalsMax} goals`);

const notesSchema = text(L.notesMax).nullish().transform((v) => v ?? '');

export const assignSchema = z.object({
  employee_id: z.string().trim().min(1, 'Choose an employee'),
  month: z.string().refine((v) => parseMonthKey(v) !== null, 'Month must be YYYY-MM'),
  goals: goalsSchema,
  notes: notesSchema,
  client_request_id: z.string().trim().max(100, 'client_request_id is too long').nullish().transform((v) => v || null),
});

const revisionSchema = z.number().int('expected_revision must be a whole number').min(0, 'expected_revision must be a whole number');

export const updateSchema = z.object({ goals: goalsSchema, notes: notesSchema, expected_revision: revisionSchema });

const achievementSchema = z.object({
  title: required(L.achievementTitleMax, 'Achievement title'),
  details: text(L.achievementDetailsMax).nullish().transform((v) => v ?? ''),
});

export const submitSchema = z.object({
  completion_percent: z
    .number()
    .int('Completion must be a whole number')
    .min(0, 'Completion must be between 0 and 100')
    .max(100, 'Completion must be between 0 and 100'),
  achievements: z
    .array(achievementSchema)
    .min(1, 'Add at least one achievement')
    .max(L.achievementsMax, `At most ${L.achievementsMax} achievements`),
  updates: text(L.updatesMax).nullish().transform((v) => v ?? ''),
  expected_revision: revisionSchema,
});

export const reviewSchema = z.object({
  comment: text(L.commentMax).nullish().transform((v) => v ?? ''),
  expected_revision: revisionSchema,
});

export type AssignInput = z.output<typeof assignSchema>;
export type UpdateInput = z.output<typeof updateSchema>;
export type SubmitInput = z.output<typeof submitSchema>;
export type ReviewInput = z.output<typeof reviewSchema>;

/** The parsed input, or a BAD_USER_INPUT naming the first problem and every field that failed. */
export function parseInput<S extends z.ZodType>(schema: S, raw: unknown): z.output<S> {
  const result = schema.safeParse(raw ?? {});
  if (result.success) return result.data;
  const { issues } = result.error;
  throw new GraphQLError(issues[0]?.message ?? 'Invalid input', {
    extensions: { code: 'BAD_USER_INPUT', fields: issues.map((issue) => issue.path.join('.')) },
  });
}
