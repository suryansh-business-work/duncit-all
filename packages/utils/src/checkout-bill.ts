/**
 * What a bill can actually absorb.
 *
 * A coupon and Duncit Coins both cut the same gross, and neither is allowed to
 * cut past zero: once the deductions cover the price the buyer pays ₹0 and the
 * leftover discount is simply dropped — never refunded, never carried, never
 * turned into a negative total. That rule is expressed ONCE here and mirrors
 * the server (`couponService.evaluate` clamps `final_total` at 0 and
 * `applyCoins` clamps the redemption to `floor(quote.total)`), so mWeb and the
 * native app can never preview a bill the server would price differently.
 */

/** Money rounding to 2dp — the finance engine's single-round rule. Without it a
 * discounted total carries float residue (₹359.10 − 359 = ₹0.10000000000002274)
 * straight onto the screen. */
export const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

/** Smallest amount the gateway will accept for an order (Razorpay: ₹1).
 * Server twin: `MIN_GATEWAY_CHARGE` in payment.service.ts. */
export const MIN_GATEWAY_CHARGE = 1;

/** What is left to pay once a deduction is taken: rounded, and never below zero. */
export const clampPayable = (amount: number): number => round2(Math.max(0, Number(amount) || 0));

/** One line of money taken off a bill — a coupon, redeemed coins. */
export interface BillDiscount {
  key: string;
  label: string;
  amount: number;
}

/** A bill after its deductions: the lines that were actually taken, what they
 * came to, and what is left to charge. */
export interface DiscountedBill {
  /** The deductions as they should be PRINTED — each capped at what was still
   * owed when its turn came, so the rows always reconcile to `payable`. */
  discounts: BillDiscount[];
  /** The sum of the printed deductions (never more than the gross). */
  discountTotal: number;
  /** What the buyer is charged. Never negative. */
  payable: number;
}

/**
 * Take the deductions off a bill in the order they were applied, stopping at
 * zero.
 *
 * A discount worth more than what is still owed is only taken for what is owed;
 * the excess is ignored and pays nothing back. So a ₹399 ticket with a ₹500
 * coupon prints "− ₹399" and charges ₹0 — never "− ₹500" and a −₹101 total.
 */
export function applyBillDiscounts(
  gross: number,
  discounts: readonly BillDiscount[],
): DiscountedBill {
  const grossTotal = clampPayable(gross);
  let remaining = grossTotal;
  const taken: BillDiscount[] = [];
  for (const discount of discounts) {
    const wanted = clampPayable(discount.amount);
    const amount = Math.min(wanted, remaining);
    if (amount > 0) {
      taken.push({ ...discount, amount: round2(amount) });
      remaining = clampPayable(remaining - amount);
    }
  }
  return { discounts: taken, discountTotal: round2(grossTotal - remaining), payable: remaining };
}

/**
 * The most whole coins a bill can absorb — capped by the balance and by what is
 * owed after the coupon, floored because `redeem_coins` is an Int. Never
 * negative.
 *
 * Coins are whole rupees but a bill need not be, so redeeming the floor of a
 * ₹359.10 bill would leave ₹0.10 to charge — under the gateway's ₹1 minimum,
 * which rejects the order outright. The server hands one coin back in exactly
 * that case, so the preview does too; otherwise the screen promises a total the
 * buyer is never charged. Redeeming down to exactly ₹0 is fine — that path
 * skips the gateway altogether.
 */
export function maxRedeemableCoins(balance: number, payableAfterCoupon: number): number {
  const owed = clampPayable(payableAfterCoupon);
  const affordable = Math.min(Math.floor(Number(balance) || 0), Math.floor(owed));
  if (affordable <= 0) return 0;
  const remainder = clampPayable(owed - affordable);
  if (remainder > 0 && remainder < MIN_GATEWAY_CHARGE) return Math.max(0, affordable - 1);
  return affordable;
}
