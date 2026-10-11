/**
 * The round-off rule, stated once for every checkout on the server.
 *
 * A bill is rounded UP to the next whole rupee before Duncit Coins are taken
 * off it. Coins are whole rupees, so they could never clear a bill that ended
 * in paise: a ₹101.47 cart paid "entirely" in coins still charged ₹1.47 through
 * the gateway. Rounded first, the same cart is ₹102 — 102 coins leave exactly
 * ₹0, and anything that IS charged is a whole number of rupees.
 *
 * The difference is the payment's `round_off` (0 ≤ round_off < 1). It is its own
 * line: never part of the taxable value, the GST, the platform fee, a
 * commission or a settlement — all of those keep reading `subtotal` and
 * `gst_amount`, which this rule does not touch.
 *
 * What a payment stores, and how it adds up:
 *
 *   total + coins_redeemed = bill before coins + round_off
 *   subtotal + gst_amount  = total − round_off      (while anything is charged)
 *   subtotal + gst_amount  = 0                      (coins cleared the bill:
 *                                                    the round-off went in coins)
 *
 * This module imports nothing, so the invoice, the refund share and the Finance
 * reads can all use it without pulling the payment service in behind them.
 * Client twin: `roundUpBill` in @duncit/utils (checkout-bill.ts).
 */

export interface RoundedBill {
  /** The bill in whole rupees — what coins are spent against. */
  rounded: number;
  /** What rounding added: 0 for an already-whole bill, always under ₹1. */
  round_off: number;
}

/**
 * Round a bill up to the next whole rupee.
 *
 * Worked in paise so float residue cannot tip a whole amount over: 118.00 held
 * as 118.00000000000001 must stay ₹118 with nothing added, not become ₹119.
 */
export function roundUpBill(amount: number): RoundedBill {
  const paise = Math.max(0, Math.round((Number(amount) || 0) * 100));
  const rounded = Math.ceil(paise / 100);
  return { rounded, round_off: (rounded * 100 - paise) / 100 };
}

/** The fields of a payment the round-off readers need — a document or a lean row. */
export interface RoundOffSource {
  total?: number | null;
  round_off?: number | null;
}

/** A payment's round-off. Payments taken before the rule existed carry none. */
export function roundOffOf(payment: RoundOffSource): number {
  return Math.max(0, Number(payment.round_off) || 0);
}

/**
 * The round-off that is part of the money actually charged.
 *
 * Zero when coins cleared the whole bill: the round-off was then paid in coins,
 * so nothing was charged and an invoice line for it would not add up to its ₹0
 * total.
 */
export function chargedRoundOff(payment: RoundOffSource): number {
  return (Number(payment.total) || 0) > 0 ? roundOffOf(payment) : 0;
}
