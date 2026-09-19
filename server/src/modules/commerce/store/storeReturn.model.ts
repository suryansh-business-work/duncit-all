import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * A buyer asking to send pet-store goods back. The order stays as it was — a
 * return is its own record with its own lifecycle, raised by the buyer from
 * their order page and decided in the ecomm portal.
 */
export type StoreReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PICKUP_SCHEDULED'
  | 'RECEIVED'
  | 'REFUNDED'
  | 'CLOSED';

export const STORE_RETURN_STATUSES: StoreReturnStatus[] = [
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'PICKUP_SCHEDULED',
  'RECEIVED',
  'REFUNDED',
  'CLOSED',
];

/** How the money goes back: to the original payment (Finance pays it out), or
 * instantly as Duncit Coins (signed-in buyers only). */
export type StoreRefundMode = 'ORIGINAL' | 'COINS';

export interface IStoreReturnItem {
  product_id: Types.ObjectId;
  variant_id: string;
  name: string;
  variant_label: string;
  image_url: string;
  qty: number;
  unit_cost: number;
}

export interface IStoreReturnEvent {
  status: StoreReturnStatus;
  note: string;
  by: string;
  at: Date;
}

/** Where the reverse-pickup parcel is. */
export type ReturnPickupStatus = '' | 'BOOKED' | 'PICKUP_SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'FAILED';

export interface IReturnPickupEvent {
  status: string;
  location: string;
  note: string;
  at: Date;
}

/** The courier leg of a return: collected from the buyer, delivered to our warehouse. */
export interface IReturnPickup {
  sr_order_id: string;
  shipment_id: string;
  awb: string;
  courier_name: string;
  status: ReturnPickupStatus;
  tracking_status: string;
  last_error: string;
  last_synced_at: Date | null;
  events: IReturnPickupEvent[];
}

export interface IStoreReturn extends Document {
  return_no: string;
  order_id: Types.ObjectId;
  order_no: string;
  payment_id: Types.ObjectId;
  buyer_id: Types.ObjectId | null;
  buyer_name: string;
  buyer_email: string;
  items: IStoreReturnItem[];
  reason: string;
  comments: string;
  images: string[];
  status: StoreReturnStatus;
  refund_amount: number;
  refund_mode: StoreRefundMode;
  refunded_at: Date | null;
  restocked: boolean;
  admin_note: string;
  events: IStoreReturnEvent[];
  pickup: IReturnPickup;
  created_at: Date;
  updated_at: Date;
}

const returnItemSchema = new Schema<IStoreReturnItem>(
  {
    product_id: { type: Schema.Types.ObjectId, ref: 'StoreProduct', required: true },
    variant_id: { type: String, default: '' },
    name: { type: String, default: '' },
    variant_label: { type: String, default: '' },
    image_url: { type: String, default: '' },
    qty: { type: Number, required: true, min: 1 },
    unit_cost: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const returnEventSchema = new Schema<IStoreReturnEvent>(
  {
    status: { type: String, enum: STORE_RETURN_STATUSES, required: true },
    note: { type: String, default: '', maxlength: 1000 },
    by: { type: String, default: '' },
    at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const returnPickupSchema = new Schema<IReturnPickup>(
  {
    sr_order_id: { type: String, default: '' },
    shipment_id: { type: String, default: '' },
    awb: { type: String, default: '', index: true },
    courier_name: { type: String, default: '' },
    status: {
      type: String,
      enum: ['', 'BOOKED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'FAILED'],
      default: '',
    },
    tracking_status: { type: String, default: '' },
    last_error: { type: String, default: '' },
    last_synced_at: { type: Date, default: null },
    events: {
      type: [
        new Schema<IReturnPickupEvent>(
          {
            status: { type: String, default: '' },
            location: { type: String, default: '' },
            note: { type: String, default: '' },
            at: { type: Date, default: () => new Date() },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { _id: false }
);

const returnSchema = new Schema<IStoreReturn>(
  {
    return_no: { type: String, required: true, unique: true },
    order_id: { type: Schema.Types.ObjectId, ref: 'ProductOrder', required: true, index: true },
    order_no: { type: String, required: true, index: true },
    payment_id: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
    buyer_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    buyer_name: { type: String, default: '' },
    buyer_email: { type: String, default: '', lowercase: true, index: true },
    items: { type: [returnItemSchema], default: [] },
    reason: { type: String, required: true, trim: true, maxlength: 200 },
    comments: { type: String, default: '', trim: true, maxlength: 2000 },
    images: { type: [String], default: [] },
    status: { type: String, enum: STORE_RETURN_STATUSES, default: 'REQUESTED', index: true },
    refund_amount: { type: Number, default: 0, min: 0 },
    refund_mode: { type: String, enum: ['ORIGINAL', 'COINS'], default: 'ORIGINAL' },
    refunded_at: { type: Date, default: null },
    restocked: { type: Boolean, default: false },
    admin_note: { type: String, default: '', trim: true, maxlength: 2000 },
    events: { type: [returnEventSchema], default: [] },
    pickup: { type: returnPickupSchema, default: () => ({}) },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

returnSchema.index({ created_at: -1 });

export const StoreReturnModel = model<IStoreReturn>('StoreReturn', returnSchema);

/** "Tell me when it is back": one row per (email, product, variant). */
export interface IStoreStockAlert extends Document {
  product_id: Types.ObjectId;
  variant_id: string;
  email: string;
  user_id: Types.ObjectId | null;
  notified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const stockAlertSchema = new Schema<IStoreStockAlert>(
  {
    product_id: { type: Schema.Types.ObjectId, ref: 'StoreProduct', required: true },
    variant_id: { type: String, default: '' },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    notified_at: { type: Date, default: null, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

stockAlertSchema.index({ product_id: 1, variant_id: 1, email: 1 }, { unique: true });

export const StoreStockAlertModel = model<IStoreStockAlert>('StoreStockAlert', stockAlertSchema);
