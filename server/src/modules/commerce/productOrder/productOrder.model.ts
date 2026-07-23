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
  | 'RTO'
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
  awb: string;
  courier_name: string;
  courier_company_id: string;
  tracking_status: string;
  status_code: number;
  label_url: string;
  manifest_url: string;
  invoice_url: string;
  last_synced_at: Date | null;
}

export interface ITrackingEvent {
  status: string;
  code: number;
  location: string;
  note: string;
  at: Date;
}

export interface IProductOrder extends Document {
  order_no: string;
  buyer_id: Types.ObjectId;
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
  tracking_events: Types.DocumentArray<ITrackingEvent & Types.Subdocument>;
  last_error: string;
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
    awb: { type: String, default: '' },
    courier_name: { type: String, default: '' },
    courier_company_id: { type: String, default: '' },
    tracking_status: { type: String, default: '' },
    status_code: { type: Number, default: 0 },
    label_url: { type: String, default: '' },
    manifest_url: { type: String, default: '' },
    invoice_url: { type: String, default: '' },
    last_synced_at: { type: Date, default: null },
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

const productOrderSchema = new Schema<IProductOrder>(
  {
    order_no: { type: String, required: true, unique: true, index: true },
    buyer_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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
    tracking_events: { type: [trackingEventSchema], default: [] },
    last_error: { type: String, default: '' },
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

export const ProductOrderModel = model<IProductOrder>('ProductOrder', productOrderSchema);
