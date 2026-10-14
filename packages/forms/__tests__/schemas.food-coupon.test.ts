/**
 * A venue's food coupon — the rules the MUI form (@duncit/venue-food) and the
 * native one share, and the two mappers between the saved coupon, the form and
 * the API input. Moved here from the Partners console's own form spec.
 */
import { describe, expect, it } from 'vitest';
import { FOOD_ORDER_LIMITS, type FoodOwnerCoupon } from '@duncit/utils';

import {
  FOOD_COUPON_DESCRIPTION_MAX,
  foodCouponToValues,
  makeFoodCouponSchema,
  toFoodCouponInput,
  type FoodCouponFormValues,
} from '../src/schemas';

// The key comes back as the message, so a test reads which rule refused.
const t = (key: string) => key;
const schema = makeFoodCouponSchema(t);

const valid: FoodCouponFormValues = {
  code: 'WELCOME10',
  description: '',
  discount_pct: '10',
  min_order_amount: '',
  valid_from: null,
  valid_until: null,
  max_uses: '',
  per_phone_limit: '',
  is_active: true,
};

/** The rule that refused each field, by field name. */
const refusals = (over: Partial<FoodCouponFormValues>) => {
  const result = schema.safeParse({ ...valid, ...over });
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]).reverse());
};

const saved: FoodOwnerCoupon = {
  id: 'c1',
  code: 'WELCOME10',
  description: 'First visit',
  discount_pct: 10,
  min_order_amount: 200,
  valid_from: '2026-10-01T00:00:00.000Z',
  valid_until: '2026-12-31T18:29:00.000Z',
  max_uses: 100,
  per_phone_limit: 2,
  used_count: 7,
  is_active: false,
  created_at: '2026-09-20T10:00:00.000Z',
};

describe('makeFoodCouponSchema — code', () => {
  it('accepts the shapes the server stores', () => {
    for (const code of ['ABC', '10OFF', 'DIWALI_2026', 'SAVE-10', `A${'B'.repeat(FOOD_ORDER_LIMITS.couponCodeMax - 1)}`]) {
      expect(refusals({ code })).toEqual({});
    }
  });

  it('asks for a code, then for its length, then for its characters', () => {
    expect(refusals({ code: '   ' }).code).toBe('venueFoodOwner.coupons.codeRequired');
    expect(refusals({ code: 'AB' }).code).toBe('venueFoodOwner.coupons.codeLength');
    expect(refusals({ code: `A${'B'.repeat(FOOD_ORDER_LIMITS.couponCodeMax)}` }).code).toBe('venueFoodOwner.coupons.codeLength');
    for (const code of ['welcome10', 'SAVE 10', '-SAVE10', '_SAVE10', 'SAVE.10']) {
      expect(refusals({ code }).code).toBe('venueFoodOwner.coupons.codePattern');
    }
  });
});

describe('makeFoodCouponSchema — discount and amounts', () => {
  it('takes a whole percent from 1 to the ceiling and nothing else', () => {
    for (const discount_pct of ['1', '45', String(FOOD_ORDER_LIMITS.maxDiscountPct)]) {
      expect(refusals({ discount_pct })).toEqual({});
    }
    for (const discount_pct of ['', '0', String(FOOD_ORDER_LIMITS.maxDiscountPct + 1), '12.5', '-5', 'ten', '1e1']) {
      expect(refusals({ discount_pct }).discount_pct).toBe('venueFoodOwner.coupons.discountRange');
    }
  });

  it('takes no minimum, or rupees with at most two decimals', () => {
    for (const min_order_amount of ['', '0', '199', '249.5', '249.50']) {
      expect(refusals({ min_order_amount })).toEqual({});
    }
    for (const min_order_amount of ['-1', '12.345', '1.2.3', 'abc', '.5', '10.']) {
      expect(refusals({ min_order_amount }).min_order_amount).toBe('venueFoodOwner.coupons.minOrderInvalid');
    }
  });

  it('takes no limit, or a whole number of 1 or more', () => {
    expect(refusals({ max_uses: '1', per_phone_limit: '3' })).toEqual({});
    for (const limit of ['0', '-2', '1.5', 'x', '99999999999']) {
      expect(refusals({ max_uses: limit })).toEqual({ max_uses: 'venueFoodOwner.coupons.limitInvalid' });
      expect(refusals({ per_phone_limit: limit })).toEqual({ per_phone_limit: 'venueFoodOwner.coupons.limitInvalid' });
    }
  });

  it('keeps the description inside the server’s bound', () => {
    expect(refusals({ description: 'x'.repeat(FOOD_COUPON_DESCRIPTION_MAX) })).toEqual({});
    expect(refusals({ description: 'x'.repeat(FOOD_COUPON_DESCRIPTION_MAX + 1) }).description).toBe(
      'venueFoodOwner.coupons.descriptionTooLong',
    );
  });
});

