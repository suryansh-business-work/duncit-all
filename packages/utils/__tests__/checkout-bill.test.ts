import { describe, expect, it } from 'vitest';
import {
  applyBillDiscounts,
  clampPayable,
  exclusiveOfGstBill,
  maxRedeemableCoins,
  round2,
  roundUpBill,
  settleBill,
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

describe('roundUpBill', () => {
  it.each([
    // [bill, rounded, roundOff]
    [101.47, 102, 0.53],
    [359.1, 360, 0.9],
    [499.5, 500, 0.5],
    [0.01, 1, 0.99],
    [1179.99, 1180, 0.01],
  ])('rounds ₹%p up to ₹%p, adding ₹%p', (bill, rounded, roundOff) => {
    expect(roundUpBill(bill)).toEqual({ rounded, roundOff });
  });

  it.each([0, 1, 399, 1180])('adds nothing to a bill of ₹%p that is already whole', (bill) => {
    expect(roundUpBill(bill)).toEqual({ rounded: bill, roundOff: 0 });
  });

  it('always rounds up — never to the nearest rupee', () => {
    expect(roundUpBill(100.01)).toEqual({ rounded: 101, roundOff: 0.99 });
  });

  // 0.1 + 0.2-style residue must not turn a whole bill into the next rupee.
  it('does not let float residue tip a whole amount over', () => {
    expect(roundUpBill(118.00000000000001)).toEqual({ rounded: 118, roundOff: 0 });
    expect(roundUpBill(359.1 - 0.1)).toEqual({ rounded: 359, roundOff: 0 });
  });

  it('treats a negative or non-numeric bill as nothing to charge', () => {
    expect(roundUpBill(-12.5)).toEqual({ rounded: 0, roundOff: 0 });
    expect(roundUpBill(Number.NaN)).toEqual({ rounded: 0, roundOff: 0 });
  });
});

describe('settleBill', () => {
  it('rounds a bill up when no coins are spent, keeping the round-off out of the taxable value', () => {
    expect(settleBill(101.47, 0)).toEqual({ coins: 0, payable: 102, roundOff: 0.53, taxable: 101.47 });
  });

  it('leaves an already-whole bill exactly as it was', () => {
    expect(settleBill(399, 0)).toEqual({ coins: 0, payable: 399, roundOff: 0, taxable: 399 });
  });

  // The ₹1.47 bug: coins used to stop at 100 and ₹1.47 went through the gateway.
  it('lets whole coins clear a bill that ended in paise', () => {
    expect(settleBill(101.47, 102)).toEqual({ coins: 102, payable: 0, roundOff: 0, taxable: 0 });
  });

  it('charges whole rupees when coins cover only part of the bill', () => {
    const bill = settleBill(101.47, 60);
    expect(bill).toEqual({ coins: 60, payable: 42, roundOff: 0.53, taxable: 41.47 });
    // What is charged is the taxed value plus the round-off, to the paisa.
    expect(round2(bill.taxable + bill.roundOff)).toBe(bill.payable);
  });

  it('never spends more coins than the rounded bill', () => {
    expect(settleBill(101.47, 5000)).toMatchObject({ coins: 102, payable: 0 });
  });

  it('floors a fractional coin count and ignores a negative or non-numeric one', () => {
    expect(settleBill(200, 10.9)).toMatchObject({ coins: 10, payable: 190 });
    expect(settleBill(200, -4)).toMatchObject({ coins: 0, payable: 200 });
    expect(settleBill(200, Number.NaN)).toMatchObject({ coins: 0, payable: 200 });
  });

  it('settles a bill a coupon took to zero at zero', () => {
    expect(settleBill(0, 25)).toEqual({ coins: 0, payable: 0, roundOff: 0, taxable: 0 });
    expect(settleBill(-30, 0)).toEqual({ coins: 0, payable: 0, roundOff: 0, taxable: 0 });
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

  // Coins are whole rupees but a bill need not be, so the bill is rounded UP to
  // the whole rupee before coins are spent on it: ₹359.10 is a ₹360 bill, and
  // 360 coins clear it. (The floor used to leave paise for the gateway.)
  it('covers a bill that ends in paise by rounding it up first', () => {
    expect(maxRedeemableCoins(500, 359.1)).toBe(360);
    expect(maxRedeemableCoins(360, 359.1)).toBe(360);
  });

  it('spends the whole balance when it stops short of the rounded bill', () => {
    // 359 coins off a ₹360 bill leave exactly ₹1 — a whole rupee to charge.
    expect(maxRedeemableCoins(359, 359.1)).toBe(359);
    expect(maxRedeemableCoins(1, 1.5)).toBe(1);
  });

  it('never leaves paise behind: what is left after the coins is a whole number', () => {
    for (const [balance, bill] of [[358, 359.1], [1, 2], [40, 101.47], [7, 0.5]] as const) {
      const coinsTaken = maxRedeemableCoins(balance, bill);
      expect(Number.isInteger(settleBill(bill, coinsTaken).payable)).toBe(true);
    }
  });

  it('spends one coin on a sub-rupee bill, which is a ₹1 bill once rounded', () => {
    expect(maxRedeemableCoins(10, 0.5)).toBe(1);
  });

  // ₹398.999 is ₹399.00 as money — a whole bill, not one a paisa over ₹398.
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

describe('exclusiveOfGstBill', () => {
  it('restates the multi-ticket discount net of GST so subtotal − discount is the taxable value', () => {
    // ₹250 × 3 at 5% off: ₹712.50 charged, GST extracted from it is ₹108.69.
    const bill = exclusiveOfGstBill(750, [line({ key: 'ticketDiscount', amount: 37.5 })], 603.81, 18);
    expect(bill.subtotal).toBe(635.59);
    expect(bill.discounts).toEqual([{ key: 'ticketDiscount', label: 'Coupon WELCOME', amount: 31.78 }]);
    expect(round2(bill.subtotal - bill.discounts[0].amount)).toBe(603.81);
  });

  it('extracts each deduction on its own and lets the last absorb the rounding', () => {
    // ₹750 − ₹37.50 tier − 50 coins = ₹662.50 charged; its taxable value is ₹561.44.
    const bill = exclusiveOfGstBill(750, [line({ key: 'ticketDiscount', amount: 37.5 }), coins(50)], 561.44, 18);
    expect(bill.discounts.map((d) => d.amount)).toEqual([31.78, 42.37]);
    const taxable = bill.discounts.reduce((left, d) => round2(left - d.amount), bill.subtotal);
    expect(taxable).toBe(561.44);
  });

  it('prints the taxable value as the subtotal when nothing was deducted', () => {
    expect(exclusiveOfGstBill(750, [], 635.59, 18)).toEqual({ subtotal: 635.59, discounts: [] });
  });

  it('drops a deduction that came to nothing instead of printing a zero row', () => {
    const bill = exclusiveOfGstBill(750, [line({ amount: 0 }), coins(37.5)], 603.81, 18);
    expect(bill.discounts).toEqual([{ key: 'coins', label: 'Duncit Coins', amount: 31.78 }]);
  });

  it('keeps the deductions whole when no GST is charged', () => {
    const bill = exclusiveOfGstBill(500, [coins(100)], 400, 0);
    expect(bill).toEqual({ subtotal: 500, discounts: [{ key: 'coins', label: 'Duncit Coins', amount: 100 }] });
  });
});
