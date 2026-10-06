import { describe, expect, it } from 'vitest';
import { entrySchema, toEntryFormValues, toEntryInput } from '../../src/pages/cms/entries/entry-form/entry.types';
import { pageSchema, toPageFormValues, toPageInput } from '../../src/pages/cms/pages-tab/page-form/page.types';
import { siteSchema, toSiteFormValues, toSiteInput } from '../../src/pages/cms/sites/site-form/site.types';
import { fragmentSchema, toFragmentFormValues, toFragmentInput } from '../../src/pages/cms/fragments-tab/fragment-form/fragment.types';
import { makeCmsFragmentRow, makeCmsPageRow, makeCmsSeo, makeCmsSiteRow } from '../mocks/cms.mock';

const t = (key: string) => key;

const sharing = {
  og_title: 'Share me',
  og_description: 'A card',
  twitter_card: 'summary_large_image' as const,
  keywords: 'pods',
  json_ld: '{"@type":"WebPage"}',
  meta_tags: [{ name: 'author', content: 'Duncit' }],
};
const savedSeo = makeCmsSeo({ ...sharing, meta_tags: [{ __typename: 'CmsMetaTag', name: 'author', content: 'Duncit' }] });

const issuePaths = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  (result.error?.issues ?? []).map((issue) => `${issue.path.join('.')}: ${issue.message}`);

describe('entry form — sharing fields', () => {
  it('opens a new entry with blank sharing fields', () => {
    expect(toEntryFormValues(null).seo_sharing).toEqual({ og_title: '', og_description: '', twitter_card: '', keywords: '', json_ld: '', meta_tags: [] });
  });

  it('sends the sharing fields inside seo alongside the search fields', () => {
    const values = entrySchema(t).parse({ ...toEntryFormValues(null), title: 'Hello', seo_title: 'Search', noindex: true, seo_sharing: sharing });
    expect(toEntryInput(values, 'BLOG').seo).toEqual({ title: 'Search', description: '', og_image_url: '', noindex: true, ...sharing });
  });

  it('refuses invalid structured data on the entry', () => {
    const result = entrySchema(t).safeParse({ ...toEntryFormValues(null), title: 'Hello', seo_sharing: { ...sharing, json_ld: '{nope' } });
    expect(issuePaths(result)).toEqual(['seo_sharing.json_ld: websiteApp.cms.seo.errJsonLd']);
  });
});

describe('page form — sharing fields', () => {
  it('loads the saved share card of an existing page', () => {
    expect(toPageFormValues(makeCmsPageRow({ seo: savedSeo })).seo_sharing).toEqual(sharing);
  });

  it('starts a new page (or a preset error page) with blank sharing fields', () => {
    expect(toPageFormValues(null, { path: '/404', title: 'Not found' }).seo_sharing.meta_tags).toEqual([]);
  });

  it('round-trips the sharing fields into the page input', () => {
    const values = pageSchema(t).parse(toPageFormValues(makeCmsPageRow({ seo: savedSeo })));
    expect(toPageInput(values).seo).toEqual({ title: '', description: '', og_image_url: '', canonical_url: '', noindex: false, ...sharing });
  });

  it('refuses a bad meta tag name on the page', () => {
    const result = pageSchema(t).safeParse({ ...toPageFormValues(makeCmsPageRow()), seo_sharing: { ...sharing, meta_tags: [{ name: '-x', content: '' }] } });
    expect(issuePaths(result)).toEqual(['seo_sharing.meta_tags.0.name: websiteApp.cms.seo.errMetaName']);
  });
});

describe('site form — sharing defaults', () => {
  it('loads the site-wide share defaults and sends them back inside seo', () => {
    const site = makeCmsSiteRow({ seo: makeCmsSeo({ ...savedSeo, title: 'Duncit', description: 'Meet people', og_image_url: '/og.png' }) });
    const formValues = toSiteFormValues(site);
    expect(formValues.seo_sharing).toEqual(sharing);
    const input = toSiteInput(siteSchema(t).parse(formValues));
    expect(input.seo).toEqual({ title: 'Duncit', description: 'Meet people', og_image_url: '/og.png', ...sharing });
  });

  it('starts a new site with blank sharing defaults', () => {
    expect(toSiteFormValues(null).seo_sharing.twitter_card).toBe('');
  });
});

describe('fragment form — category and description', () => {
  it('defaults both to blank for a new component and loads them for an existing one', () => {
    expect(toFragmentFormValues(null)).toMatchObject({ category: '', description: '' });
    expect(toFragmentFormValues(makeCmsFragmentRow({ category: 'Home', description: 'Top of the page' }))).toMatchObject({
      category: 'Home',
      description: 'Top of the page',
    });
  });

  it('trims them and sends them with the rest of the component', () => {
    const values = fragmentSchema(t).parse({ name: 'Hero', key: 'hero', kind: 'SECTION', category: '  Home ', description: ' Big banner ' });
    expect(toFragmentInput(values)).toEqual({ name: 'Hero', key: 'hero', kind: 'SECTION', category: 'Home', description: 'Big banner' });
  });

  it('caps the category at 60 and the description at 500 characters', () => {
    const base = { name: 'Hero', key: 'hero', kind: 'SECTION' as const };
    expect(fragmentSchema(t).safeParse({ ...base, category: 'x'.repeat(60), description: 'y'.repeat(500) }).success).toBe(true);
    const result = fragmentSchema(t).safeParse({ ...base, category: 'x'.repeat(61), description: 'y'.repeat(501) });
    expect(issuePaths(result)).toEqual(['category: websiteApp.cms.fragmentForm.errCategory', 'description: websiteApp.cms.fragmentForm.errDescription']);
  });
});
