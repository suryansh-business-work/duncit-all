/**
 * HR employee records: the rules every write obeys.
 *
 * Pure on purpose (no mongoose, no clock): the caller turns "now" into the
 * app zone's `YYYY-MM-DD` once, and every date here is such a day key, so a
 * joining date can never drift a day across the container's UTC midnight.
 *
 * The enums and limits come from hr.constants.ts, which a script copies to
 * @duncit/utils for the HR and Employee consoles (the server imports no
 * `@duncit/*` package), so the two can never disagree.
 */
import { z } from 'zod';
import { isEmailAddress, MAX_EMAIL_LENGTH } from '@utils/email';
import { PHONE_EXTENSION_REGEX, PHONE_NUMBER_REGEX } from '@utils/phone';
import { BANK_ACCOUNT_NUMBER_PATTERN, IFSC_PATTERN, PAN_PATTERN, UAN_PATTERN } from '@utils/field-formats';
import {
  HR_COMPENSATION_REASONS,
  HR_EMPLOYEE_LIMITS,
  HR_EMPLOYMENT_TYPES,
  HR_EXIT_TYPES,
  HR_GENDERS,
  HR_JOB_CHANGE_REASONS,
  HR_PAY_COMPONENT_TYPES,
  type HrEmployeeStatus,
  type HrPayComponentType,
} from '@modules/hr/hr.constants';

/** Birth dates reach back further than any target month, so HR keeps its own range. */
const YEAR_MIN = 1900;
const YEAR_MAX = 2100;
const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `{year, month, day}` for a real calendar `YYYY-MM-DD` between 1900 and 2100, or null. */
export function parseDayKey(key: string): { year: number; month: number; day: number } | null {
  const match = DAY_KEY.exec(key);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (year < YEAR_MIN || year > YEAR_MAX || month < 1 || month > 12) return null;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= last ? { year, month, day } : null;
}

// The shared enums and limits live in hr.constants.ts (copied to @duncit/utils by
// scripts/generate-hr-constants.mjs); they are re-exported so every importer of
// these rules keeps working unchanged.
export {
  HR_COMPENSATION_REASONS,
  HR_EMPLOYEE_LIMITS,
  HR_EMPLOYEE_STATUSES,
  HR_EMPLOYMENT_TYPES,
  HR_EVENT_KINDS,
  HR_EXIT_TYPES,
  HR_GENDERS,
  HR_JOB_CHANGE_REASONS,
  HR_PAY_COMPONENT_TYPES,
} from '@modules/hr/hr.constants';
export type {
  HrCompensationReason,
  HrEmployeeStatus,
  HrEmploymentType,
  HrEventKind,
  HrExitType,
  HrGender,
  HrJobChangeReason,
  HrPayComponentType,
} from '@modules/hr/hr.constants';

const L = HR_EMPLOYEE_LIMITS;

/** Money at rest is integer paise; on the wire it is rupees with two decimals. */
export const toPaise = (rupees: number): number => Math.round(rupees * 100);
export const toRupees = (paise: number): number => Math.round(paise) / 100;

/** A display code from the settings prefix and the next sequence number: `EMP-0042`. */
export function formatEmployeeCode(prefix: string, seq: number, digits: number): string {
  const head = prefix.trim().toUpperCase();
  const body = String(Math.max(1, Math.floor(seq))).padStart(Math.max(1, Math.floor(digits)), '0');
  return head ? `${head}-${body}` : body;
}

/** The last four characters of a secret — all that is kept readable at rest. */
export const lastFour = (value: string): string => value.slice(-4);

/** What every read outside the audited reveal shows: `•••• 1234`. */
export const maskedTail = (last4: string): string => `•••• ${last4}`;

/** Whole years between two day keys, the way a birthday counts them. */
export function yearsBetween(fromKey: string, toKey: string): number {
  const from = parseDayKey(fromKey);
  const to = parseDayKey(toKey);
  if (!from || !to) return 0;
  let years = to.year - from.year;
  if (to.month < from.month || (to.month === from.month && to.day < from.day)) years -= 1;
  return years;
}

// ---- Status transitions --------------------------------------------------

/** Notice can be served only by someone still working. */
export const canScheduleExit = (status: HrEmployeeStatus) => status === 'ACTIVE' || status === 'ON_NOTICE';
export const canCancelExit = (status: HrEmployeeStatus) => status === 'ON_NOTICE';
export const canRehire = (status: HrEmployeeStatus) => status === 'EXITED';
/** An exited record is history: its job, pay and bank details are frozen until a rehire. */
export const isEditable = (status: HrEmployeeStatus) => status !== 'EXITED';

/**
 * Where an exit lands: a last working day already behind today ends the
 * employment now; today or later serves notice until the sweep closes it.
 */
export const exitStatusFor = (lastWorkingDay: string, today: string): HrEmployeeStatus =>
  lastWorkingDay < today ? 'EXITED' : 'ON_NOTICE';

// ---- Compensation maths ---------------------------------------------------

