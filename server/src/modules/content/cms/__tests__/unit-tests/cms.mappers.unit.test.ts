import { Types } from 'mongoose';
import { hasUnpublishedChanges, seoOf, toFragment, toPage } from '../../cms.mappers';
import type { ICmsFragment } from '../../cmsFragment.model';
import type { ICmsPage } from '../../cmsPage.model';

const EMPTY_SEO = {
  title: '',
  description: '',
  og_image_url: '',
  canonical_url: '',
  noindex: false,
  og_title: '',
  og_description: '',
  twitter_card: '',
  keywords: '',
  json_ld: '',
  meta_tags: [],
};

describe('seoOf', () => {
  it('fills every field, the sharing ones included, when nothing is saved', () => {
    expect(seoOf(null)).toEqual(EMPTY_SEO);
    expect(seoOf(undefined)).toEqual(EMPTY_SEO);
    expect(seoOf({})).toEqual(EMPTY_SEO);
  });

  it('keeps the saved share card, keywords, structured data and extra tags', () => {
    const seo = seoOf({
      og_title: 'Share title',
      og_description: 'Share text',
      twitter_card: 'summary_large_image',
      keywords: 'pets, meetups',
      json_ld: '{"@type":"Organization"}',
      meta_tags: [{ name: 'author', content: 'Duncit' }],
    });
    expect(seo).toMatchObject({
      og_title: 'Share title',
      og_description: 'Share text',
      twitter_card: 'summary_large_image',
      keywords: 'pets, meetups',
      json_ld: '{"@type":"Organization"}',
      meta_tags: [{ name: 'author', content: 'Duncit' }],
    });
  });

  it('copies each meta tag to a plain {name, content}: no subdocument extras leak through', () => {
    const tag = { name: 'og:locale', content: 'en_IN', _id: 'x' };
    expect(seoOf({ meta_tags: [tag] }).meta_tags).toEqual([{ name: 'og:locale', content: 'en_IN' }]);
  });
});

describe('hasUnpublishedChanges', () => {
  const same = { html: '<p>a</p>', css: '.a{}', scss: '$c: red;', js: 'root.x = 1;' };

  it('is true for anything never published', () => {
    expect(hasUnpublishedChanges({ draft: same, published: same, is_published: false })).toBe(true);
    expect(hasUnpublishedChanges({})).toBe(true);
  });

  it('is false when the draft matches the live copy in every part', () => {
    expect(hasUnpublishedChanges({ draft: same, published: same, is_published: true })).toBe(false);
  });

  it('treats a missing draft and published copy as equal (both empty)', () => {
    expect(hasUnpublishedChanges({ is_published: true })).toBe(false);
  });

  it.each(['html', 'css', 'scss', 'js'] as const)('is true when only the %s differs', (part) => {
    expect(hasUnpublishedChanges({ draft: { ...same, [part]: 'changed' }, published: same, is_published: true })).toBe(true);
  });

  it('notices SCSS or JS added to a draft whose live copy predates them', () => {
    const legacy = { html: same.html, css: same.css };
    expect(hasUnpublishedChanges({ draft: { ...legacy, scss: '.x{}' }, published: legacy, is_published: true })).toBe(true);
    expect(hasUnpublishedChanges({ draft: { ...legacy, js: 'go();' }, published: legacy, is_published: true })).toBe(true);
    expect(hasUnpublishedChanges({ draft: { ...legacy, scss: '', js: '' }, published: legacy, is_published: true })).toBe(false);
  });
});

const ids = { _id: new Types.ObjectId(), site_id: new Types.ObjectId() };

describe('toFragment', () => {
  it('maps description, category and the code parts of the draft and the live copy', () => {
    const draftHtml = '<cms-block data-block="reel-slider"></cms-block>';
    const fragment = {
      ...ids,
      key: 'hero',
      name: 'Hero',
      kind: 'SECTION',
      description: 'Top of the home page',
      category: 'Hero',
      draft: { project: '{}', html: draftHtml, css: '.a{}', scss: '.b{}', js: 'root.a=1;' },
      published: {
        html: '<p>live</p>',
        css: '',
        scss: '.live{}',
        js: 'live();',
        version: 3,
        published_at: new Date('2026-01-02T03:04:05Z'),
        published_by: 'u1',
      },
      is_published: true,
    } as unknown as ICmsFragment;
    expect(toFragment(fragment)).toMatchObject({
      id: ids._id.toHexString(),
      description: 'Top of the home page',
      category: 'Hero',
      blocks: ['reel-slider'],
      has_unpublished_changes: true,
      draft: { project: '{}', html: draftHtml, css: '.a{}', scss: '.b{}', js: 'root.a=1;' },
      published: {
        html: '<p>live</p>',
        css: '',
        scss: '.live{}',
        js: 'live();',
        version: 3,
        published_at: '2026-01-02T03:04:05.000Z',
        published_by: 'u1',
      },
    });
  });

  it('reads a fragment saved before description, category, SCSS and JS existed as empty', () => {
    const out = toFragment({ ...ids, key: 'old', name: 'Old', draft: { html: '<p>x</p>' }, published: {} } as unknown as ICmsFragment);
    expect(out).toMatchObject({
      kind: 'SECTION',
      description: '',
      category: '',
      blocks: [],
      is_published: false,
      draft: { project: '', html: '<p>x</p>', css: '', scss: '', js: '' },
      published: { html: '', css: '', scss: '', js: '', version: 0, published_at: null, published_by: '' },
    });
  });
});

describe('toPage', () => {
  it('maps the page SEO with the sharing fields, and its draft with SCSS and JS', () => {
    const page = {
      ...ids,
      title: 'About',
      path: '/about',
      seo: { title: 'About us', twitter_card: 'summary', meta_tags: [{ name: 'author', content: 'Duncit' }] },
      draft: { scss: '.p{}', js: 'go();' },
      is_published: true,
    } as unknown as ICmsPage;
    const out = toPage(page);
    expect(out.seo).toEqual({ ...EMPTY_SEO, title: 'About us', twitter_card: 'summary', meta_tags: [{ name: 'author', content: 'Duncit' }] });
    expect(out.draft).toEqual({ project: '', html: '', css: '', scss: '.p{}', js: 'go();' });
    expect(out.published).toMatchObject({ scss: '', js: '' });
    expect(out.has_unpublished_changes).toBe(true);
  });
});
