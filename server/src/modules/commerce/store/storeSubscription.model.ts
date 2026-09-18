import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * Autoship — "subscribe & save". A signed-in buyer asks for one product every
 * N weeks. On the due date the store either books a Cash-on-Delivery order by
 * itself (COD_AUTO) or reminds the buyer to order it (REMIND); either way the
 * order goes through the ordinary checkout path and earns the store's
 * autoship discount.
 */
export type StoreSubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';
export const STORE_SUBSCRIPTION_STATUSES: StoreSubscriptionStatus[] = ['ACTIVE', 'PAUSED', 'CANCELLED'];

export type StoreSubscriptionMode = 'COD_AUTO' | 'REMIND';
export const STORE_SUBSCRIPTION_MODES: StoreSubscriptionMode[] = ['COD_AUTO', 'REMIND'];

export interface IStoreSubscriptionEvent {
  action: string;
  note: string;
  at: Date;
}

export interface IStoreSubscriptionAddress {
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

export interface IStoreSubscription extends Document {
  user_id: Types.ObjectId;
  buyer_name: string;
  buyer_email: string;
  phone_extension: string;
  phone_number: string;
  product_id: Types.ObjectId;
  variant_id: string;
  variant_label: string;
  product_name: string;
  qty: number;
  frequency_weeks: number;
  mode: StoreSubscriptionMode;
  status: StoreSubscriptionStatus;
  shipping_address: IStoreSubscriptionAddress;
  next_run_at: Date | null;
  last_run_at: Date | null;
  last_order_no: string;
  run_count: number;
  /** Consecutive automatic cycles that could not be booked; three pause it. */
  failures: number;
  reminded_for: Date | null;
  events: IStoreSubscriptionEvent[];
  created_at: Date;
  updated_at: Date;
}

const eventSchema = new Schema<IStoreSubscriptionEvent>(
  {
    action: { type: String, required: true },
    note: { type: String, default: '', maxlength: 500 },
    at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const addressSchema = new Schema<IStoreSubscriptionAddress>(
  {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    line1: { type: String, default: '' },
    line2: { type: String, default: '' },
    landmark: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    country: { type: String, default: 'India' },
  },
  { _id: false }
);

const subscriptionSchema = new Schema<IStoreSubscription>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    buyer_name: { type: String, default: '' },
    buyer_email: { type: String, default: '', lowercase: true },
    phone_extension: { type: String, default: '+91' },
    phone_number: { type: String, default: '' },
    product_id: { type: Schema.Types.ObjectId, ref: 'InventoryProduct', required: true },
    variant_id: { type: String, default: '' },
    variant_label: { type: String, default: '' },
    product_name: { type: String, default: '' },
    qty: { type: Number, required: true, min: 1, max: 99 },
    frequency_weeks: { type: Number, required: true, min: 1, max: 26 },
    mode: { type: String, enum: STORE_SUBSCRIPTION_MODES, default: 'REMIND' },
    status: { type: String, enum: STORE_SUBSCRIPTION_STATUSES, default: 'ACTIVE', index: true },
    shipping_address: { type: addressSchema, default: () => ({}) },
    next_run_at: { type: Date, default: null, index: true },
    last_run_at: { type: Date, default: null },
    last_order_no: { type: String, default: '' },
    run_count: { type: Number, default: 0, min: 0 },
    failures: { type: Number, default: 0, min: 0 },
    reminded_for: { type: Date, default: null },
    events: { type: [eventSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

subscriptionSchema.index({ status: 1, next_run_at: 1 });

export const StoreSubscriptionModel = model<IStoreSubscription>('StoreSubscription', subscriptionSchema);
