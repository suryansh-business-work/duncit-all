import { describe, expect, it } from 'vitest';
import {
  MIN_GATEWAY_CHARGE,
  applyBillDiscounts,
  clampPayable,
  maxRedeemableCoins,
  round2,
  type BillDiscount,
} from '../src/checkout-bill';

/** A deduction line, with only the fields under test set deliberately. */
const line = (over: Partial<BillDiscount> = {}): BillDiscount => ({
  key: 'coupon',
  label: 'Coupon WELCOME',
  amount: 100,
  ...over,
});

/** A redeemed-coins line — coins are always the second deduction on a bill. */
const coins = (amount: number): BillDiscount =>
  line({ key: 'coins', label: 'Duncit Coins', amount });

describe('round2', () => {
  it('rounds money to two decimal places, half up', () => {
    expect(round2(10.126)).toBe(10.13);
    expect(round2(10.124)).toBe(10.12);
    // An exact half-paisa (10.125 is a clean binary fraction) rounds UP to the
    // next paisa, not to even and not down.
    expect(round2(10.125)).toBe(10.13);
  });

  // The bug this exists for: ₹359.10 − 359 is 0.10000000000002274 in floating
  // point, and that residue used to land on the screen.
  it('strips float residue from a subtraction', () => {
    expect(round2(359.1 - 359)).toBe(0.1);
  });

  it('leaves a clean 2dp amount untouched', () => {
    expect(round2(399)).toBe(399);
    expect(round2(0.5)).toBe(0.5);
  });

  it('treats a non-numeric or missing amount as zero', () => {
    expect(round2(Number.NaN)).toBe(0);
    expect(round2(null as unknown as number)).toBe(0);
    expect(round2('abc' as unknown as number)).toBe(0);
  });

  it('coerces a numeric string from the API', () => {
    expect(round2('12.5' as unknown as number)).toBe(12.5);
  });
});

describe('MIN_GATEWAY_CHARGE', () => {
  it('is the ₹1 floor the gateway accepts for an order', () => {
    expect(MIN_GATEWAY_CHARGE).toBe(1);
  });
});

describe('clampPayable', () => {
  it('rounds what is left to pay to two decimal places', () => {
    expect(clampPayable(66.666)).toBe(66.67);
    expect(clampPayable(359.1 - 359)).toBe(0.1);
  });

  // A deduction larger than the bill never produces a refund: the buyer pays ₹0.
  it('never goes below zero', () => {
    expect(clampPayable(-101)).toBe(0);
    expect(clampPayable(-0.004)).toBe(0);
  });

  it('treats a non-numeric amount as nothing owed', () => {
    expect(clampPayable(Number.NaN)).toBe(0);
    expect(clampPayable(undefined as unknown as number)).toBe(0);
  });
});

describe('applyBillDiscounts', () => {
  it('charges the full gross when nothing is deducted', () => {
    expect(applyBillDiscounts(399, [])).toEqual({ discounts: [], discountTotal: 0, payable: 399 });
  });

  it('takes a coupon smaller than the bill in full', () => {
    const bill = applyBillDiscounts(399, [line({ amount: 100 })]);
    expect(bill.discounts).toEqual([line({ amount: 100 })]);
    expect(bill.discountTotal).toBe(100);
    expect(bill.payable).toBe(299);
  });

  // The doc example: a ₹399 ticket with a ₹500 coupon prints "− ₹399" and
  // charges ₹0 — never "− ₹500" and a −₹101 total. The excess is dropped, not
  // refunded.
  it('caps a discount at what is owed and drops the excess', () => {
    const bill = applyBillDiscounts(399, [line({ amount: 500 })]);
    expect(bill.discounts).toEqual([line({ amount: 399 })]);
    expect(bill.discountTotal).toBe(399);
    expect(bill.payable).toBe(0);
  });

  it('takes the deductions in the order given, each against what is still owed', () => {
    const bill = applyBillDiscounts(399, [line({ amount: 100 }), coins(500)]);
    expect(bill.discounts.map((d) => [d.key, d.amount])).toEqual([
      ['coupon', 100],
      ['coins', 299],
    ]);
    expect(bill.discountTotal).toBe(399);
    expect(bill.payable).toBe(0);
  });

  // Once the coupon has zeroed the bill there is nothing for coins to cut, so
  // the coins row must not print a "− ₹0" line.
  it('omits a deduction that arrives after the bill has already reached zero', () => {
    const bill = applyBillDiscounts(100, [line({ amount: 100 }), coins(50)]);
    expect(bill.discounts.map((d) => d.key)).toEqual(['coupon']);
    expect(bill.discountTotal).toBe(100);
    expect(bill.payable).toBe(0);
  });

  it('omits a zero, negative or non-numeric deduction', () => {
    const bill = applyBillDiscounts(100, [
      line({ key: 'zero', amount: 0 }),
      line({ key: 'negative', amount: -20 }),
      line({ key: 'nan', amount: Number.NaN }),
      coins(10),
    ]);
    expect(bill.discounts.map((d) => d.key)).toEqual(['coins']);
    expect(bill.discountTotal).toBe(10);
    expect(bill.payable).toBe(90);
  });

  it('treats a negative or non-numeric gross as a ₹0 bill nothing can be taken off', () => {
    const empty = { discounts: [], discountTotal: 0, payable: 0 };
    expect(applyBillDiscounts(-50, [line()])).toEqual(empty);
    expect(applyBillDiscounts(Number.NaN, [line()])).toEqual(empty);
  });

  it('keeps the key and label of each printed line', () => {
    const bill = applyBillDiscounts(500, [
      line({ key: 'promo', label: 'Promo SAVE10', amount: 50 }),
    ]);
    expect(bill.discounts).toEqual([{ key: 'promo', label: 'Promo SAVE10', amount: 50 }]);
  });

  it('does not mutate the discounts it was handed', () => {
    const coupon = line({ amount: 500 });
    const input = [coupon];
    applyBillDiscounts(399, input);
    expect(coupon.amount).toBe(500);
    expect(input).toEqual([line({ amount: 500 })]);
  });

  it('rounds every figure to two decimal places', () => {
    const bill = applyBillDiscounts(100, [line({ amount: 33.333 })]);
    expect(bill.discounts).toEqual([line({ amount: 33.33 })]);
    expect(bill.discountTotal).toBe(33.33);
    expect(bill.payable).toBe(66.67);
  });

  // ₹359.10 − ₹359 must read ₹0.10, not ₹0.10000000000002274.
  it('leaves no float residue on the payable', () => {
    const bill = applyBillDiscounts(359.1, [line({ amount: 359 })]);
    expect(bill.payable).toBe(0.1);
    expect(bill.discountTotal).toBe(359);
  });

  // The printed rows must always add up: gross − Σ rows = payable, otherwise
  // the receipt contradicts the charge.
  it('prints rows that reconcile to the payable', () => {
    const gross = 1249.5;
    const bill = applyBillDiscounts(gross, [line({ amount: 300 }), coins(2000)]);
    // The coins row is capped at the fractional ₹949.50 still owed after the
    // coupon — the printed rows are the literal amounts, not the requests.
    expect(bill.discounts.map((d) => d.amount)).toEqual([300, 949.5]);
    expect(bill.discountTotal).toBe(1249.5);
    expect(bill.payable).toBe(0);
    expect(300 + 949.5 + bill.payable).toBe(gross);
  });
});

