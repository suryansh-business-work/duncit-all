import { describe, expect, it } from 'vitest';
import { sliderFormSchema, toCreateSliderInput, toUpdateSliderInput } from './slider.form';
import type { SliderForm } from '../queries';

const base: SliderForm = {
  slider_id: '',
  title: 'New Year Bash',
  description: '',
  media_url: 'https://cdn.example.com/banner.png',
  media_type: 'IMAGE',
  link_type: 'EXTERNAL',
  link_target_kind: '',
  link_target_id: '',
  link_url: 'https://duncit.com/pods/new-year',
  scope: 'GLOBAL',
  super_category_slug: '',
  location_id: '',
  zone_name: '',
  sort_order: 0,
  starts_at: '',
  ends_at: '',
  is_active: true,
};

const messages = (input: unknown) => {
  const result = sliderFormSchema.safeParse(input);
  return result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');
};

describe('sliderFormSchema', () => {
  it('rejects empty title', () => {
    expect(messages({ ...base, title: '' })).toMatch(/title is required/i);
  });

  it('rejects external link that is not http(s)', () => {
    expect(messages({ ...base, link_url: 'javascript:alert(1)' })).toMatch(/http/i);
  });

  it('requires a target kind+id for INTERNAL link', () => {
    const text = messages({
      ...base,
      link_type: 'INTERNAL',
      link_target_kind: '',
      link_target_id: '',
      link_url: '',
    });
    expect(text).toMatch(/pick (a target kind|a pod or club)/i);
  });

  it('requires location for LOCATION scope', () => {
    expect(messages({ ...base, scope: 'LOCATION' })).toMatch(/location/i);
  });

  it('rejects ends_at not after starts_at', () => {
    const text = messages({ ...base, starts_at: '2025-06-10T10:00', ends_at: '2025-06-10T09:00' });
    expect(text).toMatch(/end must be after start/i);
  });

  it('accepts a fully valid slider', () => {
    const parsed = sliderFormSchema.parse(base);
    expect(parsed.title).toBe('New Year Bash');
  });
});

describe('toCreateSliderInput / toUpdateSliderInput', () => {
  it('nulls location_id for GLOBAL scope', () => {
    const input = toCreateSliderInput({ ...base, location_id: 'leftover' });
    expect(input.location_id).toBeNull();
  });

  it('clears link_url when INTERNAL link', () => {
    const input = toCreateSliderInput({
      ...base,
      link_type: 'INTERNAL',
      link_target_kind: 'POD',
      link_target_id: 'p1',
      link_url: 'https://leftover',
    });
    expect(input.link_url).toBe('');
    expect(input.link_target_kind).toBe('POD');
    expect(input.link_target_id).toBe('p1');
  });

  it('toUpdateSliderInput omits slider_id and adds is_active', () => {
    const update = toUpdateSliderInput({ ...base, is_active: false }) as { slider_id?: string; is_active: boolean };
    expect(update.slider_id).toBeUndefined();
    expect(update.is_active).toBe(false);
  });
});
