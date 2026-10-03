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

/** A GST-inclusive bill restated the way GST law prints it: the price net of
 * tax, each deduction net of tax, then the taxable value the GST is charged on. */
export interface ExclusiveOfGstBill<T extends { amount: number }> {
  /** The gross before any deduction, with its GST taken out. */
  subtotal: number;
  /** The same deductions, each with its GST share taken out. */
  discounts: T[];
}

/**
 * Restate an inclusive bill's deductions exclusive of GST.
 *
 * A discount shown on the invoice comes off the value of supply BEFORE tax
 * (CGST Act s.15(3)(a)), and every Duncit deduction cuts the gross with the tax
 * re-extracted from what is left. So the compliant reading is
 * subtotal − discounts = taxable value, + GST = total — with the discounts
 * stated net of tax, or the GST row would describe money nobody pays.
 *
 * `taxable` is the charged bill's own net (the server's quote), never re-derived
 * here, so the GST row stays the tax actually charged. Each deduction is
 * extracted on its own and the LAST one absorbs the rounding, so the rows
 * reconcile to the paisa. With nothing deducted the subtotal IS the taxable value.
 */
export function exclusiveOfGstBill<T extends { amount: number }>(
  gross: number,
  discounts: readonly T[],
  taxable: number,
  gstPct: number,
): ExclusiveOfGstBill<T> {
  const g = Number(gstPct) || 0;
  const taken = discounts.filter((discount) => clampPayable(discount.amount) > 0);
  if (taken.length === 0) return { subtotal: round2(taxable), discounts: [] };
  const grossTotal = clampPayable(gross);
  const subtotal = round2(grossTotal - round2((grossTotal * g) / (100 + g)));
  let remaining = round2(subtotal - round2(taxable));
  const net = taken.map((discount, index) => {
    const amount =
      index === taken.length - 1
        ? remaining
        : round2((clampPayable(discount.amount) * 100) / (100 + g));
    remaining = round2(remaining - amount);
    return { ...discount, amount };
  });
  return { subtotal, discounts: net };
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
