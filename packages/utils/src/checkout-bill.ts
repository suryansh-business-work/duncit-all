/**
 * What a bill can actually absorb.
 *
 * A coupon and Duncit Coins both cut the same gross, and neither is allowed to
 * cut past zero: once the deductions cover the price the buyer pays ₹0 and the
 * leftover discount is simply dropped — never refunded, never carried, never
 * turned into a negative total. That rule is expressed ONCE here and mirrors
 * the server (`couponService.evaluate` clamps `final_total` at 0 and
 * `applyCoins` rounds the bill up to a whole rupee before clamping the
 * redemption to it), so mWeb and the native app can never preview a bill the
 * server would price differently.
 */

/** Money rounding to 2dp — the finance engine's single-round rule. Without it a
 * discounted total carries float residue (₹359.10 − 359 = ₹0.10000000000002274)
 * straight onto the screen. */
export const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

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

/** A bill rounded up to the whole rupee, and what the rounding added. */
export interface RoundedBill {
  /** The bill in whole rupees — what coins are spent against. */
  rounded: number;
  /** What rounding added: 0 for an already-whole bill, always under ₹1. */
  roundOff: number;
}

/**
 * Round a bill UP to the next whole rupee — the rule every Duncit checkout
 * charges by. Server twin: `roundUpBill` in payment.roundoff.ts.
 *
 * Worked in paise so float residue cannot tip a whole amount over: ₹118 held as
 * 118.00000000000001 stays ₹118 with nothing added, not ₹119.
 */
export function roundUpBill(amount: number): RoundedBill {
  const paise = Math.round(clampPayable(amount) * 100);
  const rounded = Math.ceil(paise / 100);
  return { rounded, roundOff: (rounded * 100 - paise) / 100 };
}

/**
 * The most whole coins a bill can absorb — capped by the balance and by what is
 * owed after the coupon, ROUNDED UP to the whole rupee first. Never negative.
 *
 * Coins are whole rupees but a bill need not be. The bill is therefore rounded
 * up before coins are spent on it, exactly as the server does, so whole coins
 * can always clear all of it: a ₹359.10 bill is ₹360, and 360 coins leave ₹0.
 * (Capping at the floor instead left paise that had to go through the gateway.)
 */
export function maxRedeemableCoins(balance: number, payableAfterCoupon: number): number {
  const { rounded } = roundUpBill(payableAfterCoupon);
  return Math.max(0, Math.min(Math.floor(Number(balance) || 0), rounded));
}

/** A bill once it is rounded up and the coins are taken: what the buyer sees. */
export interface SettledBill {
  /** Coins actually spent — the ask, capped at the rounded bill. */
  coins: number;
  /** What is charged: always a whole number of rupees, never negative. */
  payable: number;
  /** The round-off inside `payable`. Zero when coins cleared the whole bill —
   * it was then paid in coins and there is no charge for a row to explain. */
  roundOff: number;
  /** The GST-inclusive value the tax lines are worked out on: the bill less the
   * coins, WITHOUT the round-off, never below zero. */
  taxable: number;
}

/**
 * Settle a couponed bill the way the server's `applyCoins` does: round it up to
 * the whole rupee, then take the coins off the rounded figure.
 *
 * The round-off is not taxable — `taxable` is what the screen extracts GST
 * from, and `taxable + roundOff = payable` whenever anything is charged.
 */
export function settleBill(payableAfterCoupon: number, coinsApplied: number): SettledBill {
  const owed = clampPayable(payableAfterCoupon);
  const bill = roundUpBill(owed);
  const coins = Math.max(0, Math.min(Math.floor(Number(coinsApplied) || 0), bill.rounded));
  const payable = bill.rounded - coins;
  return {
    coins,
    payable,
    roundOff: payable > 0 ? bill.roundOff : 0,
    taxable: clampPayable(owed - coins),
  };
}