describe('maxRedeemableCoins', () => {
  // Redeeming down to exactly ₹0 skips the gateway, so its minimum never bites.
  it('redeems the whole bill when the balance covers it', () => {
    expect(maxRedeemableCoins(500, 399)).toBe(399);
  });

  it('is capped by the balance when the bill is larger', () => {
    expect(maxRedeemableCoins(100, 399)).toBe(100);
    expect(maxRedeemableCoins(100, 359.1)).toBe(100);
  });

  it('floors a fractional balance because redeem_coins is an Int', () => {
    expect(maxRedeemableCoins(10.9, 50)).toBe(10);
  });

  // Coins are whole rupees but a bill need not be: the floor of ₹359.10 is 359
  // coins, which would leave ₹0.10 — under the gateway's ₹1 minimum, which
  // rejects the order. The server hands one coin back, so the preview must too.
  it('hands one coin back when the leftover would be under the gateway minimum', () => {
    expect(maxRedeemableCoins(500, 359.1)).toBe(358);
    expect(maxRedeemableCoins(359, 359.1)).toBe(358);
  });

  it('hands nothing back once the balance stops short and the leftover is chargeable', () => {
    // 358 coins leave ₹1.10 to charge — at or above the minimum, so no hand-back.
    expect(maxRedeemableCoins(358, 359.1)).toBe(358);
  });

  // The gateway accepts exactly ₹1, so a leftover of precisely the minimum is
  // chargeable and costs no coin — the cut-off is strictly below ₹1, not at it.
  it('keeps every coin when the leftover is exactly the gateway minimum', () => {
    expect(maxRedeemableCoins(358, 359)).toBe(358);
    expect(maxRedeemableCoins(1, 2)).toBe(1);
  });

  // The hand-back can take the only coin: 1 coin off ₹1.50 leaves ₹0.50, which
  // the gateway refuses, so the buyer pays the full ₹1.50 and keeps the coin.
  it('can hand back the only affordable coin rather than strand a sub-minimum charge', () => {
    expect(maxRedeemableCoins(1, 1.5)).toBe(0);
  });

  it('redeems nothing against a sub-rupee bill, since a coin cannot be split', () => {
    expect(maxRedeemableCoins(10, 0.5)).toBe(0);
  });

  // Without the 2dp rounding ₹398.999 would floor to 398, leave ₹0.999 and hand
  // a coin back; as money it is ₹399.00, which 399 coins clear exactly.
  it('rounds the bill to paise before deciding', () => {
    expect(maxRedeemableCoins(500, 398.999)).toBe(399);
  });

  it('is zero with no balance or no bill', () => {
    expect(maxRedeemableCoins(0, 399)).toBe(0);
    expect(maxRedeemableCoins(500, 0)).toBe(0);
  });

  it('is never negative for a negative or non-numeric input', () => {
    expect(maxRedeemableCoins(-5, 399)).toBe(0);
    expect(maxRedeemableCoins(500, -10)).toBe(0);
    expect(maxRedeemableCoins(Number.NaN, 399)).toBe(0);
    expect(maxRedeemableCoins(500, Number.NaN)).toBe(0);
  });
});
