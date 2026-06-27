import { describe, expect, it } from 'vitest';
import {
  websiteContentSchema,
  toContentInput,
  type WebsiteContentFormValues,
} from './website-content.types';

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

const firstError = (result: ReturnType<typeof websiteContentSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((i) => i.message).join(' ');

describe('websiteContentSchema', () => {
  it('rejects an empty title', () => {
    const result = websiteContentSchema.safeParse({ ...base, title: '' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toMatch(/title/i);
  });

  it('rejects a non-http image URL', () => {
    const result = websiteContentSchema.safeParse({ ...base, image_url: 'ftp://x' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toMatch(/valid url/i);
  });

  it('rejects a negative sort order', () => {
    const result = websiteContentSchema.safeParse({ ...base, sort_order: -1 });
    expect(result.success).toBe(false);
    expect(firstError(result)).toMatch(/sort order/i);
  });

  it('accepts a valid mailto CTA link', () => {
    const result = websiteContentSchema.safeParse({ ...base, cta_url: 'mailto:hi@duncit.com' });
    expect(result.success).toBe(true);
  });

  it('accepts valid input', () => {
    const result = websiteContentSchema.safeParse(base);
    expect(result.success).toBe(true);
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
