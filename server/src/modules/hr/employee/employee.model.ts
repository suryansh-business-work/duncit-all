import mongoose, { Schema, type Types } from 'mongoose';
import {
  HR_EMPLOYEE_STATUSES,
  HR_EMPLOYMENT_TYPES,
  HR_EXIT_TYPES,
  HR_GENDERS,
  type HrEmployeeStatus,
  type HrEmploymentType,
  type HrExitType,
} from './employee.rules';

/** Somebody who acted on a record, as they were named when they acted. */
export interface IHrActor {
  user_id: Types.ObjectId;
  name: string;
}

export interface IHrEmergencyContact {
  name: string;
  relation: string | null;
  phone_number: string;
  phone_extension: string;
}

export interface IHrPersonal {
  first_name: string;
  last_name: string;
  gender: (typeof HR_GENDERS)[number] | null;
  /** `YYYY-MM-DD`. */
  date_of_birth: string | null;
  personal_email: string | null;
  phone_number: string | null;
  phone_extension: string | null;
  current_address: string | null;
  permanent_address: string | null;
  emergency_contact: IHrEmergencyContact | null;
}

export interface IHrJob {
  job_title: string;
  department: string | null;
  work_location: string | null;
  /** The HR record (not the account) of the person this one reports to. */
  manager_id: Types.ObjectId | null;
  employment_type: HrEmploymentType;
  date_of_joining: string;
  probation_end_date: string | null;
  notice_period_days: number;
  work_email: string | null;
}

/**
 * Bank and statutory identifiers. The account number and PAN are sealed at
 * rest; only their last four characters are kept readable, and every reveal
 * of the full values is written to the worker history.
 */
export interface IHrBank {
  account_holder_name: string | null;
  account_number_sealed: string | null;
  account_last4: string | null;
  ifsc: string | null;
  bank_name: string | null;
  pan_sealed: string | null;
  pan_last4: string | null;
  uan: string | null;
}

export interface IHrExit {
  exit_type: HrExitType;
  resignation_date: string | null;
  last_working_day: string;
  reason: string | null;
  eligible_for_rehire: boolean;
  recorded_by: IHrActor;
  recorded_at: Date;
}

export interface IHrEmployee {
  _id: Types.ObjectId;
  /** The Duncit account this person signs in with — one HR record per account, for life. */
  user_id: Types.ObjectId;
  employee_code: string;
  status: HrEmployeeStatus;
  personal: IHrPersonal;
  job: IHrJob;
  bank: IHrBank;
  exit: IHrExit | null;
  /** Bumped by every write; a write names the revision it was made against. */
  revision: number;
  /** The console's id for one press of Hire — a repeated press returns the first record. */
  client_request_id: string | null;
  created_by: IHrActor;
  updated_by: IHrActor | null;
  created_at: Date;
  updated_at: Date;
}

export const actorSchema = new Schema<IHrActor>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, default: '' },
  },
  { _id: false }
);

const emergencySchema = new Schema<IHrEmergencyContact>(
  {
    name: { type: String, required: true },
    relation: { type: String, default: null },
    phone_number: { type: String, required: true },
    phone_extension: { type: String, required: true },
  },
  { _id: false }
);

const personalSchema = new Schema<IHrPersonal>(
  {
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },
    gender: { type: String, enum: [...HR_GENDERS, null], default: null },
    date_of_birth: { type: String, default: null },
    personal_email: { type: String, default: null },
    phone_number: { type: String, default: null },
    phone_extension: { type: String, default: null },
    current_address: { type: String, default: null },
    permanent_address: { type: String, default: null },
    emergency_contact: { type: emergencySchema, default: null },
  },
  { _id: false }
);

const jobSchema = new Schema<IHrJob>(
  {
    job_title: { type: String, required: true, trim: true },
    department: { type: String, default: null },
    work_location: { type: String, default: null },
    manager_id: { type: Schema.Types.ObjectId, ref: 'HrEmployee', default: null },
    employment_type: { type: String, enum: HR_EMPLOYMENT_TYPES, required: true },
    date_of_joining: { type: String, required: true },
    probation_end_date: { type: String, default: null },
    notice_period_days: { type: Number, default: 0, min: 0 },
    work_email: { type: String, default: null },
  },
  { _id: false }
);

const bankSchema = new Schema<IHrBank>(
  {
    account_holder_name: { type: String, default: null },
    account_number_sealed: { type: String, default: null },
    account_last4: { type: String, default: null },
    ifsc: { type: String, default: null },
    bank_name: { type: String, default: null },
    pan_sealed: { type: String, default: null },
    pan_last4: { type: String, default: null },
    uan: { type: String, default: null },
  },
  { _id: false }
);

const exitSchema = new Schema<IHrExit>(
  {
    exit_type: { type: String, enum: HR_EXIT_TYPES, required: true },
    resignation_date: { type: String, default: null },
    last_working_day: { type: String, required: true },
    reason: { type: String, default: null },
    eligible_for_rehire: { type: Boolean, default: true },
    recorded_by: { type: actorSchema, required: true },
    recorded_at: { type: Date, required: true },
  },
  { _id: false }
);

/**
 * One person's employment record, kept by the HR console. Exiting never
 * deletes it: the record, its pay history and its worker history stay, and a
 * rehire reopens the same record.
 */
const employeeSchema = new Schema<IHrEmployee>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    employee_code: { type: String, required: true, trim: true, uppercase: true },
    status: { type: String, enum: HR_EMPLOYEE_STATUSES, default: 'ACTIVE' },
    personal: { type: personalSchema, required: true },
    job: { type: jobSchema, required: true },
    bank: { type: bankSchema, default: () => ({}) },
    exit: { type: exitSchema, default: null },
    revision: { type: Number, default: 0 },
    client_request_id: { type: String, default: null },
    created_by: { type: actorSchema, required: true },
    updated_by: { type: actorSchema, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'hr_employees' }
);

// One HR record per account, ever; one record per code.
employeeSchema.index({ user_id: 1 }, { unique: true });
employeeSchema.index({ employee_code: 1 }, { unique: true });
// The directory: newest joiners first inside a status.
employeeSchema.index({ status: 1, 'job.date_of_joining': -1 });
employeeSchema.index({ 'job.department': 1, status: 1 });
// Direct reports of a manager.
employeeSchema.index({ 'job.manager_id': 1 });
// The exit sweep: notice served, last day passed.
employeeSchema.index({ status: 1, 'exit.last_working_day': 1 });
// A second press of the same Hire finds the first record.
employeeSchema.index(
  { 'created_by.user_id': 1, client_request_id: 1 },
  { unique: true, partialFilterExpression: { client_request_id: { $type: 'string' } } }
);

export const HrEmployeeModel =
  (mongoose.models.HrEmployee as mongoose.Model<IHrEmployee>) ||
  mongoose.model<IHrEmployee>('HrEmployee', employeeSchema);
