/**
 * HR payroll, leave, holidays and salary-account changes — what the HR,
 * Finance and Employee consoles agree on: enums, limits, translation keys and
 * chip colours. Data and pure helpers only; each console keeps its own UI.
 *
 * TWIN: the enums and limits mirror server/src/modules/hr/{leave,payroll,
 * bankRequest}/*.rules.ts / *.service.ts, which re-check every write (the
 * server imports no @duncit/* package for these). Change one, change the other.
 */

import { dateOfMonthKey, monthKeyOf } from './employee-target';
import { keyMap } from './hr-employee';

export const HR_PAYROLL_RUN_STATUSES = ['DRAFT', 'APPROVED', 'RELEASED', 'COMPLETED'] as const;
export type HrPayrollRunStatus = (typeof HR_PAYROLL_RUN_STATUSES)[number];

export const HR_PAYROLL_ISSUES = ['NO_COMPENSATION', 'NO_BANK', 'NEGATIVE_NET', 'UNSUPPORTED_CURRENCY', 'PENDING_LEAVE', 'TARGET_NOT_REVIEWED'] as const;
export type HrPayrollIssue = (typeof HR_PAYROLL_ISSUES)[number];

/** The issues that stop a salary being paid until fixed or held. */
export const HR_BLOCKING_ISSUES: readonly HrPayrollIssue[] = ['NO_COMPENSATION', 'NO_BANK', 'NEGATIVE_NET', 'UNSUPPORTED_CURRENCY'];

export const HR_PAYOUT_STATUSES = ['PROCESSING', 'PAID', 'FAILED'] as const;
export type HrPayoutStatus = (typeof HR_PAYOUT_STATUSES)[number];

export const PAYSLIP_STATUSES = ['ON_HOLD', 'NOT_PAYABLE', 'SCHEDULED', 'PROCESSING', 'PAID', 'FAILED'] as const;
export type PayslipStatus = (typeof PAYSLIP_STATUSES)[number];

export const HR_PAY_TIMINGS = ['SAME_MONTH', 'NEXT_MONTH'] as const;
export type HrPayTiming = (typeof HR_PAY_TIMINGS)[number];

export const HR_PAYOUT_MODES = ['IMPS', 'NEFT'] as const;
export type HrPayoutMode = (typeof HR_PAYOUT_MODES)[number];

export const HR_ADJUSTMENT_TYPES = ['EARNING', 'DEDUCTION'] as const;
export type HrAdjustmentType = (typeof HR_ADJUSTMENT_TYPES)[number];

/** A request an employee makes and someone decides: leave, or a salary-account change. */
const REQUEST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
type HrRequestStatus = (typeof REQUEST_STATUSES)[number];

export const HR_LEAVE_STATUSES = REQUEST_STATUSES;
export type HrLeaveStatus = HrRequestStatus;

export const HR_HALF_DAYS = ['FIRST_HALF', 'SECOND_HALF'] as const;
export type HrHalfDay = (typeof HR_HALF_DAYS)[number];

export const HR_LEAVE_ACCRUALS = ['YEARLY', 'MONTHLY'] as const;
export type HrLeaveAccrual = (typeof HR_LEAVE_ACCRUALS)[number];

export const HR_BANK_REQUEST_STATUSES = REQUEST_STATUSES;
export type HrBankRequestStatus = HrRequestStatus;

/** What a payroll run's history records — the server's PAYROLL_EVENT_ACTIONS (hr/payroll/payroll.model.ts). */
export const HR_PAYROLL_EVENT_ACTIONS = [
  'CREATED',
  'RECOMPUTED',
  'ADJUSTED',
  'HELD',
  'UNHELD',
  'APPROVED',
  'RETURNED',
  'RELEASED',
  'DELETED',
  'LINE_RELEASED',
  'PAYOUT_RETRIED',
  'COMPLETED',
] as const;
export type HrPayrollEventAction = (typeof HR_PAYROLL_EVENT_ACTIONS)[number];

export const HR_CALENDAR_EVENT_KINDS = ['HOLIDAY', 'LEAVE', 'TEAM_LEAVE', 'PAYDAY', 'TARGET_DUE'] as const;
export type HrCalendarEventKind = (typeof HR_CALENDAR_EVENT_KINDS)[number];

export const HR_LEAVE_LIMITS = {
  nameMax: 60,
  codeMax: 12,
  quotaMax: 365,
  reasonMax: 500,
  noteMax: 500,
  holidayNameMax: 80,
  spanMax: 92,
  aheadMax: 366,
  backdateMax: 90,
  adjustMax: 365,
} as const;

export const HR_PAYROLL_LIMITS = {
  labelMax: 60,
  noteMax: 500,
  amountMax: 100_000_000,
  releaseAheadDays: 60,
  payDayMin: 1,
  payDayMax: 31,
  leadDaysMin: 1,
  leadDaysMax: 20,
} as const;

export const HR_BANK_CHANGE_LIMITS = { holderMin: 2, holderMax: 120, bankNameMax: 80, noteMax: 500 } as const;

/** The private upload folder a salary-account proof goes to (an image or a PDF). */
export const HR_BANK_PROOF_FOLDER = 'hr-bank-proof';

