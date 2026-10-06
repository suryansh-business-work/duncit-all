import { describe, expect, it } from 'vitest';
import type { CmsEntryData } from '../../src/pages/cms/queries/entries';
import { entrySchema, toEntryFormValues, toEntryInput } from '../../src/pages/cms/entries/entry-form/entry.types';
import { pageSchema, toPageFormValues, toPageInput } from '../../src/pages/cms/pages-tab/page-form/page.types';
import { siteSchema, toSiteFormValues, toSiteInput } from '../../src/pages/cms/sites/site-form/site.types';
import { makeCmsPageRow, makeCmsSeo, makeCmsSiteRow } from '../mocks/cms.mock';

const t = (key: string) => key;

const entry: NonNullable<CmsEntryData['cmsEntry']> = {
  id: 'entry-1',
  site_id: 'site-1',
  collection_type: 'BLOG',
  title: 'Launch week',
  slug: 'launch-week',
  summary: 'Five days of pods.',
  cover_image_url: '/img/launch.png',
  category: 'News',
  author_name: 'Duncit team',
  is_published: true,
  published_at: '2026-09-01T04:30:00.000Z',
  sort_order: 2,
  updated_at: '2026-09-02T00:00:00.000Z',
  body_html: '<p>Hello</p>',
  tags: ['pods', 'launch'],
  fields: [{ __typename: 'CmsEntryField', key: 'reading_time', value: '4 min' }],
  seo: makeCmsSeo({ title: 'Launch', description: 'Recap', og_image_url: '/img/og.png', noindex: true, og_title: 'Launch recap' }),
};

describe('entry form mapping', () => {
  it('loads every saved field of an entry, including its share card', () => {
    expect(toEntryFormValues(entry)).toMatchObject({
      title: 'Launch week',
      tags: 'pods, launch',
      fields: [{ key: 'reading_time', value: '4 min' }],
      seo_title: 'Launch',
      seo_image: '/img/og.png',
      noindex: true,
      published_at: '2026-09-01T04:30:00.000Z',
      seo_sharing: { og_title: 'Launch recap', twitter_card: '' },
    });
  });

  it('sends a publish date as ISO, a blank slug as null and the share card inside seo', () => {
    const values = entrySchema(t).parse({ ...toEntryFormValues(entry), slug: '' });
    const input = toEntryInput(values, 'BLOG');
    expect(input.slug).toBeNull();
    expect(input.published_at).toBe('2026-09-01T04:30:00.000Z');
    expect(input.tags).toEqual(['pods', 'launch']);
    expect(input.seo).toMatchObject({ title: 'Launch', noindex: true, og_title: 'Launch recap' });
  });

  it('sends no publish date when none is set', () => {
    const values = entrySchema(t).parse({ ...toEntryFormValues(entry), published_at: '' });
    expect(toEntryInput(values, 'BLOG').published_at).toBeNull();
  });
});

describe('page form mapping and rules', () => {
  it('requires a valid address for a page', () => {
    const result = pageSchema(t).safeParse({ ...toPageFormValues(null), title: 'About', path: 'about/' });
    expect(result.success ? [] : result.error.issues.map((issue) => issue.message)).toEqual(['websiteApp.cms.pageForm.errPath']);
  });

  it('requires a collection for a template, but no address', () => {
    const result = pageSchema(t).safeParse({ ...toPageFormValues(null), kind: 'COLLECTION_LIST', title: 'Blog', path: '' });
    expect(result.success ? [] : result.error.issues.map((issue) => issue.message)).toEqual(['websiteApp.cms.pageForm.errCollection']);
  });

  it('sends a template with its collection and no address', () => {
    const template = makeCmsPageRow({ kind: 'COLLECTION_DETAIL', collection_type: 'CAREER', path: '' });
    const input = toPageInput(pageSchema(t).parse(toPageFormValues(template)));
    expect(input).toMatchObject({ kind: 'COLLECTION_DETAIL', collection_type: 'CAREER', path: '' });
  });

  it('starts a preset error page with its address and title, hidden from search', () => {
    expect(toPageFormValues(null, { path: '/404', title: 'Page not found' })).toMatchObject({ path: '/404', title: 'Page not found', noindex: true });
  });
});

describe('site form mapping', () => {
  it('keeps a legacy site link and sends a blank header/footer as null', () => {
    const site = makeCmsSiteRow({ legacy_site: 'PARTNERS', collections: ['BLOG'], collection_paths: [{ collection: 'BLOG', path: '/stories' }] });
    const input = toSiteInput(siteSchema(t).parse(toSiteFormValues(site)));
    expect(input).toMatchObject({ legacy_site: 'PARTNERS', header_fragment_id: null, footer_fragment_id: null, collections: ['BLOG'] });
    expect(input.collection_paths).toContainEqual({ collection: 'BLOG', path: '/stories' });
  });
});
