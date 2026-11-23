import { Schema, model, type Types } from 'mongoose';

/**
 * A write the assistant proposed and a person must approve before it runs: a
 * MongoDB insert/update/delete or an MCP tool classed WRITE or DESTRUCTIVE.
 *
 * The state only moves forward (PENDING → EXECUTING → EXECUTED | FAILED, or
 * PENDING → REJECTED | EXPIRED), each step a compare-and-set, so a double
 * click, two approvers or a retry can never run the write twice.
 */

export const APPROVAL_STATUSES = ['PENDING', 'EXECUTING', 'EXECUTED', 'FAILED', 'REJECTED', 'EXPIRED'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];
export type ApprovalKind = 'MONGO_WRITE' | 'MCP_CALL';

export interface IIntelApproval {
  _id: Types.ObjectId;
  kind: ApprovalKind;
  status: ApprovalStatus;
  requested_by: Types.ObjectId;
  requester_level: string;
  conversation_id: string;
  message_id: string;
  connector_id: string;
  connector_name: string;
  environment: string;
  database: string;
  /** `collection` is a reserved Mongoose path, hence the longer name. */
  target_collection: string;
  action: string;
  tool_class: string;
  /** The exact request that will run, as JSON. Never edited after creation. */
  request: string;
  /** What an approver sees: matched count, before/after documents, as JSON. */
  preview: string;
  impact: string;
  reason: string;
  four_eyes: boolean;
  decided_by: Types.ObjectId | null;
  decided_at: Date | null;
  decision_note: string;
  result: string;
  error: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

const intelApprovalSchema = new Schema<IIntelApproval>(
  {
    kind: { type: String, enum: ['MONGO_WRITE', 'MCP_CALL'], required: true },
    status: { type: String, enum: APPROVAL_STATUSES, default: 'PENDING', index: true },
    requested_by: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requester_level: { type: String, default: '' },
    conversation_id: { type: String, default: '' },
    message_id: { type: String, default: '' },
    connector_id: { type: String, required: true },
    connector_name: { type: String, default: '' },
    environment: { type: String, required: true, index: true },
    database: { type: String, default: '' },
    target_collection: { type: String, default: '' },
    action: { type: String, required: true },
    tool_class: { type: String, default: 'WRITE' },
    request: { type: String, required: true },
    preview: { type: String, default: '{}' },
    impact: { type: String, default: '' },
    reason: { type: String, default: '' },
    four_eyes: { type: Boolean, default: false },
    decided_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decided_at: { type: Date, default: null },
    decision_note: { type: String, default: '' },
    result: { type: String, default: '' },
    error: { type: String, default: '' },
    expires_at: { type: Date, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

intelApprovalSchema.index({ status: 1, created_at: -1 });

export const IntelApprovalModel = model<IIntelApproval>('IntelApproval', intelApprovalSchema, 'intel_approvals');
