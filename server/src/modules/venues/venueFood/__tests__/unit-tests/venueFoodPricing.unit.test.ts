import { VENUE_FOOD_DISCOUNT_MAX_PCT } from '@modules/venues/venue/venue.constants';
import type { IVenueFoodOrder } from '../../venueFoodOrder.model';
import { MIN_TOTAL_PAISE, NO_FOOD_TAX, foodTotals, preTaxPaise, splitFoodGst } from '../../venueFoodOrder.pricing';
import { foodOrderTax, toFoodOrderPub } from '../../venueFoodOrder.shared';
import { invoiceTitle, taxNote } from '../../venueFoodInvoice.pdf';
import { effectiveFoodTax } from '@modules/finance/finance/foodTaxDefaults';
import { FOOD_COUPON_CODE, normalizeFoodCouponCode } from '../../venueFoodCoupon.redemption';
import { PRICING_CASES } from '../foodTestKit';

describe('foodTotals', () => {
  it('reads a matrix that covers each pricing situation', () => {
    expect(PRICING_CASES.length).toBeGreaterThanOrEqual(10);
    expect(PRICING_CASES.some((one) => one.discount_pct > 0 && one.coupon_pct > 0)).toBe(true);
  });

  // The same rows `priceFoodCart` is asserted against in packages/utils.
  it.each(PRICING_CASES)('prices "$name" to the paise the guest was shown', (fixture) => {
    const tax = { tax_mode: fixture.tax_mode, gst_pct: fixture.gst_pct };
    const totals = foodTotals(fixture.subtotal_paise, fixture.discount_pct, fixture.coupon_pct, tax);
    expect(totals).toEqual({
      subtotal_paise: fixture.subtotal_paise,
      discount_pct: fixture.discount_pct,
      discount_paise: fixture.discount_paise,
      coupon_pct: fixture.coupon_pct,
      coupon_discount_paise: fixture.coupon_discount_paise,
      tax_mode: fixture.tax_mode,
      gst_pct: fixture.gst_pct,
      taxable_paise: fixture.taxable_paise,
      tax_paise: fixture.tax_paise,
      total_paise: fixture.total_paise,
    });
    expect(preTaxPaise(totals) < MIN_TOTAL_PAISE).toBe(fixture.below_minimum);
  });

  it('prices an order without a coupon exactly as it was priced before coupons existed', () => {
    // floor(52875 × 15 / 100) = 7931, never 7932.
    expect(foodTotals(52875, 15)).toEqual({
      subtotal_paise: 52875,
      discount_pct: 15,
      discount_paise: 7931,
      coupon_pct: 0,
      coupon_discount_paise: 0,
      tax_mode: 'INCLUSIVE',
      gst_pct: 0,
      taxable_paise: 44944,
      tax_paise: 0,
      total_paise: 44944,
    });
    expect(foodTotals(48000, 0).total_paise).toBe(48000);
  });

  it('takes the coupon off what the venue discount left, not off the subtotal', () => {
    // 10% of 100000 leaves 90000; 10% of THAT is 9000 — not the 10000 a second cut of the subtotal would be.
    expect(foodTotals(100000, 10, 10)).toMatchObject({ discount_paise: 10000, coupon_discount_paise: 9000, total_paise: 81000 });
  });

  it('keeps the venue discount fields meaning the venue discount alone when a coupon is added', () => {
    const plain = foodTotals(52875, 10);
    const withCoupon = foodTotals(52875, 10, 20);
    expect(withCoupon.discount_pct).toBe(plain.discount_pct);
    expect(withCoupon.discount_paise).toBe(plain.discount_paise);
    expect(withCoupon.total_paise).toBe(plain.total_paise - withCoupon.coupon_discount_paise);
  });

  it('never lets the two discounts together pass the ceiling a venue discount is held to', () => {
    for (const subtotal of [100, 199, 1000, 5997, 52875, 100000, 9999999]) {
      const leastAtCeiling = subtotal - Math.floor((subtotal * VENUE_FOOD_DISCOUNT_MAX_PCT) / 100);
      for (const discountPct of [0, 1, 33, 50, 89, VENUE_FOOD_DISCOUNT_MAX_PCT]) {
        for (const couponPct of [1, 10, 50, VENUE_FOOD_DISCOUNT_MAX_PCT]) {
          const totals = foodTotals(subtotal, discountPct, couponPct);
          expect(totals.coupon_discount_paise).toBeGreaterThanOrEqual(0);
          expect(totals.total_paise).toBe(subtotal - totals.discount_paise - totals.coupon_discount_paise);
          expect(totals.total_paise).toBeGreaterThanOrEqual(leastAtCeiling);
          // A coupon is trimmed to keep the order chargeable; it is never what makes one unchargeable.
          const withoutCoupon = foodTotals(subtotal, discountPct).total_paise;
          expect(totals.total_paise).toBeGreaterThanOrEqual(Math.min(withoutCoupon, MIN_TOTAL_PAISE));
        }
      }
    }
  });

  it('keeps one rupee payable, the least the gateway will charge', () => {
    expect(MIN_TOTAL_PAISE).toBe(100);
    expect(foodTotals(200, 0, 90)).toMatchObject({ coupon_discount_paise: 100, total_paise: 100 });
    expect(foodTotals(150, 0, 90)).toMatchObject({ coupon_discount_paise: 50, total_paise: 100 });
  });
});