export interface PayLine {
  label: string;
  type: HrPayComponentType;
  monthly_paise: number;
  target_linked: boolean;
}

export interface CompensationTotals {
  /** Every earning, target-linked lines at 100%. */
  gross_monthly_paise: number;
  /** Earnings that do not depend on a target. */
  fixed_gross_monthly_paise: number;
  /** Target-linked earnings at 100% — paid in proportion to the reviewed month. */
  variable_monthly_paise: number;
  deductions_monthly_paise: number;
  employer_monthly_paise: number;
  /** Gross minus the employee's deductions, target lines at 100%. */
  net_monthly_paise: number;
  /** Twelve months of gross plus employer contributions. */
  annual_ctc_paise: number;
}

/** The totals a set of pay lines adds up to. Derived on the server, never trusted from a client. */
export function compensationTotals(lines: readonly PayLine[]): CompensationTotals {
  let fixed = 0;
  let variable = 0;
  let deductions = 0;
  let employer = 0;
  for (const line of lines) {
    const amount = Math.max(0, Math.round(line.monthly_paise));
    if (line.type === 'DEDUCTION') deductions += amount;
    else if (line.type === 'EMPLOYER_CONTRIBUTION') employer += amount;
    else if (line.target_linked) variable += amount;
    else fixed += amount;
  }
  const gross = fixed + variable;
  return {
    gross_monthly_paise: gross,
    fixed_gross_monthly_paise: fixed,
    variable_monthly_paise: variable,
    deductions_monthly_paise: deductions,
    employer_monthly_paise: employer,
    net_monthly_paise: gross - deductions,
    annual_ctc_paise: (gross + employer) * 12,
  };
}

/** The revision in force on `dayKey`: the newest whose effective date has arrived. */
export function effectiveOn<T extends { effective_from: string }>(revisions: readonly T[], dayKey: string): T | null {
  let current: T | null = null;
  for (const revision of revisions) {
    if (revision.effective_from > dayKey) continue;
    if (!current || revision.effective_from >= current.effective_from) current = revision;
  }
  return current;
}

// ---- Input schemas ---------------------------------------------------------

const text = (max: number) => z.string().trim().max(max, `Must be at most ${max} characters`);
const required = (max: number, label: string) => text(max).min(1, `${label} is required`);
const optionalText = (max: number) =>
  text(max)
    .nullish()
    .transform((v) => v || null);

export const dayKey = (label: string) =>
  z.string().trim().refine((v) => parseDayKey(v) !== null, `${label} must be a date (YYYY-MM-DD)`);
const optionalDay = (label: string) =>
  dayKey(label)
    .nullish()
    .or(z.literal(''))
    .transform((v) => v || null);

const emailField = (label: string) =>
  z
    .string()
    .trim()
    .toLowerCase()
    .max(MAX_EMAIL_LENGTH, `${label} is too long`)
    .refine(isEmailAddress, `Enter a valid ${label.toLowerCase()}`);
const optionalEmail = (label: string) =>
  emailField(label)
    .nullish()
    .or(z.literal(''))
    .transform((v) => v || null);

const phoneNumber = z.string().trim().regex(PHONE_NUMBER_REGEX, 'Enter a valid phone number');
const phoneExtension = z.string().trim().regex(PHONE_EXTENSION_REGEX, 'Enter a valid country code');
const optionalPhone = phoneNumber
  .nullish()
  .or(z.literal(''))
  .transform((v) => v || null);

const pattern = (rx: RegExp, message: string) =>
  z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => rx.test(v), message)
    .nullish()
    .or(z.literal(''))
    .transform((v) => v || null);

const emergencySchema = z
  .object({
    name: required(L.nameMax, 'Emergency contact name'),
    relation: optionalText(L.relationMax),
    phone_number: phoneNumber,
    phone_extension: phoneExtension,
  })
  .nullish()
  .transform((v) => v ?? null);

/** What the employee themselves may change from the Employee console. */
export const contactSchema = z.object({
  personal_email: optionalEmail('Personal email'),
  phone_number: optionalPhone,
  phone_extension: phoneExtension.nullish().transform((v) => v || null),
  current_address: optionalText(L.addressMax),
  permanent_address: optionalText(L.addressMax),
  emergency_contact: emergencySchema,
});

export const personalSchema = contactSchema.extend({
  first_name: required(L.nameMax, 'First name'),
  last_name: required(L.nameMax, 'Last name'),
  gender: z.enum(HR_GENDERS).nullish().transform((v) => v ?? null),
  date_of_birth: optionalDay('Date of birth'),
});

export const jobSchema = z
  .object({
    job_title: required(L.titleMax, 'Job title'),
    department: optionalText(L.departmentMax),
    work_location: optionalText(L.locationMax),
    manager_id: z
      .string()
      .trim()
      .nullish()
      .transform((v) => v || null),
    employment_type: z.enum(HR_EMPLOYMENT_TYPES, { error: 'Choose an employment type' }),
    date_of_joining: dayKey('Date of joining'),
    probation_end_date: optionalDay('Probation end date'),
    notice_period_days: z
      .number()
      .int('Notice period must be whole days')
      .min(0, 'Notice period cannot be negative')
      .max(L.noticeDaysMax, `Notice period is at most ${L.noticeDaysMax} days`),
    work_email: optionalEmail('Work email'),
  })
  .refine((job) => !job.probation_end_date || job.probation_end_date >= job.date_of_joining, {
    message: 'Probation must end on or after the joining date',
    path: ['probation_end_date'],
  });