describe('makeFoodCouponSchema — window', () => {
  const start = new Date('2026-10-01T10:00:00.000Z');

  it('accepts an open window, one open side, and an end after the start', () => {
    expect(refusals({ valid_from: start })).toEqual({});
    expect(refusals({ valid_until: start })).toEqual({});
    expect(refusals({ valid_from: start, valid_until: new Date(start.getTime() + 60_000) })).toEqual({});
  });

  it('refuses an end at or before the start', () => {
    expect(refusals({ valid_from: start, valid_until: start }).valid_until).toBe('venueFoodOwner.coupons.endAfterStart');
    expect(refusals({ valid_from: start, valid_until: new Date(start.getTime() - 1) }).valid_until).toBe(
      'venueFoodOwner.coupons.endAfterStart',
    );
  });

  it('refuses a half-typed date', () => {
    expect(refusals({ valid_from: new Date('nope') }).valid_from).toBe('venueFoodOwner.coupons.dateInvalid');
  });
});

describe('foodCouponToValues', () => {
  it('opens a new coupon blank and switched on', () => {
    expect(foodCouponToValues(null)).toEqual({ ...valid, code: '', discount_pct: '' });
  });

  it('opens a saved coupon on its own terms', () => {
    expect(foodCouponToValues(saved)).toEqual({
      code: 'WELCOME10',
      description: 'First visit',
      discount_pct: '10',
      min_order_amount: '200',
      valid_from: new Date('2026-10-01T00:00:00.000Z'),
      valid_until: new Date('2026-12-31T18:29:00.000Z'),
      max_uses: '100',
      per_phone_limit: '2',
      is_active: false,
    });
  });

  it('shows no minimum, no limits and a missing description as empty boxes', () => {
    const open = foodCouponToValues({
      ...saved,
      description: null,
      min_order_amount: 0,
      max_uses: null,
      per_phone_limit: null,
      valid_from: null,
    });
    expect(open).toMatchObject({ description: '', min_order_amount: '', max_uses: '', per_phone_limit: '', valid_from: null });
  });
});

describe('toFoodCouponInput', () => {
  it('sends numbers as numbers, dates as ISO strings and the code upper-cased', () => {
    expect(toFoodCouponInput({ ...foodCouponToValues(saved), code: ' welcome10 ', description: ' First visit ' })).toEqual({
      code: 'WELCOME10',
      description: 'First visit',
      discount_pct: 10,
      min_order_amount: 200,
      valid_from: '2026-10-01T00:00:00.000Z',
      valid_until: '2026-12-31T18:29:00.000Z',
      max_uses: 100,
      per_phone_limit: 2,
      is_active: false,
    });
  });

  it('sends null for every emptied window and limit, and 0 for no minimum', () => {
    expect(toFoodCouponInput(valid)).toMatchObject({
      min_order_amount: 0,
      valid_from: null,
      valid_until: null,
      max_uses: null,
      per_phone_limit: null,
    });
  });
});