// Chip colours, so every console means the same thing by amber.
export const HR_PAYROLL_RUN_STATUS_COLORS = { DRAFT: 'default', APPROVED: 'info', RELEASED: 'warning', COMPLETED: 'success' } as const;
export const HR_PAYOUT_STATUS_COLORS = { PROCESSING: 'info', PAID: 'success', FAILED: 'error' } as const;
export const PAYSLIP_STATUS_COLORS = { ON_HOLD: 'warning', NOT_PAYABLE: 'default', SCHEDULED: 'info', PROCESSING: 'info', PAID: 'success', FAILED: 'error' } as const;
const REQUEST_STATUS_COLORS = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'error', CANCELLED: 'default' } as const;
export const HR_LEAVE_STATUS_COLORS = REQUEST_STATUS_COLORS;
export const HR_BANK_REQUEST_STATUS_COLORS = REQUEST_STATUS_COLORS;
export const hrIssueColor = (issue: HrPayrollIssue) => (HR_BLOCKING_ISSUES.includes(issue) ? 'error' : 'warning');

// Every key is written out in full so the translation gate sees each one as a literal (see keyMap).
export const HR_PAYROLL_RUN_STATUS_KEYS = keyMap<HrPayrollRunStatus>([
  'hrShared.runStatus.DRAFT',
  'hrShared.runStatus.APPROVED',
  'hrShared.runStatus.RELEASED',
  'hrShared.runStatus.COMPLETED',
]);

export const HR_PAYROLL_ISSUE_KEYS = keyMap<HrPayrollIssue>([
  'hrShared.issue.NO_COMPENSATION',
  'hrShared.issue.NO_BANK',
  'hrShared.issue.NEGATIVE_NET',
  'hrShared.issue.UNSUPPORTED_CURRENCY',
  'hrShared.issue.PENDING_LEAVE',
  'hrShared.issue.TARGET_NOT_REVIEWED',
]);

export const HR_PAYOUT_STATUS_KEYS = keyMap<HrPayoutStatus>([
  'hrShared.payoutStatus.PROCESSING',
  'hrShared.payoutStatus.PAID',
  'hrShared.payoutStatus.FAILED',
]);

export const PAYSLIP_STATUS_KEYS = keyMap<PayslipStatus>([
  'hrShared.payslipStatus.ON_HOLD',
  'hrShared.payslipStatus.NOT_PAYABLE',
  'hrShared.payslipStatus.SCHEDULED',
  'hrShared.payslipStatus.PROCESSING',
  'hrShared.payslipStatus.PAID',
  'hrShared.payslipStatus.FAILED',
]);

export const HR_PAY_TIMING_KEYS = keyMap<HrPayTiming>(['hrShared.payTiming.SAME_MONTH', 'hrShared.payTiming.NEXT_MONTH']);

export const HR_ADJUSTMENT_TYPE_KEYS = keyMap<HrAdjustmentType>(['hrShared.adjustmentType.EARNING', 'hrShared.adjustmentType.DEDUCTION']);

export const HR_LEAVE_STATUS_KEYS = keyMap<HrLeaveStatus>([
  'hrShared.leaveStatus.PENDING',
  'hrShared.leaveStatus.APPROVED',
  'hrShared.leaveStatus.REJECTED',
  'hrShared.leaveStatus.CANCELLED',
]);

export const HR_HALF_DAY_KEYS = keyMap<HrHalfDay>(['hrShared.halfDay.FIRST_HALF', 'hrShared.halfDay.SECOND_HALF']);

export const HR_LEAVE_ACCRUAL_KEYS = keyMap<HrLeaveAccrual>(['hrShared.accrual.YEARLY', 'hrShared.accrual.MONTHLY']);

export const HR_BANK_REQUEST_STATUS_KEYS = keyMap<HrBankRequestStatus>([
  'hrShared.bankStatus.PENDING',
  'hrShared.bankStatus.APPROVED',
  'hrShared.bankStatus.REJECTED',
  'hrShared.bankStatus.CANCELLED',
]);

export const HR_CALENDAR_EVENT_KIND_KEYS = keyMap<HrCalendarEventKind>([
  'hrShared.calendarKind.HOLIDAY',
  'hrShared.calendarKind.LEAVE',
  'hrShared.calendarKind.TEAM_LEAVE',
  'hrShared.calendarKind.PAYDAY',
  'hrShared.calendarKind.TARGET_DUE',
]);

export const HR_PAYROLL_EVENT_KEYS = keyMap<HrPayrollEventAction>([
  'hrShared.payrollEvent.CREATED',
  'hrShared.payrollEvent.RECOMPUTED',
  'hrShared.payrollEvent.ADJUSTED',
  'hrShared.payrollEvent.HELD',
  'hrShared.payrollEvent.UNHELD',
  'hrShared.payrollEvent.APPROVED',
  'hrShared.payrollEvent.RETURNED',
  'hrShared.payrollEvent.RELEASED',
  'hrShared.payrollEvent.DELETED',
  'hrShared.payrollEvent.LINE_RELEASED',
  'hrShared.payrollEvent.PAYOUT_RETRIED',
  'hrShared.payrollEvent.COMPLETED',
]);

/** A history step's label key, or null for an action this build does not know yet (shown as the server names it). */
const EVENT_KEY_BY_ACTION: ReadonlyMap<string, string> = new Map(Object.entries(HR_PAYROLL_EVENT_KEYS));
export const hrPayrollEventKey = (action: string): string | null => EVENT_KEY_BY_ACTION.get(action) ?? null;

/** The `YYYY-MM` key `by` months after (or before) `month`; the key itself when it is not a month. */
export function shiftMonthKey(month: string, by: number): string {
  const first = dateOfMonthKey(month);
  return first ? monthKeyOf(new Date(first.getFullYear(), first.getMonth() + by, 1)) : month;
}

/** Whether a salary line in this run can still be changed by HR. */
export const canEditHrPayrollRun = (status: HrPayrollRunStatus) => status === 'DRAFT';
export const canReleaseHrPayrollRun = (status: HrPayrollRunStatus) => status === 'APPROVED';
