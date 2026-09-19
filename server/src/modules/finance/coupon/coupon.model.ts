import { Schema, model, Types, type Document } from 'mongoose';

export type CouponScope = 'GLOBAL' | 'POD' | 'STORE';

/**
 * Discount coupon. `scope = POD` binds it to a single pod (per-pod offer codes);
 * `GLOBAL` applies to any paid pod; `STORE` only to a pet-store checkout
 * (ecomm.duncit.com). Discount is a percentage set in the backend.
 * Redemptions are tracked via `used_count` (total) + per-payment `coupon_code`
 * (for per-user limits).
 */
export interface ICoupon extends Document {
  code: string;
  description: string;
  discount_pct: number;
  scope: CouponScope;
  pod_id: Types.ObjectId | null;
  valid_from: Date | null;
  valid_until: Date | null;
  max_uses: number | null;
  per_user_limit: number | null;
  min_order_amount: number;
  used_count: number;
  is_active: boolean;
  /** STORE coupons only: the products the code applies to. Empty = the whole store. */
  product_ids: Types.ObjectId[];
  created_at: Date;
  updated_at: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, default: '' },
    discount_pct: { type: Number, required: true, min: 1, max: 100 },
    scope: { type: String, enum: ['GLOBAL', 'POD', 'STORE'], default: 'GLOBAL', index: true },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', default: null, index: true },
    valid_from: { type: Date, default: null },
    valid_until: { type: Date, default: null },
    max_uses: { type: Number, default: null, min: 1 },
    per_user_limit: { type: Number, default: null, min: 1 },
    min_order_amount: { type: Number, default: 0, min: 0 },
    used_count: { type: Number, default: 0, min: 0 },
    is_active: { type: Boolean, default: true, index: true },
    product_ids: { type: [Schema.Types.ObjectId], ref: 'StoreProduct', default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const CouponModel = model<ICoupon>('Coupon', couponSchema);
