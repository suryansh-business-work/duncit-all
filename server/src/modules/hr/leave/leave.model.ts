import mongoose, { Schema, type Types } from 'mongoose';
import { makeAppendOnly } from '@utils/appendOnly';
import { actorSchema, type IHrActor } from '@modules/hr/employee/employee.model';
import { HR_HALF_DAYS, HR_LEAVE_ACCRUALS, HR_LEAVE_STATUSES, type HrHalfDay, type HrLeaveAccrual, type HrLeaveStatus } from './leave.rules';

// --- Leave types -------------------------------------------------------------

/** A kind of leave HR offers (Casual, Sick, Unpaid…). Never deleted once used: switched off instead. */
export interface IHrLeaveType {
  _id: Types.ObjectId;
  name: string;
  code: string;
  /** False for unpaid leave: no balance to spend, and payroll deducts its days. */
  paid: boolean;
  annual_quota: number;
  accrual: HrLeaveAccrual;
  carry_forward_max: number;
  allow_half_day: boolean;
  active: boolean;
  updated_by: IHrActor;
  created_at: Date;
  updated_at: Date;
}

const leaveTypeSchema = new Schema<IHrLeaveType>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    paid: { type: Boolean, required: true },
    annual_quota: { type: Number, default: 0, min: 0 },
    accrual: { type: String, enum: HR_LEAVE_ACCRUALS, required: true },
    carry_forward_max: { type: Number, default: 0, min: 0 },
    allow_half_day: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    updated_by: { type: actorSchema, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'hr_leave_types' }
);
leaveTypeSchema.index({ code: 1 }, { unique: true });

export const HrLeaveTypeModel =
  (mongoose.models.HrLeaveType as mongoose.Model<IHrLeaveType>) || mongoose.model<IHrLeaveType>('HrLeaveType', leaveTypeSchema);

// --- Requests ----------------------------------------------------------------

export interface IHrLeaveDecision {
  by: IHrActor;
  at: Date;
  note: string | null;
  /** True when HR decided rather than the reporting manager. */
  as_hr: boolean;
}

export interface IHrLeaveRequest {
  _id: Types.ObjectId;
  employee_id: Types.ObjectId;
  /** The employee's account, so the Employee console reads its own rows by session. */
  user_id: Types.ObjectId;
  employee_name: string;
  employee_code: string;
  leave_type_id: Types.ObjectId;
  /** As the type was named when asked, so a renamed type does not rewrite history. */
  leave_type_name: string;
  leave_type_paid: boolean;
  start_date: string;
  end_date: string;
  half_day: HrHalfDay | null;
  /** Working days the request costs, weekly offs and holidays left out. */
  days: number;
  /** The per-date cost, so payroll can count a month's share of a request that spans two. */
  day_breakdown: { date: string; days: number }[];
  reason: string | null;
  status: HrLeaveStatus;
  /** The reporting manager (HR record id) when the request was made; null means HR decides. */
  approver_employee_id: Types.ObjectId | null;
  decision: IHrLeaveDecision | null;
  cancellation: IHrLeaveDecision | null;
  client_request_id: string | null;
  created_by: IHrActor;
  created_at: Date;
  updated_at: Date;
}

const decisionSchema = new Schema<IHrLeaveDecision>(
  {
    by: { type: actorSchema, required: true },
    at: { type: Date, required: true },
    note: { type: String, default: null },
    as_hr: { type: Boolean, default: false },
  },
  { _id: false }
);

