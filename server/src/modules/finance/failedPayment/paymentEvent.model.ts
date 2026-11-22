import { Schema, model, Types, type Document } from 'mongoose';
import {
  PAYMENT_EVENT_SOURCES,
  PAYMENT_EVENT_TYPES,
  type ActorSnapshot,
  type PaymentEventSource,
  type PaymentEventType,
} from './failedPayment.types';

/**
 * One thing that happened to a payment, append-only — the audit trail Finance
 * reads on a failed payment's timeline. `data` is sanitised before it is
 * written (see paymentEvent.service): no card data, contact details or secrets.
 */
export interface IPaymentEvent extends Document {
  payment_doc_id: Types.ObjectId;
  case_id: Types.ObjectId | null;
  type: PaymentEventType;
  source: PaymentEventSource;
  actor: ActorSnapshot | null;
  data: Record<string, string | number | boolean | null>;
  /** Set when the same fact can arrive twice (a client retry, a webhook redelivery). */
  dedupe_key: string | null;
  created_at: Date;
}

const actorSchema = new Schema<ActorSnapshot>(
  {
    id: { type: String, default: '' },
    name: { type: String, default: '' },
    roles: { type: [String], default: [] },
  },
  { _id: false }
);

const paymentEventSchema = new Schema<IPaymentEvent>(
  {
    payment_doc_id: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
    case_id: { type: Schema.Types.ObjectId, ref: 'FailedPaymentCase', default: null },
    type: { type: String, enum: PAYMENT_EVENT_TYPES, required: true },
    source: { type: String, enum: PAYMENT_EVENT_SOURCES, required: true },
    actor: { type: actorSchema, default: null },
    data: { type: Schema.Types.Mixed, default: {} },
    dedupe_key: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// The timeline: one payment's events, oldest first.
paymentEventSchema.index({ payment_doc_id: 1, created_at: 1 });
// One row per repeatable fact. PARTIAL so the many events with no key never collide.
paymentEventSchema.index(
  { dedupe_key: 1 },
  { unique: true, partialFilterExpression: { dedupe_key: { $type: 'string' } } }
);

export const PaymentEventModel = model<IPaymentEvent>('PaymentEvent', paymentEventSchema);
