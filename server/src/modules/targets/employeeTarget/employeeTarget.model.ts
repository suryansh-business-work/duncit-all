import mongoose, { Schema, type Types } from 'mongoose';
import { EMPLOYEE_TARGET_STATUSES, type EmployeeTargetStatus } from './employeeTarget.rules';

/** A person as the record names them, as they were when the record was written. */
export interface ITargetPerson {
  user_id: Types.ObjectId;
  name: string;
  email: string | null;
}

export interface ITargetGoal {
  title: string;
  description: string;
  target_value: number | null;
  unit: string;
}

export interface ITargetAchievement {
  title: string;
  details: string;
}

export interface ITargetSubmission {
  completion_percent: number;
  achievements: ITargetAchievement[];
  updates: string;
  submitted_at: Date;
  submitted_by: Types.ObjectId;
  /** How many times the employee has sent it — 1 on the first submit. */
  submission_count: number;
}

export interface ITargetReview {
  comment: string;
  reviewed_by: ITargetPerson;
  reviewed_at: Date;
}

export interface IEmployeeTarget {
  _id: Types.ObjectId;
  employee: ITargetPerson;
  /** `YYYY-MM`, the month the goals are for. */
  month: string;
  goals: ITargetGoal[];
  notes: string;
  status: EmployeeTargetStatus;
  submission: ITargetSubmission | null;
  review: ITargetReview | null;
  /** The last app-zone day (`YYYY-MM-DD`) a reminder went out, and how many have. */
  reminders: { last_sent_on: string | null; count: number };
  /** Bumped by every write; a write names the revision it was made against. */
  revision: number;
  assigned_by: ITargetPerson;
  last_edited_by: ITargetPerson | null;
  last_edited_at: Date | null;
  /** The browser's id for one press of Assign — a repeated press returns the first record. */
  client_request_id: string | null;
  /** True until deleted. The one-per-employee-per-month index only counts live rows. */
  live: boolean;
  deleted_at: Date | null;
  deleted_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const personSchema = new Schema<ITargetPerson>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, default: '' },
    email: { type: String, default: null },
  },
  { _id: false }
);

const goalSchema = new Schema<ITargetGoal>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    target_value: { type: Number, default: null },
    unit: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const achievementSchema = new Schema<ITargetAchievement>(
  {
    title: { type: String, required: true, trim: true },
    details: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const submissionSchema = new Schema<ITargetSubmission>(
  {
    completion_percent: { type: Number, required: true, min: 0, max: 100 },
    achievements: { type: [achievementSchema], default: [] },
    updates: { type: String, default: '' },
    submitted_at: { type: Date, required: true },
    submitted_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    submission_count: { type: Number, default: 1 },
  },
  { _id: false }
);

const reviewSchema = new Schema<ITargetReview>(
  {
    comment: { type: String, default: '' },
    reviewed_by: { type: personSchema, required: true },
    reviewed_at: { type: Date, required: true },
  },
  { _id: false }
);

/**
 * One employee's goals for one month, set on the Targets console, and what the
 * employee reported against them from the Employee console. Exactly one live
 * record per (employee, month); Delete only stamps it, so a reviewed month
 * stays readable in the history.
 */
const employeeTargetSchema = new Schema<IEmployeeTarget>(
  {
    employee: { type: personSchema, required: true },
    month: { type: String, required: true },
    goals: { type: [goalSchema], default: [] },
    notes: { type: String, default: '' },
    status: { type: String, enum: EMPLOYEE_TARGET_STATUSES, default: 'ASSIGNED' },
    submission: { type: submissionSchema, default: null },
    review: { type: reviewSchema, default: null },
    reminders: {
      last_sent_on: { type: String, default: null },
      count: { type: Number, default: 0 },
    },
    revision: { type: Number, default: 0 },
    assigned_by: { type: personSchema, required: true },
    last_edited_by: { type: personSchema, default: null },
    last_edited_at: { type: Date, default: null },
    client_request_id: { type: String, default: null },
    live: { type: Boolean, default: true },
    deleted_at: { type: Date, default: null },
    deleted_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'employee_targets' }
);

// The console's listing and the employee's own list: live rows, newest month first.
employeeTargetSchema.index({ live: 1, month: -1, created_at: -1 });
employeeTargetSchema.index({ 'employee.user_id': 1, live: 1, month: -1 });
// One live target per employee per month — a second Assign is refused, never a twin.
employeeTargetSchema.index(
  { 'employee.user_id': 1, month: 1 },
  { unique: true, partialFilterExpression: { live: true } }
);
// A second press of the same Assign finds the first record.
employeeTargetSchema.index(
  { 'assigned_by.user_id': 1, client_request_id: 1 },
  { unique: true, partialFilterExpression: { client_request_id: { $type: 'string' } } }
);
// The reminder sweep: live, still unsubmitted, in the months now due.
employeeTargetSchema.index({ live: 1, status: 1, month: 1 });

export const EmployeeTargetModel =
  (mongoose.models.EmployeeTarget as mongoose.Model<IEmployeeTarget>) ||
  mongoose.model<IEmployeeTarget>('EmployeeTarget', employeeTargetSchema);
