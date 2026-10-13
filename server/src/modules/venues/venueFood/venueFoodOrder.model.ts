import { Schema, model, type Document, type Types } from 'mongoose';
import { VENUE_FOOD_DIETS } from '@modules/venues/venue/venue.constants';
import type { VenueFoodDiet } from '@modules/venues/venue/venue.model';

/**
 * A food order a guest placed by scanning a venue's QR.
 *
 * The guest pays the VENUE's own Razorpay account, so this is deliberately not
 * a `Payment`: nothing here is Duncit revenue, and it must never reach the
 * finalizer, an invoice number, a wallet or a settlement. The order carries
 * its own small payment state instead.
 *
 * Money is kept in paise (whole numbers) — the unit Razorpay charges in — so a
 * discount can never leave a rounding gap between what was quoted and charged.
 */
export const FOOD_ORDER_STATUSES = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'] as const;
export type FoodOrderStatus = (typeof FOOD_ORDER_STATUSES)[number];

export const FOOD_PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUND_PENDING', 'REFUNDED'] as const;
export type FoodPaymentStatus = (typeof FOOD_PAYMENT_STATUSES)[number];

/** A dish as it was when ordered — a later menu edit never rewrites a placed order. */
export interface IFoodOrderLine {
  item_id: Types.ObjectId;
  name: string;
  diet: VenueFoodDiet;
  unit_paise: number;
  quantity: number;
  line_paise: number;
}

/** What the guest said about the food once it was served. Written once. */
export interface IFoodOrderFeedback {
  rating: number;
  comment: string;
  images: string[];
  submitted_at: Date;
}

export const FOOD_FEEDBACK_LIMITS = { ratingMin: 1, ratingMax: 5, commentMax: 500, imagesMax: 3 } as const;

