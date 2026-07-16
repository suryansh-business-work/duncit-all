import { describe, expect, it } from 'vitest';
import {
  blankValues,
  toContentInput,
  toFormValues,
  websiteContentSchema,
  type WebsiteContentFormValues,
} from '../../src/pages/website/content/website-content';
import type { WebsiteContentItem } from '../../src/pages/website/content/queries';

const valid: WebsiteContentFormValues = {
  title: 'Title',
  slug: 'title',
  summary: '',
  body: '',
  category: '',
  image_url: '',
  cta_label: '',
  cta_url: '',
  published_at: '',
  is_published: true,
  sort_order: 0,
};

describe('websiteContentSchema link validation', () => {
  it('accepts an https URL and a tel link', () => {
    expect(websiteContentSchema.safeParse({ ...valid, image_url: 'https://x.com/a.png' }).success).toBe(
      true,
    );
    expect(websiteContentSchema.safeParse({ ...valid, cta_url: 'tel:+91999' }).success).toBe(true);
  });

  it('rejects a syntactically invalid URL (URL constructor throws)', () => {
    // ":::" makes `new URL()` throw, exercising the catch branch → invalid.
    const result = websiteContentSchema.safeParse({ ...valid, image_url: ':::' });
    expect(result.success).toBe(false);
  });

  it('rejects an over-long title', () => {
    const result = websiteContentSchema.safeParse({ ...valid, title: 'x'.repeat(161) });
    expect(result.success).toBe(false);
  });
});

describe('toFormValues', () => {
  it('maps a fully-populated item, serialising published_at to ISO', () => {
    const item: WebsiteContentItem = {
      id: '1',
      type: 'BLOG',
      title: 'Hello',
      slug: 'hello',
      summary: 's',
      body: 'b',
      category: 'c',
      image_url: 'https://img',
      cta_label: 'go',
      cta_url: 'https://go',
      published_at: '2026-01-15T10:30:00.000Z',
      is_published: false,
      sort_order: 4,
      updated_at: '2026-01-16T00:00:00.000Z',
    };
    const values = toFormValues(item);
    expect(values.title).toBe('Hello');
    expect(values.is_published).toBe(false);
    expect(values.published_at).toBe('2026-01-15T10:30:00.000Z');
  });

  it('applies fallbacks for missing/blank fields', () => {
    const values = toFormValues({
      id: '2',
      type: 'BLOG',
      published_at: null,
    } as unknown as WebsiteContentItem);
    expect(values.title).toBe('');
    expect(values.published_at).toBe('');
    expect(values.is_published).toBe(true);
    expect(values.sort_order).toBe(0);
  });
});

describe('blankValues + toContentInput', () => {
  it('produces a published default entry', () => {
    const b = blankValues();
    expect(b.is_published).toBe(true);
    expect(b.title).toBe('');
    expect(typeof b.published_at).toBe('string');
  });

  it('keeps a provided slug and serialises a set published_at', () => {
    const input = toContentInput(
      { ...valid, slug: 'my-slug', published_at: '2026-02-01T00:00:00.000Z', sort_order: 7 },
      'BLOG',
    );
    expect(input.slug).toBe('my-slug');
    expect(input.published_at).toBe('2026-02-01T00:00:00.000Z');
    expect(input.sort_order).toBe(7);
    expect(input.type).toBe('BLOG');
  });

  it('coerces an invalid sort_order to 0', () => {
    const input = toContentInput({ ...valid, sort_order: Number.NaN }, 'CAREERS');
    expect(input.sort_order).toBe(0);
  });
});
