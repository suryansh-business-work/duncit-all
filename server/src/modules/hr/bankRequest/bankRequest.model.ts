import mongoose, { Schema, type Types } from 'mongoose';
import { actorSchema, type IHrActor } from '@modules/hr/employee/employee.model';

export const BANK_REQUEST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export type BankRequestStatus = (typeof BANK_REQUEST_STATUSES)[number];

export interface IBankRequestStep {
  by: IHrActor;
  at: Date;
  note: string | null;
}

/**
 * An employee asking for their salary to go to a different bank account.
 *
 * Nothing changes on the HR record until HR approves it against the proof the
 * employee uploaded — an employee switching their own salary account in one
 * step is how payroll fraud starts. The account number is sealed at rest like
 * the HR record's, and every time HR opens it is written to `views`.
 */
export interface IHrBankChangeRequest {
  _id: Types.ObjectId;
  employee_id: Types.ObjectId;
  user_id: Types.ObjectId;
  employee_name: string;
  employee_code: string;
  account_holder_name: string;
  account_number_sealed: string;
  account_last4: string;
  ifsc: string;
  bank_name: string | null;
  /** A private upload in the employee's own folder; opened only through a short-lived signed link. */
  proof_url: string;
  proof_kind: 'IMAGE' | 'PDF';
  note: string | null;
  status: BankRequestStatus;
  decision: IBankRequestStep | null;
  views: { by: IHrActor; at: Date }[];
  client_request_id: string | null;
  created_at: Date;
  updated_at: Date;
}

const stepSchema = new Schema<IBankRequestStep>(
  { by: { type: actorSchema, required: true }, at: { type: Date, required: true }, note: { type: String, default: null } },
  { _id: false }
);

const requestSchema = new Schema<IHrBankChangeRequest>(
  {
    employee_id: { type: Schema.Types.ObjectId, ref: 'HrEmployee', required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    employee_name: { type: String, default: '' },
    employee_code: { type: String, default: '' },
    account_holder_name: { type: String, required: true, trim: true },
    account_number_sealed: { type: String, required: true },
    account_last4: { type: String, required: true },
    ifsc: { type: String, required: true, uppercase: true },
    bank_name: { type: String, default: null },
    proof_url: { type: String, required: true },
    proof_kind: { type: String, enum: ['IMAGE', 'PDF'], required: true },
    note: { type: String, default: null },
    status: { type: String, enum: BANK_REQUEST_STATUSES, default: 'PENDING' },
    decision: { type: stepSchema, default: null },
    views: { type: [{ by: actorSchema, at: Date, _id: false }], default: [] },
    client_request_id: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'hr_bank_change_requests' }
);
// One change waiting per employee: a second one would leave HR guessing which is meant.
requestSchema.index({ employee_id: 1 }, { unique: true, partialFilterExpression: { status: 'PENDING' } });
requestSchema.index({ employee_id: 1, created_at: -1 });
requestSchema.index({ status: 1, created_at: -1 });
requestSchema.index(
  { user_id: 1, client_request_id: 1 },
  { unique: true, partialFilterExpression: { client_request_id: { $type: 'string' } } }
);

export const HrBankChangeRequestModel =
  (mongoose.models.HrBankChangeRequest as mongoose.Model<IHrBankChangeRequest>) ||
  mongoose.model<IHrBankChangeRequest>('HrBankChangeRequest', requestSchema);
