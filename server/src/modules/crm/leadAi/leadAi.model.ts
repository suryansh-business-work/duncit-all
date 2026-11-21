import { Schema, model, InferSchemaType, Types } from 'mongoose';
import { CRM_LEAD_ENTITY_TYPES } from '@modules/crm/crm/crm.constants';

export const LEAD_AI_ACTION_TYPES = ['EMAIL_DRAFT', 'CREATE_REMINDER', 'UPDATE_REMINDER'] as const;
export type LeadAiActionType = (typeof LEAD_AI_ACTION_TYPES)[number];
export const LEAD_AI_ACTION_STATUSES = ['PROPOSED', 'DONE', 'DISMISSED'] as const;
export type LeadAiActionStatus = (typeof LEAD_AI_ACTION_STATUSES)[number];

/** Most messages kept per thread; older ones roll off as new ones arrive. */
export const LEAD_AI_THREAD_CAP = 100;

/**
 * Something the assistant offered to do. It never runs on its own: the agent
 * reviews it in the panel and the portal runs it through the same email and
 * reminder mutations as the rest of the lead page, so permissions, the
 * communication log and the lead's activity entry are exactly the same.
 */
const actionSchema = new Schema(
  {
    type: { type: String, enum: LEAD_AI_ACTION_TYPES, required: true },
    status: { type: String, enum: LEAD_AI_ACTION_STATUSES, default: 'PROPOSED' },
    to: { type: String, default: '' },
    subject: { type: String, default: '' },
    body_html: { type: String, default: '' },
    reminder_id: { type: String, default: null },
    title: { type: String, default: '' },
    due_at: { type: Date, default: null },
    notes: { type: String, default: '' },
    reminder_status: { type: String, enum: ['PENDING', 'DONE'], default: null },
    result_message: { type: String, default: '' },
  },
  { _id: false }
);

const messageSchema = new Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    actions: { type: [actionSchema], default: [] },
    created_at: { type: Date, default: Date.now },
  },
  { _id: true }
);

/**
 * One agent's Ask AI conversation about one lead. Threads are per person: an
 * agent's drafts and questions are their own working notes, and the lead's
 * shared history (notes, emails, reminders) is what every thread reads from.
 */
const leadAiThreadSchema = new Schema(
  {
    entity_type: { type: String, enum: CRM_LEAD_ENTITY_TYPES, required: true },
    lead_id: { type: Schema.Types.ObjectId, required: true },
    user_id: { type: String, required: true },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

leadAiThreadSchema.index({ entity_type: 1, lead_id: 1, user_id: 1 }, { unique: true });

export type LeadAiThreadDoc = InferSchemaType<typeof leadAiThreadSchema> & { _id: Types.ObjectId };
export const LeadAiThreadModel = model('CrmLeadAiThread', leadAiThreadSchema);
