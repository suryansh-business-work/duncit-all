import { Schema, model, Types, type Document } from 'mongoose';

export type FulfilmentMethod = 'SHIP' | 'PICKUP';
export type ProductOwnership = 'DUNCIT' | 'BRAND';

/** Lifecycle shared by SHIP + PICKUP orders. SHIP flows through the shipment
 * states; PICKUP uses PENDING → READY_FOR_PICKUP → PICKED_UP. */
export type FulfilmentStatus =
  | 'PENDING'
  | 'AWAITING_SHIPMENT'
  | 'AWB_ASSIGNED'
  | 'PICKUP_SCHEDULED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'CANCELLED'
  /** Returning to origin — the courier is bringing it back. */
  | 'RTO'
  /** Back at our warehouse after a return to origin. */
  | 'RTO_DELIVERED'
  /** A delivery attempt failed and needs an answer (re-attempt or return). */
  | 'NDR'
  /** The courier lost or destroyed the parcel. */
  | 'LOST'
  | 'FAILED';

export const FULFILMENT_STATUSES: FulfilmentStatus[] = [
  'PENDING',
  'AWAITING_SHIPMENT',
  'AWB_ASSIGNED',
  'PICKUP_SCHEDULED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'CANCELLED',
  'RTO',
  'RTO_DELIVERED',
  'NDR',
  'LOST',
  'FAILED',
];

export interface IOrderLineItem {
  product_id: Types.ObjectId;
  /** Which variant of the product was purchased (empty when the product has none). */
  variant_id: string;
  variant_label: string;
  variant_sku: string;
  name: string;
  sku: string;
  image_url: string;
  qty: number;
  unit_cost: number;
  gross: number;
  ownership: ProductOwnership;
  brand_id: Types.ObjectId | null;
  weight_kg: number;
  length_cm: number;
  breadth_cm: number;
  height_cm: number;
}

