import { GraphQLError } from 'graphql';
import type { Types } from 'mongoose';
import { logs } from '@observability/log';
import { VenueFoodCouponModel, type IVenueFoodCoupon } from './venueFoodCoupon.model';
import { VenueFoodOrderModel, type IVenueFoodOrder } from './venueFoodOrder.model';
import { FOOD_LOG, text } from './venueFoodOrder.shared';

/**
 * A venue's coupon meeting an order: whether a code may be used right now, and
 * who moves its `used_count`.
 *
 * WHAT A USE IS
 * A use is an order that is PAID right now. Nothing is counted when an order
 * is placed — an unpaid order is only a quote — and exactly one thing counts
 * it: the single PENDING → PAID write in `markFoodOrderPaid`. A verify, a
 * status poll and the sweep can all land on that write together; one of them
 * matches PENDING and gets the order back, and only that one calls
 * `countFoodCouponUse`. The others read an order that is already PAID and
 * count nothing.
 *
 * THE LAST USE, HELD BY SEVERAL UNPAID ORDERS
 * `max_uses` is checked when an order is placed and never again. Two guests
 * who both placed while one use was left may therefore both pay, and the
 * coupon ends one over its cap. That is accepted on purpose, because both
 * alternatives are worse:
 *   - reserving a use at place time needs a release when the checkout is
 *     abandoned, and a food order has no such moment (it simply stays
 *     PENDING). Placing is public and needs no account, so anybody could
 *     drain a venue's coupon by opening carts they never pay for;
 *   - re-checking at payment time would mean refusing money Razorpay has
 *     already captured, at a price the guest was quoted and charged.
 * The overshoot is bounded by the checkouts open at that instant, each of them
 * a guest who really paid the venue. The per-number limit is checked the same
 * way and can overshoot the same way.
 *
 * A CANCELLED ORDER GIVES ITS USE BACK
 * Only the venue can cancel a paid order (the kitchen cannot serve it), and
 * the guest is refunded in full — they never had the meal the coupon was for.
 * So the single PAID → REFUND_PENDING write in `cancel` releases the use, and
 * the per-number limit, which counts orders that are PAID, stops counting it
 * in the same moment. A guest cannot trigger this, so it cannot be farmed.
 *
 * `used_count` lives on another document than the order, and this module —
 * like the rest of food ordering — runs without transactions. A process that
 * dies between the order's write and the counter's leaves the counter one
 * short (never one over); a failed counter write is logged, never thrown,
 * because the guest's payment has already been taken.
 */

export const FOOD_COUPON_REJECTIONS = [
  'INVALID',
  'NOT_STARTED',
  'EXPIRED',
  'MIN_ORDER_NOT_MET',
  'USAGE_LIMIT_REACHED',
  'PER_PERSON_LIMIT_REACHED',
  'NO_DISCOUNT',
] as const;
export type FoodCouponRejectionReason = (typeof FOOD_COUPON_REJECTIONS)[number];

export interface FoodCouponRejection {
  reason: FoodCouponRejectionReason;
  message: string;
}

/** What a code may look like — the finance coupon's own shape, so a venue owner learns one rule. */
export const FOOD_COUPON_CODE = /^[A-Z0-9][A-Z0-9_-]{2,29}$/;
const PHONE = /^\d{10}$/;

/** A code as it is stored and looked up; '' when none was sent. */
export const normalizeFoodCouponCode = (raw: unknown) => text(raw).toUpperCase();

export const rejected = (reason: FoodCouponRejectionReason, message: string): { rejection: FoodCouponRejection } => ({
  rejection: { reason, message },
});

/** Placing an order with a code that cannot be used is refused outright — the guest was quoted a price that no longer holds. */
export function couponRefused(rejection: FoodCouponRejection): never {
  throw new GraphQLError(rejection.message, {
    extensions: { code: 'FOOD_COUPON_REJECTED', reason: rejection.reason },
  });
}

const amountText = (paise: number, symbol: string) =>
  `${symbol}${paise % 100 === 0 ? paise / 100 : (paise / 100).toFixed(2)}`;

/** Why the coupon's own terms rule this order out, or null when they all allow it. */
function termsRejection(coupon: IVenueFoodCoupon, subtotalPaise: number, symbol: string) {
  const now = Date.now();
  if (coupon.valid_from && now < coupon.valid_from.getTime()) return rejected('NOT_STARTED', 'Coupon is not active yet');
  if (coupon.valid_until && now > coupon.valid_until.getTime()) return rejected('EXPIRED', 'Coupon has expired');
  if (subtotalPaise < coupon.min_order_paise) {
    return rejected('MIN_ORDER_NOT_MET', `Minimum order of ${amountText(coupon.min_order_paise, symbol)} required`);
  }
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
    return rejected('USAGE_LIMIT_REACHED', 'Coupon usage limit reached');
  }
  return null;
}

export interface FoodCouponCheck {
  venueId: Types.ObjectId;
  code: string;
  subtotalPaise: number;
  /** The guest's mobile number; the per-number limit is only checked once it is a full one. */
  phone: string;
  currencySymbol: string;
}

/**
 * Whether a code may be used on this order. A pure read.
 *
 * The lookup is by venue AND code, so a code that exists at another venue, a
 * code switched off and a code nobody ever made all answer the same INVALID.
 */
export async function evaluateFoodCoupon(
  check: FoodCouponCheck
): Promise<{ coupon: IVenueFoodCoupon } | { rejection: FoodCouponRejection }> {
  const invalid = rejected('INVALID', 'Invalid or inactive coupon code');
  if (!FOOD_COUPON_CODE.test(check.code)) return invalid;
  const coupon = await VenueFoodCouponModel.findOne({ venue_id: check.venueId, code: check.code });
  if (!coupon?.is_active) return invalid;
  const terms = termsRejection(coupon, check.subtotalPaise, check.currencySymbol);
  if (terms) return terms;
  const phone = check.phone.replaceAll(/\D/g, '');
  if (coupon.per_phone_limit != null && PHONE.test(phone)) {
    const used = await VenueFoodOrderModel.countDocuments({
      coupon_id: coupon._id,
      customer_phone: phone,
      payment_status: 'PAID',
    });
    if (used >= coupon.per_phone_limit) return rejected('PER_PERSON_LIMIT_REACHED', 'You have already used this coupon');
  }
  return { coupon };
}

type CountedOrder = Pick<IVenueFoodOrder, 'coupon_id' | 'order_no'>;

async function moveUsedCount(order: CountedOrder, by: 1 | -1) {
  if (!order.coupon_id) return;
  try {
    // A release never takes the counter under zero, and a coupon deleted since simply matches nothing.
    const filter = by === 1 ? { _id: order.coupon_id } : { _id: order.coupon_id, used_count: { $gt: 0 } };
    await VenueFoodCouponModel.updateOne(filter, { $inc: { used_count: by } });
  } catch (error) {
    logs.server.error(FOOD_LOG, 'coupon', {
      error,
      orderNo: order.order_no,
      couponId: order.coupon_id.toHexString(),
      by,
      msg: 'coupon use could not be counted — used_count needs a human',
    });
  }
}

/** Call ONLY with the order a guarded PENDING → PAID write just returned. */
export const countFoodCouponUse = (order: CountedOrder) => moveUsedCount(order, 1);

/** Call ONLY with the order a guarded PAID → REFUND_PENDING write just returned. */
export const releaseFoodCouponUse = (order: CountedOrder) => moveUsedCount(order, -1);