const leaveRequestSchema = new Schema<IHrLeaveRequest>(
  {
    employee_id: { type: Schema.Types.ObjectId, ref: 'HrEmployee', required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    employee_name: { type: String, default: '' },
    employee_code: { type: String, default: '' },
    leave_type_id: { type: Schema.Types.ObjectId, ref: 'HrLeaveType', required: true },
    leave_type_name: { type: String, default: '' },
    leave_type_paid: { type: Boolean, required: true },
    start_date: { type: String, required: true },
    end_date: { type: String, required: true },
    half_day: { type: String, enum: [...HR_HALF_DAYS, null], default: null },
    days: { type: Number, required: true, min: 0 },
    day_breakdown: { type: [{ date: String, days: Number, _id: false }], default: [] },
    reason: { type: String, default: null },
    status: { type: String, enum: HR_LEAVE_STATUSES, default: 'PENDING' },
    approver_employee_id: { type: Schema.Types.ObjectId, ref: 'HrEmployee', default: null },
    decision: { type: decisionSchema, default: null },
    cancellation: { type: decisionSchema, default: null },
    client_request_id: { type: String, default: null },
    created_by: { type: actorSchema, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'hr_leave_requests' }
);
// The employee's own list and their balance sums.
leaveRequestSchema.index({ employee_id: 1, status: 1, start_date: -1 });
leaveRequestSchema.index({ user_id: 1, start_date: -1 });
// A manager's queue.
leaveRequestSchema.index({ approver_employee_id: 1, status: 1, start_date: 1 });
// HR's table and the calendar's month window.
leaveRequestSchema.index({ status: 1, start_date: 1, end_date: 1 });
// A second press of the same Apply returns the first request.
leaveRequestSchema.index(
  { user_id: 1, client_request_id: 1 },
  { unique: true, partialFilterExpression: { client_request_id: { $type: 'string' } } }
);

export const HrLeaveRequestModel =
  (mongoose.models.HrLeaveRequest as mongoose.Model<IHrLeaveRequest>) ||
  mongoose.model<IHrLeaveRequest>('HrLeaveRequest', leaveRequestSchema);

// --- Day claims --------------------------------------------------------------

/**
 * One half of one date held by a live (pending or approved) request. The
 * unique index is the overlap guard: two requests racing for the same morning
 * cannot both be written, whatever order the checks ran in.
 */
export interface IHrLeaveDayClaim {
  employee_id: Types.ObjectId;
  date: string;
  part: 'AM' | 'PM';
  request_id: Types.ObjectId;
}

const dayClaimSchema = new Schema<IHrLeaveDayClaim>(
  {
    employee_id: { type: Schema.Types.ObjectId, required: true },
    date: { type: String, required: true },
    part: { type: String, enum: ['AM', 'PM'], required: true },
    request_id: { type: Schema.Types.ObjectId, required: true, index: true },
  },
  { collection: 'hr_leave_day_claims', versionKey: false }
);
dayClaimSchema.index({ employee_id: 1, date: 1, part: 1 }, { unique: true });

export const HrLeaveDayClaimModel =
  (mongoose.models.HrLeaveDayClaim as mongoose.Model<IHrLeaveDayClaim>) ||
  mongoose.model<IHrLeaveDayClaim>('HrLeaveDayClaim', dayClaimSchema);

// --- Balance adjustments -----------------------------------------------------

/** HR's hand change to a balance: opening balances, encashment, a correction. Append-only. */
export interface IHrLeaveAdjustment {
  _id: Types.ObjectId;
  employee_id: Types.ObjectId;
  leave_type_id: Types.ObjectId;
  leave_year: number;
  days: number;
  note: string;
  actor: IHrActor;
  created_at: Date;
}

const adjustmentSchema = new Schema<IHrLeaveAdjustment>(
  {
    employee_id: { type: Schema.Types.ObjectId, ref: 'HrEmployee', required: true },
    leave_type_id: { type: Schema.Types.ObjectId, ref: 'HrLeaveType', required: true },
    leave_year: { type: Number, required: true },
    days: { type: Number, required: true },
    note: { type: String, required: true },
    actor: { type: actorSchema, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, collection: 'hr_leave_adjustments' }
);
adjustmentSchema.index({ employee_id: 1, leave_year: 1 });

makeAppendOnly(adjustmentSchema, 'Leave balance adjustments are append-only. Add a new adjustment to correct one.');

export const HrLeaveAdjustmentModel =
  (mongoose.models.HrLeaveAdjustment as mongoose.Model<IHrLeaveAdjustment>) ||
  mongoose.model<IHrLeaveAdjustment>('HrLeaveAdjustment', adjustmentSchema);
