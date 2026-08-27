import { describe, expect, it } from 'vitest';

import { buildCouponFormSchema, couponFormDefaults, toCouponInput } from '../src/coupon/coupon.form';

/**
 * The schema is built from the console's translator (rule 38): outside React
 * the key IS the copy, so a message assertion here is an assertion that the
 * right key reaches the field — the human wording lives in the shell bundle.
 */
const couponFormSchema = buildCouponFormSchema((key) => key);

const values = (over: Record<string, unknown> = {}) => ({ ...couponFormDefaults, code: 'SUMMER25', ...over });

const errorsFor = (input: Record<string, unknown>) => {
  const result = couponFormSchema.safeParse(input);
  if (result.success) return {} as Record<string, string>;
  return Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('couponFormDefaults', () => {
  it('opens the form on a live, global, 10% coupon with no caps', () => {
    expect(couponFormDefaults).toEqual({
      code: '',
      description: '',
      discount_pct: 10,
      scope: 'GLOBAL',
      pod_id: '',
      valid_from: '',
      valid_until: '',
      max_uses: null,
      per_user_limit: null,
      min_order_amount: 0,
      is_active: true,
    });
  });
});

describe('the code field', () => {
  it('upper-cases and trims what was typed, so the same coupon is never entered twice', () => {
    expect(couponFormSchema.parse(values({ code: '  summer25  ' }))).toMatchObject({ code: 'SUMMER25' });
  });

  it.each([['AB'], ['A'], [''], ['HAS SPACE'], ['bad!'], ['-LEADING'], ['_LEADING']])(
    'rejects %j with the localized code message',
    (code) => {
      expect(errorsFor(values({ code })).code).toBe('shell.coupons.codeInvalid');
    }
  );

  it('accepts dashes and underscores after the first character', () => {
    expect(couponFormSchema.safeParse(values({ code: 'NEW_YEAR-26' })).success).toBe(true);
  });

  it('rejects a code longer than 30 characters', () => {
    expect(errorsFor(values({ code: 'A'.repeat(31) }))).toHaveProperty('code');
    expect(couponFormSchema.safeParse(values({ code: 'A'.repeat(30) })).success).toBe(true);
  });
});

describe('the discount field', () => {
  it('coerces the string an input gives it', () => {
    expect(couponFormSchema.parse(values({ discount_pct: '25' }))).toMatchObject({ discount_pct: 25 });
  });

  it.each([[0], [-1]])('rejects %j percent as below the minimum', (discount_pct) => {
    expect(errorsFor(values({ discount_pct })).discount_pct).toBe('shell.coupons.discountMin');
  });

  it('rejects more than 100 percent as above the maximum', () => {
    expect(errorsFor(values({ discount_pct: 101 })).discount_pct).toBe('shell.coupons.discountMax');
  });

  it('allows the whole range a discount can take', () => {
    expect(couponFormSchema.safeParse(values({ discount_pct: 1 })).success).toBe(true);
    expect(couponFormSchema.safeParse(values({ discount_pct: 100 })).success).toBe(true);
  });

  it('refuses text', () => {
    expect(errorsFor(values({ discount_pct: 'lots' })).discount_pct).toBe('shell.coupons.discountNumber');
  });
});

describe('the optional caps', () => {
  it.each(['max_uses', 'per_user_limit'] as const)('reads a blank %s as no cap at all', (field) => {
    expect(couponFormSchema.parse(values({ [field]: '' }))).toMatchObject({ [field]: null });
    expect(couponFormSchema.parse(values({ [field]: null }))).toMatchObject({ [field]: null });
  });

  it.each(['max_uses', 'per_user_limit'] as const)('rejects a fractional %s as not whole', (field) => {
    expect(errorsFor(values({ [field]: 2.5 }))[field]).toBe('shell.coupons.wholeNumber');
  });

  it.each(['max_uses', 'per_user_limit'] as const)('rejects a zero %s as below one', (field) => {
    expect(errorsFor(values({ [field]: 0 }))[field]).toBe('shell.coupons.atLeastOne');
  });

  it('accepts a whole-number cap', () => {
    expect(couponFormSchema.parse(values({ max_uses: '50' }))).toMatchObject({ max_uses: 50 });
  });
});

describe('the minimum order amount', () => {
  it('allows zero, which is what "no minimum" means', () => {
    expect(couponFormSchema.parse(values({ min_order_amount: 0 }))).toMatchObject({ min_order_amount: 0 });
  });

  it('rejects a negative minimum', () => {
    expect(errorsFor(values({ min_order_amount: -1 })).min_order_amount).toBe('shell.coupons.amountMin');
  });

  it('refuses text', () => {
    expect(errorsFor(values({ min_order_amount: 'free' })).min_order_amount).toBe('shell.coupons.amountNumber');
  });
});

describe('the scope rule', () => {
  it('needs a pod when the coupon is pod-scoped', () => {
    expect(errorsFor(values({ scope: 'POD', pod_id: '' })).pod_id).toBe('shell.coupons.podRequired');
  });

  it('is satisfied once a pod is picked', () => {
    expect(couponFormSchema.safeParse(values({ scope: 'POD', pod_id: 'pod-1' })).success).toBe(true);
  });

  it('needs no pod for a global coupon', () => {
    expect(couponFormSchema.safeParse(values({ scope: 'GLOBAL', pod_id: '' })).success).toBe(true);
  });

  it('rejects a scope the server does not know', () => {
    expect(errorsFor(values({ scope: 'CLUB' }))).toHaveProperty('scope');
  });
});

describe('the description field', () => {
  it('trims and caps at 300 characters', () => {
    expect(couponFormSchema.parse(values({ description: '  Summer sale  ' }))).toMatchObject({
      description: 'Summer sale',
    });
    expect(errorsFor(values({ description: 'x'.repeat(301) }))).toHaveProperty('description');
  });
});

describe('the translator', () => {
  it('is what a message is read from, so a console in another language sees its own copy', () => {
    const hindi = buildCouponFormSchema((key) => `hi:${key}`);
    const result = hindi.safeParse(values({ discount_pct: 0 }));

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe('hi:shell.coupons.discountMin');
  });
});

describe('toCouponInput', () => {
  it('sends the upper-cased code and the numbers as numbers', () => {
    expect(toCouponInput(values({ code: 'summer25', discount_pct: 25, min_order_amount: 500 }))).toMatchObject({
      code: 'SUMMER25',
      discount_pct: 25,
      min_order_amount: 500,
    });
  });

  it('drops the pod on a global coupon, even when the form still holds one', () => {
    expect(toCouponInput(values({ scope: 'GLOBAL', pod_id: 'pod-1' })).pod_id).toBeNull();
  });

  it('keeps the pod on a pod-scoped coupon', () => {
    expect(toCouponInput(values({ scope: 'POD', pod_id: 'pod-1' })).pod_id).toBe('pod-1');
  });

  it('sends the validity window as ISO instants, and null when a bound is open', () => {
    const input = toCouponInput(values({ valid_from: '2026-08-10T00:00:00.000Z', valid_until: '' }));

    expect(input.valid_from).toBe('2026-08-10T00:00:00.000Z');
    expect(input.valid_until).toBeNull();
  });

  it('sends an uncapped coupon as nulls rather than zeroes', () => {
    expect(toCouponInput(values())).toMatchObject({ max_uses: null, per_user_limit: null, min_order_amount: 0 });
  });

  it('sends the caps through as numbers when they are set', () => {
    expect(toCouponInput(values({ max_uses: 100, per_user_limit: 1 }))).toMatchObject({
      max_uses: 100,
      per_user_limit: 1,
    });
  });

  it('sends a blank description as an empty string', () => {
    expect(toCouponInput(values({ description: '' })).description).toBe('');
    expect(toCouponInput(values({ description: 'Summer sale' })).description).toBe('Summer sale');
  });

  it('carries the live flag through', () => {
    expect(toCouponInput(values({ is_active: false })).is_active).toBe(false);
  });

  it('throws rather than sending an invalid coupon to the server', () => {
    expect(() => toCouponInput(values({ code: 'no' }))).toThrow();
  });

  it('throws on a pod-scoped coupon with no pod, so no such input ever leaves the form', () => {
    expect(() => toCouponInput(values({ scope: 'POD', pod_id: '' }))).toThrow();
  });
});
