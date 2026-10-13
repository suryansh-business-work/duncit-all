import { Schema, model, type Document, type Types } from 'mongoose';
import { VENUE_FOOD_DISCOUNT_MAX_PCT } from '@modules/venues/venue/venue.constants';

/**
 * A coupon a venue gives its own food guests.
 *
 * The money of a food order is the venue's, so the coupon is too: the venue's
 * owner creates it, the venue funds it, and it is worth nothing anywhere else.
 * It is deliberately NOT a finance `Coupon` — those are staff-created, unique
 * across the platform and redeemed against a `Payment`, and a food order is
 * never a Payment.
 *
 * The code is unique PER VENUE: two venues may both run `WELCOME10`.
 * Money is in paise, like the orders it discounts.
 */
export interface IVenueFoodCoupon extends Document<Types.ObjectId> {
  venue_id: Types.ObjectId;
  /** Trimmed and upper-cased before it is ever stored or looked up. */
  code: string;
  description: string;
  discount_pct: number;
  /** Compared with the order's subtotal, before any discount. */
  min_order_paise: number;
  valid_from: Date | null;
  valid_until: Date | null;
  /** Total paid orders the code may discount; null for no cap. */
  max_uses: number | null;
  /** Paid orders one mobile number may use it on; null for no cap. */
  per_phone_limit: number | null;
  /** Orders currently PAID with this coupon — see `venueFoodCoupon.redemption.ts` for who moves it. */
  used_count: number;
  is_active: boolean;
  created_by: Types.ObjectId | null;
  updated_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const venueFoodCouponSchema = new Schema<IVenueFoodCoupon>(
  {
    venue_id: { type: Schema.Types.ObjectId, ref: 'Venue', required: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, default: '', trim: true, maxlength: 300 },
    discount_pct: { type: Number, required: true, min: 1, max: VENUE_FOOD_DISCOUNT_MAX_PCT },
    min_order_paise: { type: Number, default: 0, min: 0 },
    valid_from: { type: Date, default: null },
    valid_until: { type: Date, default: null },
    max_uses: { type: Number, default: null, min: 1 },
    per_phone_limit: { type: Number, default: null, min: 1 },
    used_count: { type: Number, default: 0, min: 0 },
    is_active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One code per venue — the database, not a read-then-write, is what refuses the duplicate.
// It is also the lookup a guest's code is resolved through.
venueFoodCouponSchema.index({ venue_id: 1, code: 1 }, { unique: true });
// The owner's list, newest first.
venueFoodCouponSchema.index({ venue_id: 1, created_at: -1 });

export const VenueFoodCouponModel = model<IVenueFoodCoupon>('VenueFoodCoupon', venueFoodCouponSchema);
