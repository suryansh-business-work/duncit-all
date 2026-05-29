import { describe, expect, it } from 'vitest';
import { websiteContentSchema, toContentInput } from './website-content.form';
import type { WebsiteContentFormValues } from './website-content.types';

const base: WebsiteContentFormValues = {
  title: 'How we built Duncit',
  slug: 'how-we-built-duncit',
  summary: '',
  body: '',
  category: '',
  image_url: '',
  cta_label: '',
  cta_url: '',
  published_at: '',
  is_published: false,
  sort_order: 0,
};

describe('websiteContentSchema', () => {
  it('rejects an empty title', async () => {
    const error = await websiteContentSchema
      .validate({ ...base, title: '' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/title/i);
  });

  it('rejects a non-http image URL', async () => {
    const error = await websiteContentSchema
      .validate({ ...base, image_url: 'ftp://x' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/valid url/i);
  });

  it('rejects a negative sort order', async () => {
    const error = await websiteContentSchema
      .validate({ ...base, sort_order: -1 }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/sort order/i);
  });

  it('accepts a valid mailto CTA link', async () => {
    await websiteContentSchema.validate({ ...base, cta_url: 'mailto:hi@duncit.com' });
  });

  it('accepts valid input', async () => {
    await websiteContentSchema.validate(base);
  });
});

describe('toContentInput', () => {
  it('binds the fixed page type and nulls an empty published_at', () => {
    const input = toContentInput({ ...base, published_at: '' }, 'CAREERS');
    expect(input.type).toBe('CAREERS');
    expect(input.published_at).toBeNull();
  });

  it('omits the slug when blank so the server can generate it', () => {
    const input = toContentInput({ ...base, slug: '' }, 'BLOG');
    expect(input.slug).toBeUndefined();
  });

  it('serialises a valid published_at to an ISO string', () => {
    const iso = '2026-01-15T10:30:00.000Z';
    const input = toContentInput({ ...base, published_at: iso }, 'NEWSROOM');
    expect(input.published_at).toBe(iso);
  });
});
