import { describe, expect, it } from 'vitest';
import { couponFormSchema, couponFormDefaults, toCouponInput } from './coupon.form';

const base = { ...couponFormDefaults, code: 'SAVE20', discount_pct: 20 };

describe('couponFormSchema', () => {
  it('uppercases and accepts a valid code', async () => {
    const value = await couponFormSchema.validate({ ...base, code: 'save20' });
    expect(value.code).toBe('SAVE20');
  });

  it('rejects an invalid code', async () => {
    const error = await couponFormSchema.validate({ ...base, code: 'ab' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/code/i);
  });

  it('rejects discount outside 1-100', async () => {
    const low = await couponFormSchema.validate({ ...base, discount_pct: 0 }, { abortEarly: false }).catch((e) => e);
    expect(low.errors.join(' ')).toMatch(/minimum/i);
    const high = await couponFormSchema.validate({ ...base, discount_pct: 101 }, { abortEarly: false }).catch((e) => e);
    expect(high.errors.join(' ')).toMatch(/maximum/i);
  });

  it('requires a pod for POD scope', async () => {
    const error = await couponFormSchema
      .validate({ ...base, scope: 'POD', pod_id: '' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/pod/i);
  });
});

describe('toCouponInput', () => {
  it('nullifies pod_id for global scope and maps dates/limits', () => {
    const input = toCouponInput({
      ...base,
      scope: 'GLOBAL',
      pod_id: 'p1',
      valid_until: '2026-12-31',
      max_uses: 100,
    });
    expect(input.pod_id).toBeNull();
    expect(input.max_uses).toBe(100);
    expect(input.valid_until).toContain('2026');
  });

  it('keeps pod_id for pod scope', () => {
    const input = toCouponInput({ ...base, scope: 'POD', pod_id: 'p9' });
    expect(input.pod_id).toBe('p9');
  });
});
