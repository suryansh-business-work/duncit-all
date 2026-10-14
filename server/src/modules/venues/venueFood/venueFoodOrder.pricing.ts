import type { FoodTax } from '@modules/finance/finance/foodTaxDefaults';
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
 *      never refused, for being too generous;
 *   4. GST meets what is left after both discounts (the "net"), rounded HALF
 *      UP to a whole paisa with integer arithmetic only:
 *        INCLUSIVE — the net already holds the tax:
 *          taxable = round(net × 100 / (100 + pct)), tax = net − taxable,
 *          total = net (the bill does not move);
 *        EXCLUSIVE — the tax is added on top:
 *          taxable = net, tax = round(net × pct / 100), total = net + tax.
 *      Either way total = taxable + tax, exactly.
 *
 * Steps 1–3 and the one-rupee minimum work on the net — the pre-tax amount —
 * exactly as they did before tax existed.
 */

/** Razorpay will not open a sheet for less than one rupee. */
export const MIN_TOTAL_PAISE = 100;

/** No tax at all: what an order priced without one — or placed before GST existed — reads as. */
export const NO_FOOD_TAX: FoodTax = { tax_mode: 'INCLUSIVE', gst_pct: 0 };

export interface FoodTotals {
  subtotal_paise: number;
  /** The venue's automatic discount — exactly what these two meant before coupons existed. */
  discount_pct: number;
  discount_paise: number;
  /** The coupon's own percent, and what it actually took off after the caps. */
  coupon_pct: number;
  coupon_discount_paise: number;
  /** How the GST met the net, and at what percent. */
  tax_mode: FoodTax['tax_mode'];
  gst_pct: number;
  /** The value the GST is charged on — the bill without its GST. */
  taxable_paise: number;
  tax_paise: number;
  /** THE amount charged, reconciled against and refunded: taxable_paise + tax_paise. */
  total_paise: number;
}

/** a ÷ b rounded half up, for a ≥ 0 and b > 0 — exact, never a float. */
const roundHalfUp = (a: number, b: number) => Math.floor((2 * a + b) / (2 * b));

/** A percent only a whole positive number may be; anything else is no tax. */
const wholePct = (pct: number) => (Number.isInteger(pct) && pct > 0 ? pct : 0);

export function foodTotals(subtotalPaise: number, discountPct: number, couponPct = 0, tax: FoodTax = NO_FOOD_TAX): FoodTotals {
  const discount = Math.floor((subtotalPaise * discountPct) / 100);
  const afterVenue = subtotalPaise - discount;
  const asked = Math.floor((afterVenue * couponPct) / 100);
  const leastPayable = Math.max(
    MIN_TOTAL_PAISE,
    subtotalPaise - Math.floor((subtotalPaise * VENUE_FOOD_DISCOUNT_MAX_PCT) / 100)
  );
  const couponDiscount = Math.max(0, Math.min(asked, afterVenue - leastPayable));
  const net = afterVenue - couponDiscount;
  const pct = wholePct(tax.gst_pct);
  const exclusive = tax.tax_mode === 'EXCLUSIVE';
  const taxable = exclusive ? net : roundHalfUp(net * 100, 100 + pct);
  const taxPaise = exclusive ? roundHalfUp(net * pct, 100) : net - taxable;
  return {
    subtotal_paise: subtotalPaise,
    discount_pct: discountPct,
    discount_paise: discount,
    coupon_pct: couponPct,
    coupon_discount_paise: couponDiscount,
    tax_mode: tax.tax_mode,
    gst_pct: pct,
    taxable_paise: taxable,
    tax_paise: taxPaise,
    total_paise: taxable + taxPaise,
  };
}

/**
 * The GST as an intra-state invoice states it: half central, half state. The
 * odd paisa of an odd tax goes to the state half, so the two always add up to
 * exactly the tax charged.
 */
export const splitFoodGst = (taxPaise: number) => {
  const cgst = Math.floor(taxPaise / 2);
  return { cgst_paise: cgst, sgst_paise: taxPaise - cgst };
};

/** What the guest owes before GST — the amount the one-rupee minimum is held to. */
export const preTaxPaise = (totals: Pick<FoodTotals, 'total_paise' | 'tax_paise' | 'tax_mode'>) =>
  totals.tax_mode === 'EXCLUSIVE' ? totals.total_paise - totals.tax_paise : totals.total_paise;
