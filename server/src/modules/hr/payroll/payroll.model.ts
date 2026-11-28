import mongoose, { Schema, type Types } from 'mongoose';
import { makeAppendOnly } from '@utils/appendOnly';
import { payoutStateSchema, type IPayoutState } from '@modules/finance/payout/payout.model';

/**
 * A month's payroll: one run, one line per person paid in it.
 *
 * DRAFT     — computed from the pay in force, unpaid leave and reviewed targets;
 *             HR adjusts, holds and recomputes it.
 * APPROVED  — HR signed it off; numbers frozen. HR or Finance can send it back.
 * RELEASED  — Finance released it, now or for a pay date; payslips are visible
 *             and each line's payout runs through RazorpayX on that date.
 * COMPLETED — every line that is paid through Razorpay is paid.
 *
 * The approval and the release are two different people: money leaves only
 * when HR and Finance have both said yes.
 */
export const PAYROLL_RUN_STATUSES = ['DRAFT', 'APPROVED', 'RELEASED', 'COMPLETED'] as const;
export type PayrollRunStatus = (typeof PAYROLL_RUN_STATUSES)[number];

export const PAYROLL_ISSUES = [
  /** No pay revision in force during the month: nothing to pay. */
  'NO_COMPENSATION',
  /** No usable bank account on the HR record. */
  'NO_BANK',
  /** Deductions are larger than earnings. */
  'NEGATIVE_NET',
  /** RazorpayX pays rupees only. */
  'UNSUPPORTED_CURRENCY',
  /** Leave in the month is still waiting for a decision — unpaid leave may change the pay. */
  'PENDING_LEAVE',
  /** A target-linked line whose month is not reviewed yet: that pay waits for a later run. */
  'TARGET_NOT_REVIEWED',
] as const;
export type PayrollIssue = (typeof PAYROLL_ISSUES)[number];

/** The issues that stop a line being paid until they are fixed or the line is held. */
export const BLOCKING_ISSUES: readonly PayrollIssue[] = ['NO_COMPENSATION', 'NO_BANK', 'NEGATIVE_NET', 'UNSUPPORTED_CURRENCY'];

/** Somebody who acted — or the scheduler, which has no account (`user_id` null). */
export interface IPayrollActor {
  user_id: Types.ObjectId | null;
  name: string;
}

const actorSchema = new Schema<IPayrollActor>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, default: '' },
  },
  { _id: false }
);

export interface IPayrollStep {
  by: IPayrollActor;
  at: Date;
  note: string | null;
}

const stepSchema = new Schema<IPayrollStep>(
  { by: { type: actorSchema, required: true }, at: { type: Date, required: true }, note: { type: String, default: null } },
  { _id: false }
);

export interface IPayrollTotals {
  employees: number;
  held: number;
  gross_paise: number;
  deductions_paise: number;
  net_paise: number;
  employer_paise: number;
}

const totalsSchema = new Schema<IPayrollTotals>(
  {
    employees: { type: Number, default: 0 },
    held: { type: Number, default: 0 },
    gross_paise: { type: Number, default: 0 },
    deductions_paise: { type: Number, default: 0 },
    net_paise: { type: Number, default: 0 },
    employer_paise: { type: Number, default: 0 },
  },
  { _id: false }
);

export interface IPayrollRun {
  _id: Types.ObjectId;
  /** `YYYY-MM`. */
  month: string;
  status: PayrollRunStatus;
  /** The pay date from the payroll settings when the run was made; Finance picks the final one. */
  scheduled_pay_date: string;
  /** The day Finance released it for. Payouts start on this day. */
  pay_on: string | null;
  source: 'SCHEDULER' | 'MANUAL';
  totals: IPayrollTotals;
  computed_at: Date;
  computed_by: IPayrollActor;
  approved: IPayrollStep | null;
  released: IPayrollStep | null;
  /** The last time the run was sent back to draft, and why. */
  returned: IPayrollStep | null;
  /** True until a draft is deleted; only live runs count for the one-run-per-month rule. */
  live: boolean;
  revision: number;
  created_by: IPayrollActor;
  created_at: Date;
  updated_at: Date;
}

