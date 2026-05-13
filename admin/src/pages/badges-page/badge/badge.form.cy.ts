import { describe, expect, it } from 'vitest';
import { badgeFormSchema, toBadgeInput } from './badge.form';

const base = {
  title: 'Top Host',
  description: '',
  image_url: '',
  condition_type: 'PODS_HOSTED' as const,
  threshold: 5,
  is_active: true,
};

describe('badgeFormSchema', () => {
  it('rejects empty title', async () => {
    const error = await badgeFormSchema.validate({ ...base, title: '' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/title/i);
  });
  it('requires threshold when condition is not MANUAL', async () => {
    const error = await badgeFormSchema
      .validate({ ...base, threshold: undefined as any }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/threshold/i);
  });
  it('allows missing threshold when condition is MANUAL', async () => {
    await badgeFormSchema.validate({ ...base, condition_type: 'MANUAL' as const, threshold: 0 });
  });
  it('rejects negative threshold', async () => {
    const error = await badgeFormSchema.validate({ ...base, threshold: -1 }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/threshold/i);
  });
});

describe('toBadgeInput', () => {
  it('zeroes threshold for MANUAL condition', () => {
    const input = toBadgeInput({ ...base, condition_type: 'MANUAL', threshold: 99 });
    expect(input.threshold).toBe(0);
  });
});
