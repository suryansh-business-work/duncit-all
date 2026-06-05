import { Schema, model, InferSchemaType, Types } from 'mongoose';

/**
 * A CRM reminder — a dated to-do, optionally attached to a venue/host lead.
 * Surfaced on lead detail pages (Reminders tab) and the dashboard calendar.
 */
export const REMINDER_ENTITIES = ['VENUE_LEAD', 'HOST_LEAD', 'GENERAL'] as const;
export const REMINDER_STATUSES = ['PENDING', 'DONE'] as const;
export type ReminderEntity = (typeof REMINDER_ENTITIES)[number];
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];

const reminderSchema = new Schema(
  {
    entity_type: { type: String, enum: REMINDER_ENTITIES, default: 'GENERAL', index: true },
    lead_id: { type: Schema.Types.ObjectId, default: null, index: true },
    title: { type: String, required: true, trim: true },
    due_at: { type: Date, required: true, index: true },
    notes: { type: String, default: null },
    status: { type: String, enum: REMINDER_STATUSES, default: 'PENDING', index: true },
    assigned_to: { type: String, default: null },
    created_by: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export type ReminderDoc = InferSchemaType<typeof reminderSchema> & { _id: Types.ObjectId };
export const ReminderModel = model('CrmReminder', reminderSchema);
