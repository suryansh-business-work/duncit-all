import { Schema, model, type Types } from 'mongoose';

/**
 * Something the assistant wants to change, waiting for — or past — the
 * person's decision. The model can only PROPOSE: the row is created by the
 * server when a tool needs approval, and it runs only when the person approves
 * it through `decideAskDuncitAction`, which re-checks their permission at that
 * moment. Status moves forward only, by atomic compare-and-set, so a double tap
 * or a retried request can never run the same action twice.
 *
 *   PENDING → APPROVED → EXECUTING → EXECUTED | FAILED
 *   PENDING → REJECTED | EXPIRED
 *   EXECUTED → ROLLED_BACK (where an undo exists)
 */

export const ACTION_STATUSES = [
  'PENDING',
  'APPROVED',
  'EXECUTING',
  'EXECUTED',
  'FAILED',
  'REJECTED',
  'EXPIRED',
  'ROLLED_BACK',
] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export interface ActionRollback {
  tool: string;
  args: Record<string, unknown>;
  status: 'AVAILABLE' | 'DONE' | 'FAILED';
  at: Date | null;
  error_message: string;
}

export interface IAskDuncitAction {
  _id: Types.ObjectId;
  user_id: string;
  conversation_id: Types.ObjectId;
  message_id: string | null;
  role_key: string;
  tool: string;
  tool_title: string;
  category: string;
  risk: string;
  /** The exact arguments that will run — the person's own request. */
  args: Record<string, unknown>;
  /** The same, masked, for display and operators. */
  args_preview: string;
  reason: string;
  status: ActionStatus;
  expires_at: Date;
  decided_at: Date | null;
  executed_at: Date | null;
  result_preview: string;
  error_code: string;
  error_message: string;
  rollback: ActionRollback | null;
  created_at: Date;
  updated_at: Date;
}

const actionSchema = new Schema<IAskDuncitAction>(
  {
    user_id: { type: String, required: true },
    conversation_id: { type: Schema.Types.ObjectId, ref: 'AskDuncitConversation', required: true },
    message_id: { type: String, default: null },
    role_key: { type: String, required: true },
    tool: { type: String, required: true },
    tool_title: { type: String, default: '' },
    category: { type: String, default: '' },
    risk: { type: String, default: 'WRITE' },
    args: { type: Schema.Types.Mixed, default: {} },
    args_preview: { type: String, default: '' },
    reason: { type: String, default: '' },
    status: { type: String, enum: ACTION_STATUSES, default: 'PENDING' },
    expires_at: { type: Date, required: true },
    decided_at: { type: Date, default: null },
    executed_at: { type: Date, default: null },
    result_preview: { type: String, default: '' },
    error_code: { type: String, default: '' },
    error_message: { type: String, default: '' },
    rollback: {
      type: new Schema(
        {
          tool: { type: String, required: true },
          args: { type: Schema.Types.Mixed, default: {} },
          status: { type: String, enum: ['AVAILABLE', 'DONE', 'FAILED'], default: 'AVAILABLE' },
          at: { type: Date, default: null },
          error_message: { type: String, default: '' },
        },
        { _id: false }
      ),
      default: null,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, minimize: false }
);

actionSchema.index({ user_id: 1, created_at: -1 });
actionSchema.index({ conversation_id: 1, created_at: 1 });
actionSchema.index({ status: 1, created_at: -1 });
actionSchema.index({ tool: 1, created_at: -1 });

export const AskDuncitActionModel = model<IAskDuncitAction>('AskDuncitAction', actionSchema);