const runSchema = new Schema<IPayrollRun>(
  {
    month: { type: String, required: true },
    status: { type: String, enum: PAYROLL_RUN_STATUSES, default: 'DRAFT' },
    scheduled_pay_date: { type: String, required: true },
    pay_on: { type: String, default: null },
    source: { type: String, enum: ['SCHEDULER', 'MANUAL'], required: true },
    totals: { type: totalsSchema, default: () => ({}) },
    computed_at: { type: Date, required: true },
    computed_by: { type: actorSchema, required: true },
    approved: { type: stepSchema, default: null },
    released: { type: stepSchema, default: null },
    returned: { type: stepSchema, default: null },
    live: { type: Boolean, default: true },
    revision: { type: Number, default: 0 },
    created_by: { type: actorSchema, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'hr_payroll_runs' }
);
// One live run per month: the scheduler and a person pressing Create at once cannot make two.
runSchema.index({ month: 1 }, { unique: true, partialFilterExpression: { live: true } });
runSchema.index({ live: 1, month: -1 });
// The scheduler's sweep for released runs whose pay day has come.
runSchema.index({ live: 1, status: 1, pay_on: 1 });

export const HrPayrollRunModel =
  (mongoose.models.HrPayrollRun as mongoose.Model<IPayrollRun>) || mongoose.model<IPayrollRun>('HrPayrollRun', runSchema);

// --- Lines -------------------------------------------------------------------

export interface IPayrollAmount {
  label: string;
  /** The full monthly figure on the pay revision. */
  monthly_paise: number;
  /** What this month pays after joining, exit and unpaid leave. */
  amount_paise: number;
}

const amountSchema = new Schema<IPayrollAmount>(
  { label: { type: String, required: true }, monthly_paise: { type: Number, required: true }, amount_paise: { type: Number, required: true } },
  { _id: false }
);

/** Target-linked pay for one reviewed month. */
export interface IPayrollVariable {
  target_id: Types.ObjectId;
  target_month: string;
  label: string;
  /** The target-linked pay that month earned at 100%. */
  base_paise: number;
  completion_percent: number;
  amount_paise: number;
}

const variableSchema = new Schema<IPayrollVariable>(
  {
    target_id: { type: Schema.Types.ObjectId, required: true },
    target_month: { type: String, required: true },
    label: { type: String, required: true },
    base_paise: { type: Number, required: true },
    completion_percent: { type: Number, required: true },
    amount_paise: { type: Number, required: true },
  },
  { _id: false }
);

export interface IPayrollAdjustment {
  _id: Types.ObjectId;
  label: string;
  type: 'EARNING' | 'DEDUCTION';
  amount_paise: number;
  note: string | null;
  by: IPayrollActor;
  at: Date;
}

const adjustmentSchema = new Schema<IPayrollAdjustment>({
  label: { type: String, required: true, trim: true },
  type: { type: String, enum: ['EARNING', 'DEDUCTION'], required: true },
  amount_paise: { type: Number, required: true, min: 1 },
  note: { type: String, default: null },
  by: { type: actorSchema, required: true },
  at: { type: Date, required: true },
});

/** The account the salary goes to, sealed, copied from the HR record when Finance releases. */
export interface IPayrollBank {
  account_holder_name: string;
  account_number_sealed: string;
  account_last4: string;
  ifsc: string;
  bank_name: string | null;
}

const bankSchema = new Schema<IPayrollBank>(
  {
    account_holder_name: { type: String, required: true },
    account_number_sealed: { type: String, required: true },
    account_last4: { type: String, required: true },
    ifsc: { type: String, required: true },
    bank_name: { type: String, default: null },
  },
  { _id: false }
);

export interface IPayrollLine {
  _id: Types.ObjectId;
  run_id: Types.ObjectId;
  month: string;
  /** `pr_…` — the payout's Razorpay reference, which is how its webhook finds this line. */
  line_ref: string;
  employee_id: Types.ObjectId;
  user_id: Types.ObjectId;
  employee: {
    name: string;
    code: string;
    email: string | null;
    job_title: string;
    department: string | null;
    date_of_joining: string;
    last_working_day: string | null;
  };
  currency: string;
  compensation_id: Types.ObjectId | null;
  days_in_month: number;
  payable_days: number;
  lop_days: number;
  earnings: IPayrollAmount[];
  variable: IPayrollVariable[];
  deductions: IPayrollAmount[];
  employer: IPayrollAmount[];
  adjustments: IPayrollAdjustment[];
  gross_paise: number;
  deductions_paise: number;
  net_paise: number;
  employer_paise: number;
  issues: PayrollIssue[];
  hold: IPayrollStep | null;
  bank: IPayrollBank | null;
  payout: IPayoutState | null;
  /** True once the run is released: the employee can see this payslip. */
  published: boolean;
  created_at: Date;
  updated_at: Date;
}

const lineSchema = new Schema<IPayrollLine>(
  {
    run_id: { type: Schema.Types.ObjectId, ref: 'HrPayrollRun', required: true },
    month: { type: String, required: true },
    line_ref: { type: String, required: true },
    employee_id: { type: Schema.Types.ObjectId, ref: 'HrEmployee', required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    employee: {
      name: { type: String, default: '' },
      code: { type: String, default: '' },
      email: { type: String, default: null },
      job_title: { type: String, default: '' },
      department: { type: String, default: null },
      date_of_joining: { type: String, default: '' },
      last_working_day: { type: String, default: null },
    },
    currency: { type: String, required: true },
    compensation_id: { type: Schema.Types.ObjectId, ref: 'HrCompensation', default: null },
    days_in_month: { type: Number, required: true },
    payable_days: { type: Number, required: true },
    lop_days: { type: Number, default: 0 },
    earnings: { type: [amountSchema], default: [] },
    variable: { type: [variableSchema], default: [] },
    deductions: { type: [amountSchema], default: [] },
    employer: { type: [amountSchema], default: [] },
    adjustments: { type: [adjustmentSchema], default: [] },
    gross_paise: { type: Number, required: true },
    deductions_paise: { type: Number, required: true },
    net_paise: { type: Number, required: true },
    employer_paise: { type: Number, required: true },
    issues: { type: [String], default: [] },
    hold: { type: stepSchema, default: null },
    bank: { type: bankSchema, default: null },
    payout: { type: payoutStateSchema, default: null },
    published: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'hr_payroll_lines' }
);
lineSchema.index({ run_id: 1, employee_id: 1 }, { unique: true });
lineSchema.index({ line_ref: 1 }, { unique: true });
// The employee's payslips, newest first.
lineSchema.index({ user_id: 1, published: 1, month: -1 });
// The scheduler's sweep for payouts still in flight.
lineSchema.index({ 'payout.status': 1, 'payout.initiated_at': 1 });

export const HrPayrollLineModel =
  (mongoose.models.HrPayrollLine as mongoose.Model<IPayrollLine>) || mongoose.model<IPayrollLine>('HrPayrollLine', lineSchema);

// --- Variable-pay claims -----------------------------------------------------

/**
 * One reviewed target's variable pay, taken by the run that pays it. The
 * unique index means two runs can never both pay the same month's target;
 * the claim is written when a run is approved and dropped if it goes back to
 * draft.
 */
export interface IPayrollVariableClaim {
  target_id: Types.ObjectId;
  run_id: Types.ObjectId;
  line_id: Types.ObjectId;
  employee_id: Types.ObjectId;
  created_at: Date;
}

const claimSchema = new Schema<IPayrollVariableClaim>(
  {
    target_id: { type: Schema.Types.ObjectId, required: true },
    run_id: { type: Schema.Types.ObjectId, required: true, index: true },
    line_id: { type: Schema.Types.ObjectId, required: true },
    employee_id: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, collection: 'hr_payroll_variable_claims' }
);
claimSchema.index({ target_id: 1 }, { unique: true });

export const HrPayrollVariableClaimModel =
  (mongoose.models.HrPayrollVariableClaim as mongoose.Model<IPayrollVariableClaim>) ||
  mongoose.model<IPayrollVariableClaim>('HrPayrollVariableClaim', claimSchema);

// --- Run history -------------------------------------------------------------

export const PAYROLL_EVENT_ACTIONS = [
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
export type PayrollEventAction = (typeof PAYROLL_EVENT_ACTIONS)[number];

export interface IPayrollEvent {
  run_id: Types.ObjectId;
  line_id: Types.ObjectId | null;
  action: PayrollEventAction;
  actor: IPayrollActor;
  note: string | null;
  /** Small, non-sensitive detail: an amount, an employee code. Never a bank number. */
  detail: Record<string, unknown>;
  created_at: Date;
}

const eventSchema = new Schema<IPayrollEvent>(
  {
    run_id: { type: Schema.Types.ObjectId, required: true },
    line_id: { type: Schema.Types.ObjectId, default: null },
    action: { type: String, enum: PAYROLL_EVENT_ACTIONS, required: true },
    actor: { type: actorSchema, required: true },
    note: { type: String, default: null },
    detail: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, collection: 'hr_payroll_events' }
);
eventSchema.index({ run_id: 1, created_at: -1 });

makeAppendOnly(eventSchema, 'Payroll history is append-only and cannot be changed or removed.');

export const HrPayrollEventModel =
  (mongoose.models.HrPayrollEvent as mongoose.Model<IPayrollEvent>) || mongoose.model<IPayrollEvent>('HrPayrollEvent', eventSchema);

/**
 * The months among `months` whose payroll is past DRAFT. Unpaid leave in those
 * months can no longer change, because the pay it would deduct is signed off.
 */
export async function lockedPayrollMonths(months: readonly string[]): Promise<string[]> {
  if (months.length === 0) return [];
  const runs = await HrPayrollRunModel.find({ live: true, month: { $in: [...months] }, status: { $ne: 'DRAFT' } })
    .select('month')
    .lean<Pick<IPayrollRun, 'month'>[]>();
  return runs.map((run) => run.month);
}