describe('GST on a food order', () => {
  it('prices with no tax unless one is given', () => {
    expect(NO_FOOD_TAX).toEqual({ tax_mode: 'INCLUSIVE', gst_pct: 0 });
    expect(foodTotals(48000, 10, 20)).toEqual(foodTotals(48000, 10, 20, NO_FOOD_TAX));
  });

  it('carves inclusive GST out of the net and adds exclusive GST on top of it', () => {
    expect(foodTotals(48000, 0, 0, { tax_mode: 'INCLUSIVE', gst_pct: 5 })).toMatchObject({ taxable_paise: 45714, tax_paise: 2286, total_paise: 48000 });
    expect(foodTotals(48000, 0, 0, { tax_mode: 'EXCLUSIVE', gst_pct: 5 })).toMatchObject({ taxable_paise: 48000, tax_paise: 2400, total_paise: 50400 });
  });

  it('reads a percent that is not a whole positive number as no tax', () => {
    for (const gst_pct of [0, -5, 2.5, Number.NaN]) {
      expect(foodTotals(48000, 0, 0, { tax_mode: 'EXCLUSIVE', gst_pct })).toMatchObject({ gst_pct: 0, tax_paise: 0, total_paise: 48000 });
    }
  });

  it('never moves the discounts: a coupon and the venue discount come off before any tax, in either mode', () => {
    for (const tax_mode of ['INCLUSIVE', 'EXCLUSIVE'] as const) {
      const taxed = foodTotals(52875, 10, 20, { tax_mode, gst_pct: 18 });
      const plain = foodTotals(52875, 10, 20);
      expect(taxed).toMatchObject({ discount_paise: plain.discount_paise, coupon_discount_paise: plain.coupon_discount_paise });
      expect(preTaxPaise(taxed)).toBe(plain.total_paise);
      expect(taxed.taxable_paise + taxed.tax_paise).toBe(taxed.total_paise);
    }
  });

  it('holds the one-rupee minimum to the amount before GST', () => {
    const totals = foodTotals(100, 1, 0, { tax_mode: 'EXCLUSIVE', gst_pct: 18 });
    expect(totals.total_paise).toBe(117);
    expect(preTaxPaise(totals)).toBe(99);
  });

  it('splits the tax into CGST and SGST halves that add up to it exactly', () => {
    expect(splitFoodGst(2286)).toEqual({ cgst_paise: 1143, sgst_paise: 1143 });
    expect(splitFoodGst(6853)).toEqual({ cgst_paise: 3426, sgst_paise: 3427 });
    expect(splitFoodGst(0)).toEqual({ cgst_paise: 0, sgst_paise: 0 });
  });
});

describe('which GST a venue is priced with', () => {
  const defaults = { tax_mode: 'INCLUSIVE' as const, gst_pct: 5 };

  it("follows Finance's default unless the venue overrides it", () => {
    expect(effectiveFoodTax(null, defaults)).toEqual(defaults);
    expect(effectiveFoodTax({ tax_override: false, tax_mode: 'EXCLUSIVE', gst_pct: 18 }, defaults)).toEqual(defaults);
    expect(effectiveFoodTax({ tax_override: true, tax_mode: 'EXCLUSIVE', gst_pct: 18 }, defaults)).toEqual({ tax_mode: 'EXCLUSIVE', gst_pct: 18 });
  });

  it('fills a part the override is missing from the default', () => {
    expect(effectiveFoodTax({ tax_override: true, tax_mode: null, gst_pct: 0 }, defaults)).toEqual({ tax_mode: 'INCLUSIVE', gst_pct: 0 });
    expect(effectiveFoodTax({ tax_override: true, tax_mode: 'EXCLUSIVE' }, defaults)).toEqual({ tax_mode: 'EXCLUSIVE', gst_pct: 5 });
  });
});

