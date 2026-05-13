import { describe, expect, it } from 'vitest';
import { categoryFormSchema, parseCategoryMedia, toCategoryInput } from './category.form';

const base = {
  name: 'Sports',
  iconMode: 'ICON' as const,
  icon: 'sports',
  description: '',
  mediaText: '',
  sort_order: 0,
  is_active: true,
};

describe('categoryFormSchema', () => {
  it('rejects empty name', async () => {
    const error = await categoryFormSchema.validate({ ...base, name: '' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/name/i);
  });
  it('rejects invalid iconMode', async () => {
    const error = await categoryFormSchema
      .validate({ ...base, iconMode: 'BOGUS' as any }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/icon mode/i);
  });
  it('rejects negative sort_order', async () => {
    const error = await categoryFormSchema.validate({ ...base, sort_order: -1 }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/sort order/i);
  });
  it('accepts a fully valid category', async () => {
    await categoryFormSchema.validate(base);
  });
});

describe('parseCategoryMedia', () => {
  it('detects video extensions', () => {
    const items = parseCategoryMedia('https://x/a.mp4\nhttps://x/b.png\n');
    expect(items[0].type).toBe('VIDEO');
    expect(items[1].type).toBe('IMAGE');
  });
  it('filters blank lines and trims', () => {
    const items = parseCategoryMedia(' \n  https://x/a.png\n\n');
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe('https://x/a.png');
  });
});

describe('toCategoryInput', () => {
  it('maps to backend shape', () => {
    const input = toCategoryInput({ ...base, mediaText: 'https://x/a.png' });
    expect(input.name).toBe('Sports');
    expect(input.media).toHaveLength(1);
    expect(input.is_active).toBe(true);
  });
});
