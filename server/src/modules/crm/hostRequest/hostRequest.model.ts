import { Schema, model, Types, type Document } from 'mongoose';

export const HOST_REQUEST_STATUSES = ['REQUESTED', 'ACKNOWLEDGED', 'APPROVED', 'REJECTED'] as const;
export type HostRequestStatus = (typeof HOST_REQUEST_STATUSES)[number];

/** Status values that count as an in-flight (non-terminal) request. */
export const HOST_REQUEST_ACTIVE_STATUSES: HostRequestStatus[] = ['REQUESTED', 'ACKNOWLEDGED'];

export interface IHostRequestResponse {
  qid: string;
  value: string | null;
  values: string[];
}

export interface IHostRequestAudit {
  status: HostRequestStatus;
  by_id: string | null;
  by_name: string;
  at: Date;
  note: string;
}

export interface IHostRequest extends Document {
  request_no: string;
  host_user_id: Types.ObjectId;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  super_category_id: Types.ObjectId | null;
  category_id: Types.ObjectId | null;
  sub_category_id: Types.ObjectId | null;
  super_category_name: string;
  category_name: string;
  sub_category_name: string;
  survey_id: Types.ObjectId | null;
  responses: IHostRequestResponse[];
  status: HostRequestStatus;
  reviewer_notes: string;
  audit_log: IHostRequestAudit[];
  created_at: Date;
  updated_at: Date;
}

const responseSchema = new Schema<IHostRequestResponse>(
  {
    qid: { type: String, required: true },
    value: { type: String, default: null },
    values: { type: [String], default: [] },
  },
  { _id: false }
);

const auditSchema = new Schema<IHostRequestAudit>(
  {
    status: { type: String, enum: HOST_REQUEST_STATUSES, required: true },
    by_id: { type: String, default: null },
    by_name: { type: String, default: '' },
    at: { type: Date, default: Date.now },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const hostRequestSchema = new Schema<IHostRequest>(
  {
    request_no: { type: String, required: true, unique: true, index: true },
    host_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contact_name: { type: String, default: '' },
    contact_email: { type: String, default: '' },
    contact_phone: { type: String, default: '' },
    super_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    sub_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    super_category_name: { type: String, default: '' },
    category_name: { type: String, default: '' },
    sub_category_name: { type: String, default: '' },
    survey_id: { type: Schema.Types.ObjectId, ref: 'Survey', default: null },
    responses: { type: [responseSchema], default: [] },
    status: { type: String, enum: HOST_REQUEST_STATUSES, default: 'REQUESTED', index: true },
    reviewer_notes: { type: String, default: '' },
    audit_log: { type: [auditSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const HostRequestModel = model<IHostRequest>('HostRequest', hostRequestSchema);

// Atomic sequential counter for HOSTREQ-000001 ids (pattern: finance.nextInvoiceNumber).
interface IHostRequestCounter extends Document {
  singleton_key: string;
  seq: number;
}

const hostRequestCounterSchema = new Schema<IHostRequestCounter>({
  singleton_key: { type: String, required: true, unique: true, default: 'host_request' },
  seq: { type: Number, default: 0 },
});

export const HostRequestCounterModel = model<IHostRequestCounter>(
  'HostRequestCounter',
  hostRequestCounterSchema
);

export async function nextHostRequestNo(): Promise<string> {
  const doc = await HostRequestCounterModel.findOneAndUpdate(
    { singleton_key: 'host_request' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `HOSTREQ-${String(doc.seq).padStart(6, '0')}`;
}
