import { describe, expect, it } from 'vitest';
import { couponFormSchema, couponFormDefaults, toCouponInput } from './coupon.form';

const base = { ...couponFormDefaults, code: 'SAVE20', discount_pct: 20 };

const messages = (input: unknown) => {
  const result = couponFormSchema.safeParse(input);
  return result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');
};

describe('couponFormSchema', () => {
  it('uppercases and accepts a valid code', () => {
    const value = couponFormSchema.parse({ ...base, code: 'save20' });
    expect(value.code).toBe('SAVE20');
  });

  it('rejects an invalid code', () => {
    expect(messages({ ...base, code: 'ab' })).toMatch(/code/i);
  });

  it('rejects discount outside 1-100', () => {
    expect(messages({ ...base, discount_pct: 0 })).toMatch(/minimum/i);
    expect(messages({ ...base, discount_pct: 101 })).toMatch(/maximum/i);
  });

  it('requires a pod for POD scope', () => {
    expect(messages({ ...base, scope: 'POD', pod_id: '' })).toMatch(/pod/i);
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
