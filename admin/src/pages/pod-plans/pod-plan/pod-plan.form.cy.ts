import { describe, expect, it } from 'vitest';
import { parsePodPlanFeatures, podPlanFormSchema, toPodPlanInput } from './pod-plan.form';

const base = {
  key: 'premium',
  name: 'Premium',
  description: 'For power users',
  image_url: 'https://cdn.example.com/p.png',
  features: ['Unlimited pods', 'Priority support'],
  price_label: '₹999/mo',
  sort_order: 1,
  is_coming_soon: false,
  is_active: true,
};

describe('podPlanFormSchema', () => {
  it('rejects keys with uppercase letters', async () => {
    const error = await podPlanFormSchema.validate({ ...base, key: 'Premium' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/key/i);
  });
  it('rejects image_url that is not http(s)', async () => {
    const error = await podPlanFormSchema.validate({ ...base, image_url: 'ftp://x' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/image url/i);
  });
  it('rejects sort_order over 999', async () => {
    const error = await podPlanFormSchema.validate({ ...base, sort_order: 1000 }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/sort/i);
  });
  it('accepts a valid plan', async () => {
    await podPlanFormSchema.validate(base);
  });
});

describe('parsePodPlanFeatures', () => {
  it('splits, trims, and caps at 20', () => {
    const parsed = parsePodPlanFeatures(Array.from({ length: 25 }, (_, i) => ` Feature ${i} `).join('\n'));
    expect(parsed).toHaveLength(20);
    expect(parsed[0]).toBe('Feature 0');
  });
});

describe('toPodPlanInput', () => {
  it('nullifies empty optional strings', () => {
    const input = toPodPlanInput({ ...base, description: '', image_url: '', price_label: '' });
    expect(input.description).toBeNull();
    expect(input.image_url).toBeNull();
    expect(input.price_label).toBeNull();
  });
});
