import { Schema, model, type InferSchemaType } from 'mongoose';

export const EMAIL_STATUSES = ['SENT', 'FAILED', 'SKIPPED'] as const;

/** Every email the server tried to send, for the console's Email logs page. */
const emailLogSchema = new Schema(
  {
    to: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    template_key: { type: String, default: '', index: true },
    status: { type: String, enum: EMAIL_STATUSES, required: true, index: true },
    error: { type: String, default: '' },
    message_id: { type: String, default: '' },
    event_id: { type: Schema.Types.ObjectId, ref: 'LiteEvent', default: null, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export type LiteEmailLog = InferSchemaType<typeof emailLogSchema>;
export const LiteEmailLogModel = model('LiteEmailLog', emailLogSchema, 'lite_email_logs');
