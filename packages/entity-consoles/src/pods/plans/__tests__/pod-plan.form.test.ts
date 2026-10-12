import { describe, expect, it } from 'vitest';
import {
  makePodPlanFormSchema,
  parsePodPlanFeatures,
  podPlanFormDefaults,
  podPlanFormSchema,
  toPodPlanInput,
  type PodPlanFormValues,
} from '../pod-plan';

const valid = (over: Partial<PodPlanFormValues> = {}): PodPlanFormValues => ({
  ...podPlanFormDefaults,
  key: 'weekend-pass',
  name: 'Weekend pass',
  ...over,
});

const messages = (values: PodPlanFormValues, schema = podPlanFormSchema) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('podPlanFormSchema', () => {
  it('accepts a minimal plan and fills the optional fields with their defaults', () => {
    const parsed = podPlanFormSchema.parse({ key: 'gold', name: 'Gold', sort_order: '3' });
    expect(parsed).toMatchObject({
      key: 'gold',
      description: '',
      image_url: '',
      features: [],
      price_label: '',
      sort_order: 3,
      is_coming_soon: false,
      is_active: true,
    });
  });

  it('requires a name and bounds its length', () => {
    expect(messages(valid({ name: '   ' })).length).toBeGreaterThan(0);
    expect(messages(valid({ name: 'x'.repeat(81) })).length).toBeGreaterThan(0);
    expect(messages(valid({ name: 'x'.repeat(80) }))).toEqual([]);
  });

  it('only allows a lowercase slug as the key, up to 40 characters', () => {
    expect(messages(valid({ key: 'Weekend Pass' })).length).toBeGreaterThan(0);
    expect(messages(valid({ key: '-lead' })).length).toBeGreaterThan(0);
    expect(messages(valid({ key: 'a'.repeat(41) })).length).toBeGreaterThan(0);
    expect(messages(valid({ key: 'a_b-c1' }))).toEqual([]);
  });

  it('accepts an empty image or an http(s) URL and refuses anything else', () => {
    expect(messages(valid({ image_url: '' }))).toEqual([]);
    expect(messages(valid({ image_url: 'https://cdn.example.test/p.png' }))).toEqual([]);
    expect(messages(valid({ image_url: 'http://cdn.example.test/p.png' }))).toEqual([]);
    expect(messages(valid({ image_url: 'ftp://cdn.example.test/p.png' }))).toHaveLength(1);
    expect(messages(valid({ image_url: 'javascript:alert(1)' }))).toHaveLength(1);
    expect(messages(valid({ image_url: 'not a url' }))).toHaveLength(1);
  });

  it('keeps the sort order a whole number between 0 and 999', () => {
    expect(messages(valid({ sort_order: 1.5 }))).toHaveLength(1);
    expect(messages(valid({ sort_order: -1 }))).toHaveLength(1);
    expect(messages(valid({ sort_order: 1000 }))).toHaveLength(1);
    expect(messages(valid({ sort_order: 999 }))).toEqual([]);
    expect(messages(valid({ sort_order: 0 }))).toEqual([]);
  });

  it('caps features at 20 rows of 1-120 characters', () => {
    expect(messages(valid({ features: Array.from({ length: 21 }, (_, i) => `f${i}`) }))).toHaveLength(1);
    expect(messages(valid({ features: [''] }))).toHaveLength(1);
    expect(messages(valid({ features: ['x'.repeat(121)] }))).toHaveLength(1);
  });

  it('speaks through the translator it is built with', () => {
    const schema = makePodPlanFormSchema((key) => `<${key}>`);
    expect(messages(valid({ name: '' }), schema)).toContain('<admin.podPlans.errNameRequired>');
    expect(messages(valid({ image_url: 'nope' }), schema)).toContain('<admin.podPlans.errImageUrl>');
  });
});

describe('parsePodPlanFeatures', () => {
  it('splits on newlines, trims, and drops blank lines', () => {
    expect(parsePodPlanFeatures('  Priority seats \n\n Free tea\r\n   \n')).toEqual([
      'Priority seats',
      'Free tea',
    ]);
  });

  it('keeps at most 20 lines', () => {
    const text = Array.from({ length: 25 }, (_, i) => `line ${i}`).join('\n');
    const features = parsePodPlanFeatures(text);
    expect(features).toHaveLength(20);
    expect(features[19]).toBe('line 19');
  });
});

describe('toPodPlanInput', () => {
  it('sends empty optional text as null so the server clears it', () => {
    expect(toPodPlanInput(valid())).toEqual({
      key: 'weekend-pass',
      name: 'Weekend pass',
      description: null,
      image_url: null,
      features: [],
      price_label: null,
      sort_order: 0,
      is_coming_soon: false,
      is_active: true,
    });
  });

  it('trims what it sends and keeps what was filled in', () => {
    const input = toPodPlanInput(
      valid({
        key: ' gold ',
        name: ' Gold ',
        description: ' Best seats ',
        image_url: ' https://cdn.example.test/g.png ',
        features: [' Tea '],
        price_label: ' ₹999 ',
        sort_order: 7,
        is_coming_soon: true,
        is_active: false,
      }),
    );
    expect(input).toEqual({
      key: 'gold',
      name: 'Gold',
      description: 'Best seats',
      image_url: 'https://cdn.example.test/g.png',
      features: ['Tea'],
      price_label: '₹999',
      sort_order: 7,
      is_coming_soon: true,
      is_active: false,
    });
  });

  it('throws rather than send an invalid plan', () => {
    expect(() => toPodPlanInput(valid({ name: '' }))).toThrow();
  });
});
