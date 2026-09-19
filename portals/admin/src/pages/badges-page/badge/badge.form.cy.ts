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
    await expect(badgeFormSchema.validate({ ...base, condition_type: 'MANUAL' as const, threshold: 0 })).resolves.toBeTruthy();
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

  it('passes a counted threshold through and nulls a blank description and image', () => {
    expect(toBadgeInput({ ...base, threshold: 5 })).toEqual({
      title: 'Top Host',
      description: null,
      image_url: null,
      condition_type: 'PODS_HOSTED',
      threshold: 5,
      is_active: true,
    });
  });

  it('keeps a written description and image, and a zero threshold as zero', () => {
    const input = toBadgeInput({
      ...base,
      description: 'Hosted five pods',
      image_url: 'https://cdn.duncit.com/badges/top-host.png',
      threshold: 0,
    });
    expect(input.description).toBe('Hosted five pods');
    expect(input.image_url).toBe('https://cdn.duncit.com/badges/top-host.png');
    expect(input.threshold).toBe(0);
  });
});
