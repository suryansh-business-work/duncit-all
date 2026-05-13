import { describe, expect, it } from 'vitest';
import { autoSlug, websiteContentFormSchema, toWebsiteContentInput } from './website-content.form';

const base = {
  type: 'BLOG' as const,
  sort_order: 0,
  title: 'How we built Duncit',
  slug: '',
  category: '',
  published_at: '',
  summary: '',
  body: '',
  image_url: '',
  cta_label: '',
  cta_url: '',
  is_published: false,
};

describe('websiteContentFormSchema', () => {
  it('rejects empty title', async () => {
    const error = await websiteContentFormSchema.validate({ ...base, title: '' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/title/i);
  });
  it('rejects bad slug', async () => {
    const error = await websiteContentFormSchema.validate({ ...base, slug: 'Bad Slug!' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/slug/i);
  });
  it('rejects bad image URL', async () => {
    const error = await websiteContentFormSchema.validate({ ...base, image_url: 'ftp://x' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/image url/i);
  });
  it('rejects bad published_at', async () => {
    const error = await websiteContentFormSchema.validate({ ...base, published_at: 'yesterday' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/published/i);
  });
  it('accepts valid input', async () => {
    await websiteContentFormSchema.validate(base);
  });
});

describe('autoSlug', () => {
  it('generates a kebab-case slug', () => {
    expect(autoSlug('How we built Duncit!')).toBe('how-we-built-duncit');
  });
});

describe('toWebsiteContentInput', () => {
  it('auto-generates slug from title when missing', () => {
    const input = toWebsiteContentInput(base);
    expect(input.slug).toBe('how-we-built-duncit');
  });
});
