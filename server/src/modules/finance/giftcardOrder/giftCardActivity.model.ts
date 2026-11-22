import { Schema, model, Types, type Document } from 'mongoose';

/**
 * The audit trail of the gift card catalogue and its orders — insert-only.
 * Field edits are also diffed by the global table change log; these rows record
 * the business moments that log cannot name: a stock count corrected and why,
 * a default swapped, an order paid, printed, booked or moved by the courier.
 */
export type GiftCardActivityEntity = 'DESIGN' | 'ORDER';

export const GIFT_CARD_ACTIVITY_ACTIONS = [
  'DESIGN_CREATED',
  'DESIGN_UPDATED',
  'DESIGN_DEFAULT_SET',
  'STOCK_ADJUSTED',
  'STOCK_CONSUMED',
  'STOCK_SHORT',
  'ORDER_PLACED',
  'ORDER_PAID',
  'CARDS_ISSUED',
  'CARDS_EMAILED',
  'ORDER_PRINTED',
  'ADDRESS_UPDATED',
  'SHIPMENT_BOOKED',
  'SHIPMENT_FAILED',
  'STATUS_CHANGED',
] as const;
export type GiftCardActivityAction = (typeof GIFT_CARD_ACTIVITY_ACTIONS)[number];

export interface IGiftCardActivity extends Document {
  _id: Types.ObjectId;
  entity_type: GiftCardActivityEntity;
  entity_id: Types.ObjectId;
  action: GiftCardActivityAction;
  /** The admin for console actions, the buyer for checkout/payment rows, null for the courier feed. */
  actor_user_id: Types.ObjectId | null;
  note: string;
  created_at: Date;
}

const activitySchema = new Schema<IGiftCardActivity>(
  {
    entity_type: { type: String, enum: ['DESIGN', 'ORDER'], required: true },
    entity_id: { type: Schema.Types.ObjectId, required: true },
    action: { type: String, enum: GIFT_CARD_ACTIVITY_ACTIONS, required: true },
    actor_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, default: '', trim: true, maxlength: 500 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);
activitySchema.index({ entity_type: 1, entity_id: 1, created_at: -1 });

export const GiftCardActivityModel = model<IGiftCardActivity>('GiftCardActivity', activitySchema);
