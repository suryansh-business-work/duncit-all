import { Schema, model, type Document, type Types } from 'mongoose';
import { orderRefundSchema, type IOrderRefund } from '@modules/commerce/productOrder/productOrder.model';
import { returnPickupSchema, type IReturnPickup } from '@modules/commerce/shiprocket/returnPickup.schema';

/**
 * A pod-shop buyer sending partner-brand goods back, inside the return window
 * the brand set on the product (snapshotted on the order line). Its own record
 * — the order stays as it was — decided by the brand (Partners portal) or the
 * Products team, collected by a ShipRocket reverse pickup on the brand's own
 * account, and refunded once the goods are back.
 *
 * Not the pet store's StoreReturn: a different shop, different rules (rule 65).
 */
export type PodShopReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PICKUP_SCHEDULED'
  | 'RECEIVED'
  | 'REFUNDED'
  | 'CANCELLED';

export const POD_SHOP_RETURN_STATUSES: PodShopReturnStatus[] = [
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'PICKUP_SCHEDULED',
  'RECEIVED',
  'REFUNDED',
  'CANCELLED',
];

/** A return still being worked — blocks a brand/product deletion until it settles. */
export const OPEN_RETURN_STATUSES: PodShopReturnStatus[] = ['REQUESTED', 'APPROVED', 'PICKUP_SCHEDULED', 'RECEIVED'];

export interface IPodShopReturnItem {
  product_id: Types.ObjectId;
  variant_id: string;
  brand_id: Types.ObjectId | null;
  name: string;
  variant_label: string;
  image_url: string;
  qty: number;
  unit_cost: number;
}

export interface IPodShopReturnEvent {
  status: PodShopReturnStatus;
  note: string;
  by: string;
  at: Date;
}

export interface IPodShopReturn extends Document {
  return_no: string;
  order_id: Types.ObjectId;
  order_no: string;
  payment_id: Types.ObjectId;
  buyer_id: Types.ObjectId | null;
  buyer_name: string;
  buyer_email: string;
  /** Every brand behind the returned lines — what a brand's Returns page and deletion checks filter on. */
  brand_ids: Types.ObjectId[];
  items: IPodShopReturnItem[];
  reason: string;
  comments: string;
  status: PodShopReturnStatus;
  /** Goods value being returned at the order's prices (incl. GST) — what the refund is a share of. */
  gross: number;
  decision_note: string;
  events: IPodShopReturnEvent[];
  pickup: IReturnPickup;
  refund: IOrderRefund;
  created_at: Date;
  updated_at: Date;
}

const itemSchema = new Schema<IPodShopReturnItem>(
  {
    product_id: { type: Schema.Types.ObjectId, ref: 'InventoryProduct', required: true },
    variant_id: { type: String, default: '' },
    brand_id: { type: Schema.Types.ObjectId, ref: 'EcommBrand', default: null },
    name: { type: String, default: '' },
    variant_label: { type: String, default: '' },
    image_url: { type: String, default: '' },
    qty: { type: Number, required: true, min: 1 },
    unit_cost: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const eventSchema = new Schema<IPodShopReturnEvent>(
  {
    status: { type: String, enum: POD_SHOP_RETURN_STATUSES, required: true },
    note: { type: String, default: '', maxlength: 1000 },
    by: { type: String, default: '' },
    at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const podShopReturnSchema = new Schema<IPodShopReturn>(
  {
    return_no: { type: String, required: true, unique: true },
    order_id: { type: Schema.Types.ObjectId, ref: 'ProductOrder', required: true, index: true },
    order_no: { type: String, required: true, index: true },
    payment_id: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
    buyer_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    buyer_name: { type: String, default: '' },
    buyer_email: { type: String, default: '', lowercase: true },
    brand_ids: { type: [Schema.Types.ObjectId], ref: 'EcommBrand', default: [], index: true },
    items: { type: [itemSchema], default: [] },
    reason: { type: String, required: true, trim: true, maxlength: 200 },
    comments: { type: String, default: '', trim: true, maxlength: 2000 },
    status: { type: String, enum: POD_SHOP_RETURN_STATUSES, default: 'REQUESTED', index: true },
    gross: { type: Number, default: 0, min: 0 },
    decision_note: { type: String, default: '', trim: true, maxlength: 2000 },
    events: { type: [eventSchema], default: [] },
    pickup: { type: returnPickupSchema, default: () => ({}) },
    refund: { type: orderRefundSchema, default: () => ({}) },
  },
  { collection: 'podshopreturns', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

podShopReturnSchema.index({ created_at: -1 });
podShopReturnSchema.index({ 'items.product_id': 1, status: 1 });

export const PodShopReturnModel = model<IPodShopReturn>('PodShopReturn', podShopReturnSchema);
