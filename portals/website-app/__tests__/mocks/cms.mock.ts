import type { MockedResponse } from '@apollo/client/testing';
import type { CmsSeo } from '@duncit/gql-types';
import type { CmsPageRow } from '../../src/pages/cms/queries/pages';
import type { CmsFragmentRow } from '../../src/pages/cms/queries/fragments';
import { CMS_SITE_DESIGN, type CmsSiteDesignData, type CmsSiteRow } from '../../src/pages/cms/queries/sites';
import type { ComponentDraft } from '../../src/pages/cms/fragments-tab/component-code-form';

/** A full SEO block with nothing set — the shape the API returns for a fresh page. */
export const makeCmsSeo = (over: Partial<CmsSeo> = {}): CmsSeo => ({
  __typename: 'CmsSeo',
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
  ...over,
});

/** Rows carry __typename: the mocked Apollo cache normalises them like production. */
export const makeCmsPageRow = (over: Partial<CmsPageRow> = {}): CmsPageRow & { __typename: 'CmsPage' } => ({
  id: 'page-1',
  site_id: 'site-1',
  kind: 'PAGE',
  collection_type: null,
  title: 'About',
  path: '/about',
  is_published: false,
  has_unpublished_changes: false,
  seo: makeCmsSeo(),
  show_header: true,
  show_footer: true,
  head_html: '',
  custom_css: '',
  custom_js: '',
  sort_order: 0,
  published: { version: 0, published_at: null },
  updated_at: '2026-10-01T10:00:00.000Z',
  ...over,
  __typename: 'CmsPage',
});

export const makeCmsFragmentRow = (over: Partial<CmsFragmentRow> = {}): CmsFragmentRow & { __typename: 'CmsFragment' } => ({
  __typename: 'CmsFragment',
  id: 'frag-1',
  site_id: 'site-1',
  key: 'hero',
  name: 'Hero',
  kind: 'SECTION',
  description: '',
  category: '',
  blocks: [],
  is_published: false,
  has_unpublished_changes: false,
  published: { version: 0, published_at: null },
  updated_at: '2026-10-01T10:00:00.000Z',
  ...over,
});

export const makeCmsSiteRow = (over: Partial<CmsSiteRow> = {}): CmsSiteRow => ({
  __typename: 'CmsSite',
  id: 'site-1',
  key: 'main',
  name: 'Main',
  domains: ['duncit.com'],
  legacy_site: null,
  is_active: true,
  favicon_url: '',
  seo: makeCmsSeo(),
  header_fragment_id: null,
  footer_fragment_id: null,
  collections: [],
  collection_paths: [],
  page_count: 0,
  updated_at: '2026-10-01T10:00:00.000Z',
  ...over,
});

export const makeComponentDraft = (over: Partial<ComponentDraft> = {}): ComponentDraft => ({
  project: '{"pages":[]}',
  html: '<section class="hero"></section>',
  css: '.hero{color:red}',
  scss: '.hero { color: var(--brand); }',
  js: 'root.dataset.ready = "1";',
  ...over,
});

/** The Design tab's query answered with one colour token and a heading font. */
export const siteDesignMock = (siteId = 'site-1', site: CmsSiteDesignData['cmsSite'] | 'none' = makeSiteDesign()): MockedResponse => ({
  request: { query: CMS_SITE_DESIGN, variables: { id: siteId } },
  result: { data: { cmsSite: site === 'none' ? null : site } },
});

export const makeSiteDesign = (): NonNullable<CmsSiteDesignData['cmsSite']> & { __typename: 'CmsSite' } => ({
  __typename: 'CmsSite',
  id: 'site-1',
  design: {
    __typename: 'CmsDesign',
    tokens: [{ __typename: 'CmsToken', name: '--brand', value: '#ff6600', group: 'color' }],
    fonts: [
      {
        __typename: 'CmsFont',
        family: 'Inter',
        source: 'GOOGLE',
        weights: [400],
        italic: false,
        role: 'HEADING',
        variable: '',
        fallback: '',
        files: [],
      },
    ],
    font_urls: [],
    base_css: '',
  },
  head_html: '',
  body_end_html: '',
  custom_css: '',
  custom_js: '',
  updated_at: '2026-10-01T10:00:00.000Z',
});

/** What makeSiteDesign() lists beside a stylesheet. */
export const SITE_DESIGN_TOKENS = [
  { name: '--brand', value: '#ff6600' },
  { name: '--font-heading', value: '"Inter", sans-serif' },
];