const payLineSchema = z.object({
  label: required(L.componentLabelMax, 'Pay line name'),
  type: z.enum(HR_PAY_COMPONENT_TYPES),
  monthly_amount: z
    .number()
    .min(0, 'Amounts cannot be negative')
    .max(L.amountMax, 'Amount is too large'),
  target_linked: z
    .boolean()
    .nullish()
    .transform((v) => v === true),
});

export const compensationSchema = z
  .object({
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code'),
    effective_from: dayKey('Effective date'),
    reason: z.enum(HR_COMPENSATION_REASONS),
    note: optionalText(L.noteMax),
    components: z
      .array(payLineSchema)
      .min(1, 'Add at least one pay line')
      .max(L.componentsMax, `At most ${L.componentsMax} pay lines`),
  })
  .refine((c) => c.components.some((line) => line.type === 'EARNING' && line.monthly_amount > 0), {
    message: 'Add at least one earning above zero',
    path: ['components'],
  })
  .refine((c) => c.components.every((line) => line.type === 'EARNING' || !line.target_linked), {
    message: 'Only an earning can be linked to targets',
    path: ['components'],
  });

export const bankSchema = z.object({
  account_holder_name: optionalText(L.nameMax * 2),
  account_number: z
    .string()
    .trim()
    .refine((v) => BANK_ACCOUNT_NUMBER_PATTERN.test(v), 'Account number is 6 to 18 digits')
    .nullish()
    .or(z.literal(''))
    .transform((v) => v || null),
  ifsc: pattern(IFSC_PATTERN, 'Enter a valid IFSC (e.g. HDFC0001234)'),
  bank_name: optionalText(L.bankNameMax),
  pan: pattern(PAN_PATTERN, 'Enter a valid PAN (e.g. ABCDE1234F)'),
  uan: z
    .string()
    .trim()
    .refine((v) => UAN_PATTERN.test(v), 'UAN is 12 digits')
    .nullish()
    .or(z.literal(''))
    .transform((v) => v || null),
});

const newAccountSchema = z.object({
  email: emailField('Email'),
  phone_number: optionalPhone,
  phone_extension: phoneExtension.nullish().transform((v) => v || null),
});

export const hireSchema = z
  .object({
    account_user_id: z
      .string()
      .trim()
      .nullish()
      .transform((v) => v || null),
    new_account: newAccountSchema.nullish().transform((v) => v ?? null),
    employee_code: text(L.codeMax)
      .toUpperCase()
      .regex(/^[A-Z0-9-]*$/, 'Employee code uses letters, digits and dashes')
      .nullish()
      .transform((v) => v || null),
    personal: personalSchema,
    job: jobSchema,
    compensation: compensationSchema.nullish().transform((v) => v ?? null),
    bank: bankSchema.nullish().transform((v) => v ?? null),
    client_request_id: text(100)
      .nullish()
      .transform((v) => v || null),
  })
  .refine((h) => Boolean(h.account_user_id) !== Boolean(h.new_account), {
    message: 'Pick an existing account or enter a new account email — exactly one',
    path: ['account_user_id'],
  });

const revisionSchema = z.number().int().min(0, 'expected_revision must be a whole number');

export const jobChangeSchema = z.object({
  job: jobSchema,
  reason: z.enum(HR_JOB_CHANGE_REASONS),
  effective_date: dayKey('Effective date'),
  note: optionalText(L.noteMax),
  expected_revision: revisionSchema,
});

export const exitSchema = z
  .object({
    exit_type: z.enum(HR_EXIT_TYPES),
    resignation_date: optionalDay('Resignation date'),
    last_working_day: dayKey('Last working day'),
    reason: optionalText(L.noteMax),
    eligible_for_rehire: z.boolean(),
    expected_revision: revisionSchema,
  })
  .refine((e) => !e.resignation_date || e.resignation_date <= e.last_working_day, {
    message: 'The last working day cannot be before the resignation date',
    path: ['last_working_day'],
  });

export const rehireSchema = z.object({ job: jobSchema, note: optionalText(L.noteMax), expected_revision: revisionSchema });

export type HireInput = z.output<typeof hireSchema>;
export type PersonalInput = z.output<typeof personalSchema>;
export type ContactInput = z.output<typeof contactSchema>;
export type JobInput = z.output<typeof jobSchema>;
export type CompensationInput = z.output<typeof compensationSchema>;
export type BankInput = z.output<typeof bankSchema>;
export type JobChangeInput = z.output<typeof jobChangeSchema>;
export type ExitInput = z.output<typeof exitSchema>;
export type RehireInput = z.output<typeof rehireSchema>;