export interface IVenueFoodOrder extends Document<Types.ObjectId> {
  order_no: string;
  venue_id: Types.ObjectId;
  venue_name: string;
  /**
   * The venue's GST number and address as they were when the order was placed —
   * what its invoice prints, so a later edit of the venue never rewrites a bill
   * already issued. Empty on an order placed before invoices existed.
   */
  venue_gstin: string;
  venue_address: string;
  /** The signed-in account that ordered; null for a guest. */
  user_id: Types.ObjectId | null;
  customer_name: string;
  customer_phone: string;
  table_label: string;
  note: string;
  lines: IFoodOrderLine[];
  subtotal_paise: number;
  /** The venue's automatic discount. A coupon never changes what these two mean. */
  discount_pct: number;
  discount_paise: number;
  /**
   * The venue's coupon this order was priced with, as it was at that moment —
   * editing or deleting the coupon later never rewrites a placed order.
   * `coupon_id` is absent (not null) on an order without one, which is what
   * keeps such orders out of the redemption index.
   */
  coupon_id?: Types.ObjectId;
  coupon_code: string;
  coupon_pct: number;
  coupon_discount_paise: number;
  /** What is charged, reconciled against and refunded: subtotal less both discounts. */
  total_paise: number;
  currency_symbol: string;
  status: FoodOrderStatus;
  payment_status: FoodPaymentStatus;
  /** The owner's Razorpay connection this order was opened on — verify, reconcile and refund all use the same one. */
  razorpay_integration_id: Types.ObjectId;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_refund_id: string;
  paid_at: Date | null;
  /** The checkout attempt's own key: a double-tap or a retried request returns the same order. */
  client_key: string;
  /** The guest's proof that this order is theirs. Never selected by default. */
  access_key: string;
  cancelled_at: Date | null;
  cancel_reason: string;
  reconcile_checked_at: Date | null;
  /** When the kitchen marked it served — what the feedback request and the dashboard count from. */
  served_at: Date | null;
  /** The guest asked, at checkout, to hear about this venue's events. Acted on once the order is paid. */
  subscribe_events: boolean;
  /** Absent (not null) until the guest rates the order, so the write that saves it can require it to be missing. */
  feedback?: IFoodOrderFeedback;
  /** How often the invoice was downloaded, and when last. */
  invoice_downloads: number;
  invoice_downloaded_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const foodOrderFeedbackSchema = new Schema<IFoodOrderFeedback>(
  {
    rating: { type: Number, required: true, min: FOOD_FEEDBACK_LIMITS.ratingMin, max: FOOD_FEEDBACK_LIMITS.ratingMax },
    comment: { type: String, default: '', trim: true, maxlength: FOOD_FEEDBACK_LIMITS.commentMax },
    images: { type: [String], default: [] },
    submitted_at: { type: Date, required: true },
  },
  { _id: false }
);

const foodOrderLineSchema = new Schema<IFoodOrderLine>(
  {
    item_id: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    diet: { type: String, enum: VENUE_FOOD_DIETS, default: 'VEG' },
    unit_paise: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    line_paise: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const venueFoodOrderSchema = new Schema<IVenueFoodOrder>(
  {
    order_no: { type: String, required: true, unique: true },
    venue_id: { type: Schema.Types.ObjectId, ref: 'Venue', required: true },
    venue_name: { type: String, default: '' },
    venue_gstin: { type: String, default: '' },
    venue_address: { type: String, default: '' },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    customer_name: { type: String, required: true, trim: true, maxlength: 80 },
    customer_phone: { type: String, required: true, trim: true },
    table_label: { type: String, default: '', trim: true, maxlength: 20 },
    note: { type: String, default: '', trim: true, maxlength: 300 },
    lines: { type: [foodOrderLineSchema], default: [] },
    subtotal_paise: { type: Number, required: true, min: 0 },
    discount_pct: { type: Number, default: 0, min: 0, max: 100 },
    discount_paise: { type: Number, default: 0, min: 0 },
    coupon_id: { type: Schema.Types.ObjectId, ref: 'VenueFoodCoupon' },
    coupon_code: { type: String, default: '' },
    coupon_pct: { type: Number, default: 0, min: 0, max: 100 },
    coupon_discount_paise: { type: Number, default: 0, min: 0 },
    total_paise: { type: Number, required: true, min: 0 },
    currency_symbol: { type: String, default: '' },
    status: { type: String, enum: FOOD_ORDER_STATUSES, default: 'PLACED' },
    payment_status: { type: String, enum: FOOD_PAYMENT_STATUSES, default: 'PENDING' },
    razorpay_integration_id: { type: Schema.Types.ObjectId, ref: 'PartnerIntegration', required: true },
    razorpay_order_id: { type: String, default: '' },
    razorpay_payment_id: { type: String, default: '' },
    razorpay_refund_id: { type: String, default: '' },
    paid_at: { type: Date, default: null },
    client_key: { type: String, required: true },
    access_key: { type: String, required: true, select: false },
    cancelled_at: { type: Date, default: null },
    cancel_reason: { type: String, default: '', trim: true, maxlength: 300 },
    reconcile_checked_at: { type: Date, default: null },
    served_at: { type: Date, default: null },
    subscribe_events: { type: Boolean, default: false },
    feedback: { type: foodOrderFeedbackSchema },
    invoice_downloads: { type: Number, default: 0, min: 0 },
    invoice_downloaded_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The venue's order board, newest first.
venueFoodOrderSchema.index({ venue_id: 1, created_at: -1 });
// One order per checkout attempt — the database, not a read-then-write, is what refuses the duplicate.
venueFoodOrderSchema.index({ venue_id: 1, client_key: 1 }, { unique: true });
// The reconciler's two reads: unclaimed captures and refunds still owed.
venueFoodOrderSchema.index({ payment_status: 1, created_at: 1 });
// A coupon's per-number limit: the PAID orders one mobile number placed with it. Only orders that carry a coupon are indexed.
venueFoodOrderSchema.index(
  { coupon_id: 1, customer_phone: 1, payment_status: 1 },
  { partialFilterExpression: { coupon_id: { $exists: true } } }
);

export const VenueFoodOrderModel = model<IVenueFoodOrder>('VenueFoodOrder', venueFoodOrderSchema);