export interface IOrderShippingAddress {
  name: string;
  phone: string;
  email: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface IShipRocketInfo {
  order_id: string;
  shipment_id: string;
  /** When "create order" was last sent. Set before the call, so an answer we never received is looked for on the next attempt. */
  create_attempted_at: Date | null;
  awb: string;
  courier_name: string;
  courier_company_id: string;
  tracking_status: string;
  status_code: number;
  label_url: string;
  manifest_url: string;
  invoice_url: string;
  last_synced_at: Date | null;
  /** Courier pickup booked for this shipment. */
  pickup_token: string;
  pickup_scheduled_date: string;
  /** Courier's estimated delivery date, as ShipRocket phrased it. */
  etd: string;
  /** What an operator must act on: LOW_WALLET (AWB not assigned), NDR (failed delivery). '' = nothing. */
  alert: ShipmentAlert;
  alert_message: string;
  /** The operator's answer to a failed delivery. */
  ndr_action: string;
  ndr_actioned_at: Date | null;
}

export type ShipmentAlert = '' | 'LOW_WALLET' | 'NDR';

/**
 * The parcel we declared to ShipRocket — kept so a weight dispute can be
 * checked against what we actually sent. OVERRIDE is an operator's correction
 * made before the shipment was created; AUTO is buildParcel over the lines.
 */
export interface IOrderParcel {
  weight_kg: number;
  length_cm: number;
  breadth_cm: number;
  height_cm: number;
  volumetric_weight_kg: number;
  chargeable_weight_kg: number;
  source: 'AUTO' | 'OVERRIDE';
  /** When it was sent with the order; null while it is only an override waiting to be used. */
  sent_at: Date | null;
}

export interface ITrackingEvent {
  status: string;
  code: number;
  location: string;
  note: string;
  at: Date;
}

/** Which shop sold the order: the pod shop inside the apps, or the pet store. */
export type OrderChannel = 'POD_SHOP' | 'PET_STORE';
export const ORDER_CHANNELS: OrderChannel[] = ['POD_SHOP', 'PET_STORE'];

/** Paid up front, or collected in cash by the courier on delivery. */
export type OrderPaymentMethod = 'PREPAID' | 'COD';

/** An operator's private note on an order — never shown to the buyer. */
export interface IOrderNote {
  text: string;
  by_id: string;
  by_name: string;
  at: Date;
}

export interface IProductOrder extends Document {
  order_no: string;
  /** Null for a pet-store GUEST checkout — the order then belongs to its email. */
  buyer_id: Types.ObjectId | null;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  pod_id: Types.ObjectId | null;
  payment_id: Types.ObjectId;
  payment_ref: string;
  line_items: Types.DocumentArray<IOrderLineItem & Types.Subdocument>;
  currency_symbol: string;
  items_total: number;
  shipping_charge: number;
  total: number;
  fulfilment_method: FulfilmentMethod;
  fulfilment_status: FulfilmentStatus;
  shipping_address: IOrderShippingAddress | null;
  pickup_venue_id: Types.ObjectId | null;
  pickup_ref: string;
  pickup_location_id: string;
  shiprocket: IShipRocketInfo;
  parcel: IOrderParcel | null;
  tracking_events: Types.DocumentArray<ITrackingEvent & Types.Subdocument>;
  last_error: string;
  channel: OrderChannel;
  payment_method: OrderPaymentMethod;
  /** What the courier collects in cash — this order's share of a COD payment. */
  cod_amount: number;
  cod_collected_at: Date | null;
  /** This order's share of the coupon + coins taken off the payment. */
  discount_total: number;
  /** The Duncit Coins within `discount_total` — what a cancellation gives back as coins. */
  coins_share: number;
  /** A secret that opens a guest's order page from the confirmation email. */
  access_key: string;
  cancelled_at: Date | null;
  cancel_reason: string;
  cancelled_by: string;
  notes: Types.DocumentArray<IOrderNote & Types.Subdocument>;
  created_at: Date;
  updated_at: Date;
}

const lineItemSchema = new Schema<IOrderLineItem>(
  {
    product_id: { type: Schema.Types.ObjectId, ref: 'InventoryProduct', required: true },
    variant_id: { type: String, default: '' },
    variant_label: { type: String, default: '', trim: true, maxlength: 120 },
    variant_sku: { type: String, default: '', trim: true, maxlength: 60 },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    sku: { type: String, default: '', trim: true, maxlength: 60 },
    image_url: { type: String, default: '' },
    qty: { type: Number, required: true, min: 1 },
    unit_cost: { type: Number, required: true, min: 0 },
    gross: { type: Number, required: true, min: 0 },
    ownership: { type: String, enum: ['DUNCIT', 'BRAND'], default: 'DUNCIT' },
    brand_id: { type: Schema.Types.ObjectId, ref: 'EcommBrand', default: null },
    weight_kg: { type: Number, default: 0, min: 0 },
    length_cm: { type: Number, default: 0, min: 0 },
    breadth_cm: { type: Number, default: 0, min: 0 },
    height_cm: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const shippingAddressSchema = new Schema<IOrderShippingAddress>(
  {
    name: { type: String, default: '', trim: true, maxlength: 160 },
    phone: { type: String, default: '', trim: true, maxlength: 24 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 254 },
    line1: { type: String, default: '', trim: true, maxlength: 200 },
    line2: { type: String, default: '', trim: true, maxlength: 200 },
    landmark: { type: String, default: '', trim: true, maxlength: 160 },
    city: { type: String, default: '', trim: true, maxlength: 120 },
    state: { type: String, default: '', trim: true, maxlength: 120 },
    pincode: { type: String, default: '', trim: true, maxlength: 12 },
    country: { type: String, default: 'India', trim: true, maxlength: 80 },
  },
  { _id: false }
);

const shiprocketSchema = new Schema<IShipRocketInfo>(
  {
    order_id: { type: String, default: '' },
    shipment_id: { type: String, default: '' },
    create_attempted_at: { type: Date, default: null },
    awb: { type: String, default: '' },
    courier_name: { type: String, default: '' },
    courier_company_id: { type: String, default: '' },
    tracking_status: { type: String, default: '' },
    status_code: { type: Number, default: 0 },
    label_url: { type: String, default: '' },
    manifest_url: { type: String, default: '' },
    invoice_url: { type: String, default: '' },
    last_synced_at: { type: Date, default: null },
    pickup_token: { type: String, default: '' },
    pickup_scheduled_date: { type: String, default: '' },
    etd: { type: String, default: '' },
    alert: { type: String, enum: ['', 'LOW_WALLET', 'NDR'], default: '' },
    alert_message: { type: String, default: '' },
    ndr_action: { type: String, default: '' },
    ndr_actioned_at: { type: Date, default: null },
  },
  { _id: false }
);

const parcelSchema = new Schema<IOrderParcel>(
  {
    weight_kg: { type: Number, default: 0, min: 0 },
    length_cm: { type: Number, default: 0, min: 0 },
    breadth_cm: { type: Number, default: 0, min: 0 },
    height_cm: { type: Number, default: 0, min: 0 },
    volumetric_weight_kg: { type: Number, default: 0, min: 0 },
    chargeable_weight_kg: { type: Number, default: 0, min: 0 },
    source: { type: String, enum: ['AUTO', 'OVERRIDE'], default: 'AUTO' },
    sent_at: { type: Date, default: null },
  },
  { _id: false }
);

const trackingEventSchema = new Schema<ITrackingEvent>(
  {
    status: { type: String, default: '' },
    code: { type: Number, default: 0 },
    location: { type: String, default: '' },
    note: { type: String, default: '' },
    at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const orderNoteSchema = new Schema<IOrderNote>(
  {
    text: { type: String, default: '', trim: true, maxlength: 2000 },
    by_id: { type: String, default: '' },
    by_name: { type: String, default: '' },
    at: { type: Date, default: () => new Date() },
  },
  { _id: true }
);

const productOrderSchema = new Schema<IProductOrder>(
  {
    order_no: { type: String, required: true, unique: true, index: true },
    buyer_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    buyer_name: { type: String, default: '' },
    buyer_email: { type: String, default: '' },
    buyer_phone: { type: String, default: null },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', default: null, index: true },
    payment_id: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    payment_ref: { type: String, default: '' },
    line_items: { type: [lineItemSchema], default: [] },
    currency_symbol: { type: String, default: '₹' },
    items_total: { type: Number, required: true, min: 0 },
    shipping_charge: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    fulfilment_method: { type: String, enum: ['SHIP', 'PICKUP'], required: true, index: true },
    fulfilment_status: {
      type: String,
      enum: FULFILMENT_STATUSES,
      default: 'PENDING',
      index: true,
    },
    shipping_address: { type: shippingAddressSchema, default: null },
    pickup_venue_id: { type: Schema.Types.ObjectId, ref: 'Venue', default: null },
    pickup_ref: { type: String, default: '' },
    pickup_location_id: { type: String, default: '' },
    shiprocket: { type: shiprocketSchema, default: () => ({}) },
    parcel: { type: parcelSchema, default: null },
    tracking_events: { type: [trackingEventSchema], default: [] },
    last_error: { type: String, default: '' },
    channel: { type: String, enum: ORDER_CHANNELS, default: 'POD_SHOP', index: true },
    payment_method: { type: String, enum: ['PREPAID', 'COD'], default: 'PREPAID', index: true },
    cod_amount: { type: Number, default: 0, min: 0 },
    cod_collected_at: { type: Date, default: null },
    discount_total: { type: Number, default: 0, min: 0 },
    coins_share: { type: Number, default: 0, min: 0 },
    access_key: { type: String, default: '', select: false },
    cancelled_at: { type: Date, default: null },
    cancel_reason: { type: String, default: '', trim: true, maxlength: 500 },
    cancelled_by: { type: String, default: '' },
    notes: { type: [orderNoteSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One payment can span multiple pods (unified cart) and multiple warehouses
// (one SHIP order per pickup origin), so the idempotency key is the full tuple.
productOrderSchema.index(
  { payment_id: 1, pod_id: 1, fulfilment_method: 1, pickup_location_id: 1 },
  { unique: true }
);
productOrderSchema.index({ buyer_id: 1, created_at: -1 });
// The pet store's order console and a guest's "track my order" lookup.
productOrderSchema.index({ channel: 1, created_at: -1 });
productOrderSchema.index({ buyer_email: 1, channel: 1, created_at: -1 });
// The tracking fallback sweep: shipments with an AWB that tracking has not touched lately.
productOrderSchema.index({ fulfilment_status: 1, 'shiprocket.last_synced_at': 1 });
productOrderSchema.index({ 'shiprocket.awb': 1 });

export const ProductOrderModel = model<IProductOrder>('ProductOrder', productOrderSchema);
