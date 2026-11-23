import { Schema, model, Types, type Document } from 'mongoose';
import type { FulfilmentStatus } from '@modules/commerce/productOrder/productOrder.model';

export type GiftCardDeliveryMode = 'DIGITAL' | 'PHYSICAL';
export const GIFT_CARD_DELIVERY_MODES: readonly GiftCardDeliveryMode[] = ['DIGITAL', 'PHYSICAL'];

/** The money side, mirrored from the payment. FAILED/REFUNDED are read off the
 * payment row at read time too, since a Razorpay retry may still pay a PENDING one. */
export type GiftCardOrderPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export const GIFT_CARD_ORDER_PAYMENT_STATUSES: readonly GiftCardOrderPaymentStatus[] = [
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
];

/**
 * Where the order is.
 * - Digital: PENDING (unpaid) → PROCESSING (paid, cards being mailed) → DELIVERED (every card mailed).
 * - Physical: PENDING → PROCESSING (paid, scratch cards minted, to print) → PRINTED → the
 *   courier's statuses (AWAITING_SHIPMENT … DELIVERED / NDR / RTO / LOST), fed by ShipRocket.
 */
export type GiftCardFulfilmentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PRINTED'
  | Extract<
      FulfilmentStatus,
      | 'AWAITING_SHIPMENT'
      | 'AWB_ASSIGNED'
      | 'PICKUP_SCHEDULED'
      | 'SHIPPED'
      | 'OUT_FOR_DELIVERY'
      | 'DELIVERED'
      | 'NDR'
      | 'RTO'
      | 'RTO_DELIVERED'
      | 'LOST'
      | 'CANCELLED'
      | 'FAILED'
    >;

export const GIFT_CARD_FULFILMENT_STATUSES: readonly GiftCardFulfilmentStatus[] = [
  'PENDING',
  'PROCESSING',
  'PRINTED',
  'AWAITING_SHIPMENT',
  'AWB_ASSIGNED',
  'PICKUP_SCHEDULED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'NDR',
  'RTO',
  'RTO_DELIVERED',
  'LOST',
  'CANCELLED',
  'FAILED',
];

