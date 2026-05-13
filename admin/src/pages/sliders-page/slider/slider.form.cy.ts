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

describe('sliderFormSchema', () => {
  it('rejects empty title', async () => {
    const error = await sliderFormSchema.validate({ ...base, title: '' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/title is required/i);
  });

  it('rejects external link that is not http(s)', async () => {
    const error = await sliderFormSchema
      .validate({ ...base, link_url: 'javascript:alert(1)' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/http/i);
  });

  it('requires a target kind+id for INTERNAL link', async () => {
    const error = await sliderFormSchema
      .validate({ ...base, link_type: 'INTERNAL', link_target_kind: '', link_target_id: '', link_url: '' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/pick (a target kind|a pod or club)/i);
  });

  it('requires location for LOCATION scope', async () => {
    const error = await sliderFormSchema
      .validate({ ...base, scope: 'LOCATION' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/location/i);
  });

  it('rejects ends_at not after starts_at', async () => {
    const error = await sliderFormSchema
      .validate(
        { ...base, starts_at: '2025-06-10T10:00', ends_at: '2025-06-10T09:00' },
        { abortEarly: false },
      )
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/end must be after start/i);
  });

  it('accepts a fully valid slider', async () => {
    const parsed = await sliderFormSchema.validate(base, { abortEarly: false });
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
    const update = toUpdateSliderInput({ ...base, is_active: false }) as any;
    expect(update.slider_id).toBeUndefined();
    expect(update.is_active).toBe(false);
  });
});
