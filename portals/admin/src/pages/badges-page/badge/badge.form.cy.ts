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

const messagesOf = (values: unknown) => {
  const result = badgeFormSchema.safeParse(values);
  return result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');
};

describe('badgeFormSchema', () => {
  it('rejects empty title', () => {
    expect(messagesOf({ ...base, title: '' })).toMatch(/title/i);
  });
  it('requires threshold when condition is not MANUAL', () => {
    expect(messagesOf({ ...base, threshold: undefined })).toMatch(/threshold/i);
  });
  it('allows missing threshold when condition is MANUAL', () => {
    expect(badgeFormSchema.safeParse({ ...base, condition_type: 'MANUAL' as const, threshold: 0 }).success).toBe(true);
  });
  it('rejects negative threshold', () => {
    expect(messagesOf({ ...base, threshold: -1 })).toMatch(/threshold/i);
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

describe('badgeFormSchema — parsed output and condition errors', () => {
  it('fills a missing MANUAL threshold with 0 in the parsed values', () => {
    const result = badgeFormSchema.parse({ ...base, condition_type: 'MANUAL', threshold: undefined });
    expect(result.threshold).toBe(0);
    expect(result.condition_type).toBe('MANUAL');
  });

  it('keeps a counted threshold and trims the title in the parsed values', () => {
    const result = badgeFormSchema.parse({ ...base, title: '  Top Host  ', threshold: 12 });
    expect(result).toMatchObject({ title: 'Top Host', threshold: 12 });
  });

  it('says the condition is required when none is chosen', () => {
    expect(messagesOf({ ...base, condition_type: undefined })).toContain('Condition is required');
  });

  it('says the condition is invalid when an unknown one is sent', () => {
    expect(messagesOf({ ...base, condition_type: 'PODS_CANCELLED' })).toContain('Select a valid condition');
  });
});

describe('toBadgeInput — missing optional fields', () => {
  it('nulls absent description and image, zeroes an absent counted threshold and defaults to active', () => {
    expect(
      toBadgeInput({ title: ' Regular ', condition_type: 'PODS_ATTENDED' }),
    ).toEqual({
      title: 'Regular',
      description: null,
      image_url: null,
      condition_type: 'PODS_ATTENDED',
      threshold: 0,
      is_active: true,
    });
  });

  it('keeps an explicit inactive flag', () => {
    expect(toBadgeInput({ ...base, is_active: false }).is_active).toBe(false);
  });
});