export interface IGiftCardShippingAddress {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface IGiftCardShipment {
  order_id: string;
  shipment_id: string;
  create_attempted_at: Date | null;
  sandbox: boolean;
  awb: string;
  courier_name: string;
  courier_company_id: string;
  tracking_status: string;
  status_code: number;
  label_url: string;
  pickup_token: string;
  pickup_scheduled_date: string;
  etd: string;
  last_synced_at: Date | null;
  /** '' | 'LOW_WALLET' | 'NDR' — what the Loyalty team must act on. */
  alert: string;
  alert_message: string;
}

export interface IGiftCardTrackingEvent {
  status: string;
  location: string;
  note: string;
  at: Date;
}

/**
 * One gift card purchase — the record every surface reads: the Loyalty portal's
 * order book and the member's own order history and tracking in mWeb and the
 * app. Created PENDING at checkout (so an abandoned or failed payment is still
 * visible), promoted by the payment finalizer, and keyed on the payment's
 * business id so every replay of the success path lands on the same row.
 */
export interface IGiftCardOrder extends Document {
  _id: Types.ObjectId;
  order_no: string;
  user_id: Types.ObjectId;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  payment_id: string;
  payment_doc_id: Types.ObjectId;
  delivery_mode: GiftCardDeliveryMode;
  /** Null on an order placed by an older app with a category theme. */
  design_id: Types.ObjectId | null;
  design_name: string;
  design_front_url: string;
  design_back_url: string;
  /** Face value of ONE card, whole rupees. */
  amount: number;
  quantity: number;
  cards_value: number;
  /** Charged once per physical order, whatever the quantity; 0 for digital. */
  shipping_fee: number;
  total: number;
  currency_symbol: string;
  recipient_name: string;
  recipient_email: string;
  message: string;
  shipping_address: IGiftCardShippingAddress | null;
  payment_status: GiftCardOrderPaymentStatus;
  fulfilment_status: GiftCardFulfilmentStatus;
  paid_at: Date | null;
  gift_card_ids: Types.ObjectId[];
  physical_batch_id: Types.ObjectId | null;
  /** True once this order's cards were taken out of the design's stock. */
  stock_consumed: boolean;
  /** Paid while the design's stock could not cover it — the team must print more. */
  stock_short: boolean;
  emailed_at: Date | null;
  printed_at: Date | null;
  delivered_at: Date | null;
  shipment: IGiftCardShipment;
  tracking_events: IGiftCardTrackingEvent[];
  last_error: string;
  created_at: Date;
  updated_at: Date;
}

const addressSchema = new Schema<IGiftCardShippingAddress>(
  {
    name: { type: String, default: '', trim: true, maxlength: 160 },
    phone: { type: String, default: '', trim: true, maxlength: 32 },
    line1: { type: String, default: '', trim: true, maxlength: 200 },
    line2: { type: String, default: '', trim: true, maxlength: 200 },
    landmark: { type: String, default: '', trim: true, maxlength: 200 },
    city: { type: String, default: '', trim: true, maxlength: 120 },
    state: { type: String, default: '', trim: true, maxlength: 120 },
    pincode: { type: String, default: '', trim: true, maxlength: 10 },
    country: { type: String, default: 'India', trim: true, maxlength: 80 },
  },
  { _id: false }
);

const shipmentSchema = new Schema<IGiftCardShipment>(
  {
    order_id: { type: String, default: '' },
    shipment_id: { type: String, default: '' },
    create_attempted_at: { type: Date, default: null },
    sandbox: { type: Boolean, default: false },
    awb: { type: String, default: '' },
    courier_name: { type: String, default: '' },
    courier_company_id: { type: String, default: '' },
    tracking_status: { type: String, default: '' },
    status_code: { type: Number, default: 0 },
    label_url: { type: String, default: '' },
    pickup_token: { type: String, default: '' },
    pickup_scheduled_date: { type: String, default: '' },
    etd: { type: String, default: '' },
    last_synced_at: { type: Date, default: null },
    alert: { type: String, default: '' },
    alert_message: { type: String, default: '' },
  },
  { _id: false }
);

const trackingEventSchema = new Schema<IGiftCardTrackingEvent>(
  {
    status: { type: String, default: '' },
    location: { type: String, default: '' },
    note: { type: String, default: '' },
    at: { type: Date, required: true },
  },
  { _id: false }
);

const orderSchema = new Schema<IGiftCardOrder>(
  {
    order_no: { type: String, required: true, unique: true, trim: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    buyer_name: { type: String, default: '', trim: true },
    buyer_email: { type: String, default: '', trim: true, lowercase: true },
    buyer_phone: { type: String, default: '', trim: true },
    payment_id: { type: String, required: true, unique: true },
    payment_doc_id: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
    delivery_mode: { type: String, enum: GIFT_CARD_DELIVERY_MODES, required: true, index: true },
    design_id: { type: Schema.Types.ObjectId, ref: 'GiftCardDesign', default: null },
    design_name: { type: String, default: '', trim: true },
    design_front_url: { type: String, default: '', trim: true },
    design_back_url: { type: String, default: '', trim: true },
    amount: { type: Number, required: true, min: 1 },
    quantity: { type: Number, required: true, min: 1 },
    cards_value: { type: Number, required: true, min: 1 },
    shipping_fee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency_symbol: { type: String, default: '' },
    recipient_name: { type: String, default: '', trim: true, maxlength: 160 },
    recipient_email: { type: String, default: '', trim: true, lowercase: true, maxlength: 254 },
    message: { type: String, default: '', trim: true, maxlength: 300 },
    shipping_address: { type: addressSchema, default: null },
    payment_status: { type: String, enum: GIFT_CARD_ORDER_PAYMENT_STATUSES, default: 'PENDING', index: true },
    fulfilment_status: { type: String, enum: GIFT_CARD_FULFILMENT_STATUSES, default: 'PENDING', index: true },
    paid_at: { type: Date, default: null },
    gift_card_ids: { type: [Schema.Types.ObjectId], default: [] },
    physical_batch_id: { type: Schema.Types.ObjectId, ref: 'PhysicalGiftCardBatch', default: null },
    stock_consumed: { type: Boolean, default: false },
    stock_short: { type: Boolean, default: false },
    emailed_at: { type: Date, default: null },
    printed_at: { type: Date, default: null },
    delivered_at: { type: Date, default: null },
    shipment: { type: shipmentSchema, default: () => ({}) },
    tracking_events: { type: [trackingEventSchema], default: [] },
    last_error: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
orderSchema.index({ created_at: -1 });
orderSchema.index({ user_id: 1, created_at: -1 });
orderSchema.index({ 'shipment.awb': 1 });
orderSchema.index({ fulfilment_status: 1, 'shipment.last_synced_at': 1 });

export const GiftCardOrderModel = model<IGiftCardOrder>('GiftCardOrder', orderSchema);
