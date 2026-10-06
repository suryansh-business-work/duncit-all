import { describe, expect, it } from 'vitest';
import {
  MAX_SEO_META_TAGS,
  TWITTER_CARDS,
  seoSharingSchema,
  toSeoSharingInput,
  toSeoSharingValues,
  type SeoSharingValues,
} from '../../src/pages/cms/lib/seoSharing';
import { makeCmsSeo } from '../mocks/cms.mock';

/** Echoes the key, so a failed rule names the copy it would show. */
const t = (key: string) => key;
const schema = seoSharingSchema(t);

const blank: SeoSharingValues = { og_title: '', og_description: '', twitter_card: '', keywords: '', json_ld: '', meta_tags: [] };

const messages = (values: SeoSharingValues) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('toSeoSharingValues', () => {
  it('starts a new record (no seo yet) with every field blank and the card on Automatic', () => {
    expect(toSeoSharingValues()).toEqual(blank);
    expect(toSeoSharingValues(null)).toEqual(blank);
  });

  it('copies the saved share copy and strips meta tags down to name and content', () => {
    const seo = makeCmsSeo({
      og_title: 'Meet people',
      og_description: 'Pods near you',
      twitter_card: 'summary_large_image',
      keywords: 'pods, community',
      json_ld: '{"@type":"Organization"}',
      meta_tags: [{ __typename: 'CmsMetaTag', name: 'author', content: 'Duncit' }],
    });
    expect(toSeoSharingValues(seo)).toEqual({
      og_title: 'Meet people',
      og_description: 'Pods near you',
      twitter_card: 'summary_large_image',
      keywords: 'pods, community',
      json_ld: '{"@type":"Organization"}',
      meta_tags: [{ name: 'author', content: 'Duncit' }],
    });
  });

  it('falls back to Automatic for a card type the form does not offer', () => {
    expect(toSeoSharingValues(makeCmsSeo({ twitter_card: 'player' })).twitter_card).toBe('');
    expect(toSeoSharingValues(makeCmsSeo({ twitter_card: 'summary' })).twitter_card).toBe('summary');
  });

  it('treats a partial seo block (older documents) as blanks for what is missing', () => {
    expect(toSeoSharingValues({ og_title: 'Only a title' })).toEqual({ ...blank, og_title: 'Only a title' });
  });
});

describe('toSeoSharingInput', () => {
  it('sends exactly the six sharing fields, unchanged', () => {
    const values = schema.parse({
      og_title: 'T',
      og_description: 'D',
      twitter_card: 'summary',
      keywords: 'a, b',
      json_ld: '{}',
      meta_tags: [{ name: 'og:locale', content: 'en_IN' }],
    });
    expect(toSeoSharingInput(values)).toEqual({
      og_title: 'T',
      og_description: 'D',
      twitter_card: 'summary',
      keywords: 'a, b',
      json_ld: '{}',
      meta_tags: [{ name: 'og:locale', content: 'en_IN' }],
    });
  });
});

describe('seoSharingSchema', () => {
  it('accepts all-blank sharing fields', () => {
    expect(messages(blank)).toEqual([]);
  });

  it('trims text fields before saving', () => {
    const parsed = schema.parse({ ...blank, og_title: '  Hello  ', meta_tags: [{ name: ' robots ', content: ' noarchive ' }] });
    expect(parsed.og_title).toBe('Hello');
    expect(parsed.meta_tags).toEqual([{ name: 'robots', content: 'noarchive' }]);
  });

  it('rejects structured data that is not JSON, and accepts JSON or blank', () => {
    expect(messages({ ...blank, json_ld: '{"@type": "Organization",}' })).toEqual(['websiteApp.cms.seo.errJsonLd']);
    expect(messages({ ...blank, json_ld: '{"@context":"https://schema.org"}' })).toEqual([]);
    expect(messages({ ...blank, json_ld: '   ' })).toEqual([]);
  });

  it('rejects a meta name that does not start with a letter or has spaces', () => {
    expect(messages({ ...blank, meta_tags: [{ name: '1robots', content: 'x' }] })).toEqual(['websiteApp.cms.seo.errMetaName']);
    expect(messages({ ...blank, meta_tags: [{ name: 'my tag', content: 'x' }] })).toEqual(['websiteApp.cms.seo.errMetaName']);
    expect(messages({ ...blank, meta_tags: [{ name: '', content: 'x' }] })).toEqual(['websiteApp.cms.seo.errMetaName']);
  });

  it('accepts property-style meta names (og:, twitter:, dotted, dashed)', () => {
    const tags = ['og:image:alt', 'twitter:site', 'msapplication-TileColor', 'fb.app_id'].map((name) => ({ name, content: 'v' }));
    expect(messages({ ...blank, meta_tags: tags })).toEqual([]);
  });

  it(`allows up to ${MAX_SEO_META_TAGS} meta tags and refuses one more`, () => {
    const tag = { name: 'robots', content: 'index' };
    expect(messages({ ...blank, meta_tags: Array.from({ length: MAX_SEO_META_TAGS }, () => tag) })).toEqual([]);
    expect(schema.safeParse({ ...blank, meta_tags: Array.from({ length: MAX_SEO_META_TAGS + 1 }, () => tag) }).success).toBe(false);
  });

  it('enforces the API length limits at their boundaries', () => {
    expect(schema.safeParse({ ...blank, og_title: 'x'.repeat(160) }).success).toBe(true);
    expect(schema.safeParse({ ...blank, og_title: 'x'.repeat(161) }).success).toBe(false);
    expect(schema.safeParse({ ...blank, og_description: 'x'.repeat(321) }).success).toBe(false);
    expect(schema.safeParse({ ...blank, keywords: 'x'.repeat(301) }).success).toBe(false);
    expect(schema.safeParse({ ...blank, meta_tags: [{ name: 'a', content: 'x'.repeat(501) }] }).success).toBe(false);
    expect(schema.safeParse({ ...blank, json_ld: `"${'x'.repeat(20_000)}"` }).success).toBe(false);
  });

  it('only accepts the card types X understands', () => {
    expect(TWITTER_CARDS).toEqual(['', 'summary', 'summary_large_image']);
    expect(schema.safeParse({ ...blank, twitter_card: 'player' }).success).toBe(false);
  });
});
