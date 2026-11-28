/**
 * Payroll maths with no database in it. Everything is whole paise.
 *
 * One rule pays a month: each day someone is employed earns
 * 1/(days in the month) of every line of the pay revision in force THAT day,
 * less the unpaid-leave share of the day (a whole or half day). So a mid-month
 * joiner, a last working day, unpaid leave and a raise from the 15th all fall
 * out of the same sum, and a full month with no unpaid leave pays exactly the
 * monthly figure. Sums stay exact (a monthly figure times 0, ½ or 1) and are
 * rounded to the paisa once, per line, at the end.
 *
 * Target-linked earnings are left out of the month's own pay. They are paid
 * for a target month once its target is reviewed: the same day rule over THAT
 * month, times the reviewed completion percentage.
 */
import { z } from 'zod';
import { effectiveOn, type HrPayComponentType, type PayLine } from '@modules/hr/employee/employee.rules';
import { daysInMonth, monthKeyOf, parseDayKey, parseMonthKey } from '@modules/targets/employeeTarget/employeeTarget.rules';
import { addDays, eachDay, firstDayOf, lastDayOf } from '@modules/hr/leave/leave.rules';
import { BLOCKING_ISSUES, type PayrollIssue, type PayrollRunStatus } from './payroll.model';
import type { PayTiming } from './payroll.settings';

export interface PayRevision {
  effective_from: string;
  currency: string;
  components: PayLine[];
}

export interface DayWindow {
  from: string;
  to: string;
}

/** The days of `month` someone is employed on, or null when there are none. */
export function employedWindow(month: string, joining: string, lastWorkingDay: string | null): DayWindow | null {
  const first = firstDayOf(month);
  const last = lastDayOf(month);
  const from = joining > first ? joining : first;
  const to = lastWorkingDay && lastWorkingDay < last ? lastWorkingDay : last;
  return from <= to ? { from, to } : null;
}

export interface EarnedLine {
  label: string;
  type: HrPayComponentType;
  target_linked: boolean;
  /** The monthly figure on the latest revision in force during the month. */
  monthly_paise: number;
  amount_paise: number;
}

export interface MonthEarned<R extends PayRevision = PayRevision> {
  days_in_month: number;
  /** Employed days less unpaid leave, in halves. */
  payable_days: number;
  lop_days: number;
  /** Employed days that had a pay revision in force. */
  covered_days: number;
  lines: EarnedLine[];
  /** The revision in force on the last covered day. */
  last_revision: R | null;
}

const monthLength = (month: string) => {
  const parsed = parseMonthKey(month);
  return parsed ? daysInMonth(parsed.year, parsed.month) : 30;
};

/**
 * The day rule over one month for the lines `include` picks. `unpaid` maps a
 * day key to the unpaid share of it (0.5 or 1).
 */
export function earnMonth<R extends PayRevision>(
  month: string,
  window: DayWindow | null,
  revisions: readonly R[],
  unpaid: ReadonlyMap<string, number>,
  include: (line: PayLine) => boolean
): MonthEarned<R> {
  const daysInThisMonth = monthLength(month);
  const sums = new Map<string, { label: string; type: HrPayComponentType; target_linked: boolean; weighted: number; monthly: number }>();
  let payable = 0;
  let lop = 0;
  let covered = 0;
  let last: R | null = null;
  for (const day of window ? eachDay(window.from, window.to) : []) {
    const off = Math.min(1, Math.max(0, unpaid.get(day) ?? 0));
    lop += off;
    payable += 1 - off;
    const revision = effectiveOn(revisions, day);
    if (!revision) continue;
    covered += 1;
    last = revision;
    for (const line of revision.components) {
      if (!include(line)) continue;
      const key = `${line.type}|${line.target_linked}|${line.label}`;
      const entry = sums.get(key) ?? { label: line.label, type: line.type, target_linked: line.target_linked, weighted: 0, monthly: 0 };
      entry.weighted += line.monthly_paise * (1 - off);
      entry.monthly = line.monthly_paise;
      sums.set(key, entry);
    }
  }
  return {
    days_in_month: daysInThisMonth,
    payable_days: payable,
    lop_days: lop,
    covered_days: covered,
    lines: [...sums.values()].map((e) => ({
      label: e.label,
      type: e.type,
      target_linked: e.target_linked,
      monthly_paise: e.monthly,
      amount_paise: Math.round(e.weighted / daysInThisMonth),
    })),
    last_revision: last,
  };
}

export const isTargetLinked = (line: Pick<PayLine, 'type' | 'target_linked'>) => line.type === 'EARNING' && line.target_linked;
export const isFixed = (line: Pick<PayLine, 'type' | 'target_linked'>) => !isTargetLinked(line);

/** Target-linked pay a reviewed month earned, scaled by its completion percentage. */
export function variableFor(earned: MonthEarned, completionPercent: number) {
  const percent = Math.min(100, Math.max(0, completionPercent));
  return earned.lines
    .filter((line) => line.amount_paise > 0)
    .map((line) => ({ label: line.label, base_paise: line.amount_paise, amount_paise: Math.round((line.amount_paise * percent) / 100) }));
}

interface Amounted {
  amount_paise: number;
}

const sum = (items: readonly Amounted[]) => items.reduce((total, item) => total + item.amount_paise, 0);

