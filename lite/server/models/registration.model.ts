import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const REGISTRATION_STATUSES = [
  'PENDING_APPROVAL',
  'PAYMENT_PENDING',
  'CONFIRMED',
  'WAITLISTED',
  'DECLINED',
  'CANCELLED',
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const PAYMENT_STATUSES = ['NOT_REQUIRED', 'PENDING', 'PAID', 'REJECTED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Statuses that hold a seat against the event's capacity. */
export const SEAT_HOLDING: readonly RegistrationStatus[] = ['CONFIRMED', 'PAYMENT_PENDING', 'PENDING_APPROVAL'];

const answerSchema = new Schema(
  {
    question_id: { type: String, required: true },
    label: { type: String, required: true },
    answer: { type: String, default: '' },
  },
  { _id: false },
);

/** One guest on one event. `code` is what the host checks in at the door. */
const registrationSchema = new Schema(
  {
    event_id: { type: Schema.Types.ObjectId, ref: 'LiteEvent', required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'LiteUser', required: true, index: true },
    code: { type: String, required: true, index: true },
    ticket_id: { type: String, required: true },
    ticket_name: { type: String, required: true },
    ticket_price: { type: Number, default: 0 },
    quantity: { type: Number, default: 1, min: 1 },
    amount_due: { type: Number, default: 0 },
    status: { type: String, enum: REGISTRATION_STATUSES, required: true, index: true },
    payment_status: { type: String, enum: PAYMENT_STATUSES, default: 'NOT_REQUIRED' },
    payment_reference: { type: String, default: '' },
    payment_note: { type: String, default: '' },
    payment_confirmed_at: { type: Date, default: null },
    answers: { type: [answerSchema], default: [] },
    checked_in_at: { type: Date, default: null },
    approved_at: { type: Date, default: null },
    cancelled_at: { type: Date, default: null },
    /** Denormalised for the console's tables and the email scheduler. */
    event_title: { type: String, default: '' },
    event_start_at: { type: Date, default: null },
    user_email: { type: String, default: '' },
    user_name: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

registrationSchema.index({ event_id: 1, user_id: 1 }, { unique: true });
registrationSchema.index({ event_id: 1, code: 1 }, { unique: true });
registrationSchema.index({ event_id: 1, status: 1, created_at: 1 });

export type LiteRegistration = InferSchemaType<typeof registrationSchema>;
export type LiteRegistrationDoc = HydratedDocument<LiteRegistration>;
export const LiteRegistrationModel = model('LiteRegistration', registrationSchema, 'lite_registrations');