describe('the food invoice', () => {
  it('is a TAX INVOICE only with both a GST number and a GST charged', () => {
    expect(invoiceTitle({ venue_gstin: '22ABCDE1234F1Z5', gst_pct: 5 })).toBe('TAX INVOICE');
    expect(invoiceTitle({ venue_gstin: '', gst_pct: 5 })).toBe('INVOICE');
    expect(invoiceTitle({ venue_gstin: '22ABCDE1234F1Z5', gst_pct: 0 })).toBe('INVOICE');
  });

  it('says how the prices meet the GST, and what it always said for an order without one', () => {
    expect(taxNote({ tax_mode: 'INCLUSIVE', gst_pct: 5 })).toBe('Prices include GST.');
    expect(taxNote({ tax_mode: 'EXCLUSIVE', gst_pct: 5 })).toBe('GST added to prices.');
    expect(taxNote({ tax_mode: 'EXCLUSIVE', gst_pct: 0 })).toBe('Prices are inclusive of all applicable taxes.');
  });
});

describe('a coupon code', () => {
  it('is stored and compared trimmed and upper-cased', () => {
    expect(normalizeFoodCouponCode('  welcome10 ')).toBe('WELCOME10');
    expect(normalizeFoodCouponCode(null)).toBe('');
    expect(normalizeFoodCouponCode(undefined)).toBe('');
    expect(normalizeFoodCouponCode(42)).toBe('');
  });

  it('is 3 to 30 of A-Z, 0-9, - and _, starting with a letter or a digit', () => {
    for (const code of ['ABC', 'WELCOME10', 'DIWALI_25-OFF', '1ST', 'A'.repeat(30)]) expect(FOOD_COUPON_CODE.test(code)).toBe(true);
    for (const code of ['', 'AB', 'A'.repeat(31), 'welcome10', '-ABC', '_ABC', 'SAVE 10', 'SAVE%', 'SÄVE']) {
      expect(FOOD_COUPON_CODE.test(code)).toBe(false);
    }
  });
});

describe('toFoodOrderPub', () => {
  // An order written before coupons existed has none of the three fields, and a lean read applies no defaults.
  const legacyOrder = {
    _id: { toHexString: () => 'order_1' },
    order_no: 'FOOD-000001',
    venue_id: { toHexString: () => 'venue_1' },
    venue_name: 'Cafe Uno',
    customer_name: 'Asha',
    customer_phone: '9876543210',
    table_label: 'T4',
    note: '',
    lines: [],
    subtotal_paise: 48000,
    discount_pct: 10,
    discount_paise: 4800,
    total_paise: 43200,
    currency_symbol: '₹',
    status: 'SERVED',
    payment_status: 'PAID',
    paid_at: new Date('2026-10-01T10:00:00.000Z'),
    cancelled_at: null,
    cancel_reason: '',
    created_at: new Date('2026-10-01T09:58:00.000Z'),
  } as unknown as IVenueFoodOrder;

  it('reads an order from before coupons as one without a coupon', () => {
    expect(toFoodOrderPub(legacyOrder)).toMatchObject({
      discount_pct: 10,
      discount_amount: 48,
      coupon_code: null,
      coupon_pct: 0,
      coupon_discount_amount: 0,
      total: 432,
    });
  });

  it('reads an order from before GST as inclusive at 0%, its whole total the taxable value', () => {
    expect(toFoodOrderPub(legacyOrder)).toMatchObject({ tax_mode: 'INCLUSIVE', gst_pct: 0, taxable_amount: 432, tax_amount: 0, total: 432 });
    expect(foodOrderTax(legacyOrder)).toEqual({ tax_mode: 'INCLUSIVE', gst_pct: 0, taxable_paise: 43200, tax_paise: 0 });
  });

  it('shows the GST an order was placed with', () => {
    const order = { ...legacyOrder, tax_mode: 'EXCLUSIVE', gst_pct: 5, taxable_paise: 43200, tax_paise: 2160, total_paise: 45360 } as IVenueFoodOrder;
    expect(toFoodOrderPub(order)).toMatchObject({ tax_mode: 'EXCLUSIVE', gst_pct: 5, taxable_amount: 432, tax_amount: 21.6, total: 453.6 });
  });

  it('shows the coupon of an order placed with one, beside the venue discount', () => {
    const order = { ...legacyOrder, coupon_code: 'WELCOME20', coupon_pct: 20, coupon_discount_paise: 8640, total_paise: 34560 } as IVenueFoodOrder;
    expect(toFoodOrderPub(order)).toMatchObject({
      discount_pct: 10,
      discount_amount: 48,
      coupon_code: 'WELCOME20',
      coupon_pct: 20,
      coupon_discount_amount: 86.4,
      total: 345.6,
    });
  });
});
