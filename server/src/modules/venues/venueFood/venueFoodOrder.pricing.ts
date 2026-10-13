import { VENUE_FOOD_DISCOUNT_MAX_PCT } from '@modules/venues/venue/venue.constants';

/**
 * What a food order costs — the one place the arithmetic lives. Placing an
 * order and previewing a coupon both price through here, and
 * `priceFoodCart` in `@duncit/utils` mirrors it line for line for display.
 *
 * Everything is whole paise:
 *   1. the venue's automatic discount comes off the subtotal, rounded DOWN;
 *   2. the coupon's percent comes off WHAT IS LEFT, rounded DOWN — the two
 *      never add up to more than either percent promised;
 *   3. the coupon is then trimmed so the guest still pays at least what the
 *      largest discount a venue may set (VENUE_FOOD_DISCOUNT_MAX_PCT) would
 *      leave, and never less than the gateway can charge. A coupon is trimmed,
 *      never refused, for being too generous.
 */

/** Razorpay will not open a sheet for less than one rupee. */
export const MIN_TOTAL_PAISE = 100;

export interface FoodTotals {
  subtotal_paise: number;
  /** The venue's automatic discount — exactly what these two meant before coupons existed. */
  discount_pct: number;
  discount_paise: number;
  /** The coupon's own percent, and what it actually took off after the caps. */
  coupon_pct: number;
  coupon_discount_paise: number;
  /** THE amount charged, reconciled against and refunded. */
  total_paise: number;
}

export function foodTotals(subtotalPaise: number, discountPct: number, couponPct = 0): FoodTotals {
  const discount = Math.floor((subtotalPaise * discountPct) / 100);
  const afterVenue = subtotalPaise - discount;
  const asked = Math.floor((afterVenue * couponPct) / 100);
  const leastPayable = Math.max(
    MIN_TOTAL_PAISE,
    subtotalPaise - Math.floor((subtotalPaise * VENUE_FOOD_DISCOUNT_MAX_PCT) / 100)
  );
  const couponDiscount = Math.max(0, Math.min(asked, afterVenue - leastPayable));
  return {
    subtotal_paise: subtotalPaise,
    discount_pct: discountPct,
    discount_paise: discount,
    coupon_pct: couponPct,
    coupon_discount_paise: couponDiscount,
    total_paise: afterVenue - couponDiscount,
  };
}