export interface LineParts {
  earnings: readonly Amounted[];
  variable: readonly Amounted[];
  deductions: readonly Amounted[];
  employer: readonly Amounted[];
  adjustments: readonly (Amounted & { type: 'EARNING' | 'DEDUCTION' })[];
}

export function lineTotals(parts: LineParts) {
  const extraEarnings = parts.adjustments.filter((a) => a.type === 'EARNING');
  const extraDeductions = parts.adjustments.filter((a) => a.type === 'DEDUCTION');
  const gross = sum(parts.earnings) + sum(parts.variable) + sum(extraEarnings);
  const deductions = sum(parts.deductions) + sum(extraDeductions);
  return { gross_paise: gross, deductions_paise: deductions, net_paise: gross - deductions, employer_paise: sum(parts.employer) };
}

export interface IssueFacts {
  coveredDays: number;
  currency: string;
  hasBank: boolean;
  netPaise: number;
  pendingLeave: boolean;
  unreviewedVariable: boolean;
}

/** RazorpayX moves rupees only. */
export const PAYOUT_CURRENCY = 'INR';

export function issuesFor(facts: IssueFacts): PayrollIssue[] {
  const issues: PayrollIssue[] = [];
  if (facts.coveredDays === 0) issues.push('NO_COMPENSATION');
  if (!facts.hasBank) issues.push('NO_BANK');
  if (facts.netPaise < 0) issues.push('NEGATIVE_NET');
  if (facts.currency !== PAYOUT_CURRENCY) issues.push('UNSUPPORTED_CURRENCY');
  if (facts.pendingLeave) issues.push('PENDING_LEAVE');
  if (facts.unreviewedVariable) issues.push('TARGET_NOT_REVIEWED');
  return issues;
}

export const blockingIssues = (issues: readonly PayrollIssue[]) => issues.filter((issue) => BLOCKING_ISSUES.includes(issue));

/** A line Razorpay pays: not held, nothing blocking, and something to send. */
export const isPayable = (line: { hold: unknown; issues: readonly PayrollIssue[]; net_paise: number }) =>
  !line.hold && blockingIssues(line.issues).length === 0 && line.net_paise > 0;

// --- Calendar ----------------------------------------------------------------

export function shiftMonth(month: string, by: number): string {
  const parsed = parseMonthKey(month);
  if (!parsed) return month;
  const index = parsed.year * 12 + (parsed.month - 1) + by;
  return monthKeyOf(Math.floor(index / 12), (index % 12) + 1);
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** The day a month's salary is due by the settings; a day past the month's end is its last day. */
export function payDateFor(month: string, timing: PayTiming, payDay: number): string {
  const base = timing === 'SAME_MONTH' ? month : shiftMonth(month, 1);
  return `${base}-${pad2(Math.min(payDay, monthLength(base)))}`;
}

export interface ScheduleRule {
  pay_timing: PayTiming;
  pay_day: number;
  draft_lead_days: number;
}

export const draftDateFor = (month: string, rule: ScheduleRule) => addDays(payDateFor(month, rule.pay_timing, rule.pay_day), -rule.draft_lead_days);

/** The payroll months whose drafting window (draft day to pay day) contains `today`. */
export function monthsDueForDraft(today: string, rule: ScheduleRule): string[] {
  const current = today.slice(0, 7);
  return [shiftMonth(current, -1), current, shiftMonth(current, 1)].filter(
    (month) => draftDateFor(month, rule) <= today && today <= payDateFor(month, rule.pay_timing, rule.pay_day)
  );
}

export const canEditRun = (status: PayrollRunStatus) => status === 'DRAFT';
export const canReturnRun = (status: PayrollRunStatus) => status === 'APPROVED';
export const canReleaseRun = (status: PayrollRunStatus) => status === 'APPROVED';

// --- Inputs ------------------------------------------------------------------

export const PAYROLL_LIMITS = { labelMax: 60, noteMax: 500, amountMax: 100_000_000, releaseAheadDays: 60 } as const;
const P = PAYROLL_LIMITS;

const monthSchema = z.string().refine((v) => parseMonthKey(v) !== null, 'Use a YYYY-MM month');
const optionalNote = z
  .string()
  .trim()
  .max(P.noteMax, `At most ${P.noteMax} characters`)
  .nullish()
  .transform((v) => v || null);
const requiredNote = (message: string) => z.string().trim().min(3, message).max(P.noteMax, `At most ${P.noteMax} characters`);

export const createRunSchema = z.object({ month: monthSchema });

export const adjustmentSchema = z.object({
  label: z.string().trim().min(1, 'Name the adjustment').max(P.labelMax, `At most ${P.labelMax} characters`),
  type: z.enum(['EARNING', 'DEDUCTION']),
  amount: z
    .number()
    .positive('Enter an amount above zero')
    .max(P.amountMax, 'That amount is too large')
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'Use at most two decimals'),
  note: optionalNote,
});
export type AdjustmentInput = z.output<typeof adjustmentSchema>;

export const holdSchema = z.object({ reason: requiredNote('Say why this salary is held') });
export const returnSchema = z.object({ note: requiredNote('Say what needs to change') });
export const approveSchema = z.object({ note: optionalNote });

export const releaseSchema = z.object({
  pay_on: z.string().refine((v) => parseDayKey(v) !== null, 'Use a YYYY-MM-DD date'),
  note: optionalNote,
});
