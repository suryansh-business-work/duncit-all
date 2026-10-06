import { z } from 'zod';
import {
  arr,
  bool,
  filled,
  finite,
  gte,
  int,
  lowercase,
  matches,
  maxItems,
  maxLen,
  num,
  obj,
  shape,
  str,
  trim,
} from '@utils/zod-fields';
import {
  CMS_COLLECTIONS,
  CMS_CSS_VARIABLE,
  CMS_FONT_FAMILY,
  CMS_FRAGMENT_KINDS,
  CMS_LEGACY_SITES,
  CMS_PAGE_KINDS,
  CMS_PATH_PATTERN,
  CMS_SLUG_PATTERN,
  isCmsDomain,
} from './cms.constants';

// Size caps. A GrapesJS project for a long landing page is a few hundred KB;
// these leave room for that and stop a runaway paste from bloating a document.
const MAX_PROJECT = 5_000_000;
const MAX_HTML = 2_000_000;
const MAX_CSS = 1_000_000;
const MAX_CODE = 200_000;

const text = (max: number, fallback = '') => str(z.string().check(maxLen(max)), { transforms: [trim], default: fallback });
const code = (max: number) => str(z.string().check(maxLen(max)), { default: '' });
const optionalBool = (fallback: boolean) => bool(z.boolean(), { default: fallback });
const order = num(finite().check(int(), gte(0)), { default: 0 });
const objectId = str(z.string().check(matches(/^[a-f\d]{24}$/i, 'Invalid id')).nullable(), { default: null });

/** Blank, an https link, or a path on the site itself (`/legacy/main/logo.svg`)
 * — never a protocol-relative `//host`, which would load from anywhere. */
const isHttpsOrBlank = (value: string) => {
  if (!value) return true;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};
const httpsUrl = str(z.string().check(maxLen(1000)).refine(isHttpsOrBlank, 'Use an https link'), {
  transforms: [trim],
  default: '',
});

const seoShape = obj(
  shape({
    title: text(160),
    description: text(320),
    og_image_url: httpsUrl,
    canonical_url: httpsUrl,
    noindex: optionalBool(false),
  })
);

const pagePath = str(
  z.string().check(maxLen(300), matches(CMS_PATH_PATTERN, 'A path looks like /about or /safety/tools — lowercase, no trailing slash')),
  { transforms: [trim, lowercase], required: true }
);

const slug = str(
  z.string().check(maxLen(160), matches(CMS_SLUG_PATTERN, 'Use lowercase words joined by hyphens')).optional(),
  { transforms: [trim, lowercase] }
);

export const cmsSiteInputSchema = obj(
  shape({
    key: str(z.string().check(filled('Give the site a key'), maxLen(60), matches(CMS_SLUG_PATTERN, 'Use lowercase words joined by hyphens')), {
      required: 'Give the site a key',
      transforms: [trim, lowercase],
    }),
    name: str(z.string().check(filled('Name the site'), maxLen(120)), { required: 'Name the site', transforms: [trim] }),
    domains: arr(
      z
        .array(str(z.string().refine(isCmsDomain, 'Enter a domain like duncit.com'), { transforms: [trim, lowercase] }))
        .check(maxItems(20)),
      { default: [] }
    ),
    legacy_site: str(z.enum(CMS_LEGACY_SITES).nullable(), { default: null }),
    is_active: optionalBool(true),
    favicon_url: httpsUrl,
    seo: seoShape,
    header_fragment_id: objectId,
    footer_fragment_id: objectId,
    collections: arr(z.array(z.enum(CMS_COLLECTIONS)), { default: [] }),
    collection_paths: arr(
      z.array(obj(shape({ collection: str(z.enum(CMS_COLLECTIONS), { required: true }), path: pagePath }))),
      { default: [] }
    ),
  })
);

const FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
// Written into css (`font-family: "<family>"` and Google's css2 URL), so plain
// names only — letters, digits, spaces, hyphens.
const isFontFamily = (value: string) => CMS_FONT_FAMILY.test(value);
const isFontStack = (value: string) => !/[;{}<>]/.test(value);
const weight = num(finite().check(int()).refine((w) => FONT_WEIGHTS.includes(w), 'A weight is 100, 200 … 900'), { required: true });

const fontShape = obj(
  shape({
    family: str(z.string().refine(isFontFamily, 'A font name is letters, digits, spaces and hyphens'), { required: true, transforms: [trim] }),
    source: str(z.enum(['GOOGLE', 'CUSTOM']), { required: true }),
    weights: arr(z.array(weight).check(maxItems(9)), { default: [400] }),
    italic: optionalBool(false),
    role: str(z.enum(['HEADING', 'BODY', 'ACCENT', 'NONE']), { default: 'NONE' }),
    variable: str(
      z.string().refine((v) => v === '' || CMS_CSS_VARIABLE.test(v), 'A token is a CSS variable like --font-display'),
      { transforms: [trim, lowercase], default: '' }
    ),
    fallback: str(z.string().check(maxLen(120)).refine(isFontStack, 'A fallback cannot contain ; { } < or >'), {
      transforms: [trim],
      default: 'sans-serif',
    }),
    files: arr(
      z
        .array(
          obj(
            shape({
              weight,
              style: str(z.enum(['normal', 'italic']), { default: 'normal' }),
              url: str(z.string().check(filled(), maxLen(1000)).refine(isHttpsOrBlank, 'Use an https link'), { required: true, transforms: [trim] }),
            })
          )
        )
        .check(maxItems(18)),
      { default: [] }
    ),
  })
);

export const cmsDesignInputSchema = obj(
  shape({
    fonts: arr(z.array(fontShape).check(maxItems(12)), { default: [] }),
    tokens: arr(
      z
        .array(
          obj(
            shape({
              name: str(
                z.string().check(matches(CMS_CSS_VARIABLE, 'A token is a CSS variable like --color-primary')),
                { required: true, transforms: [trim, lowercase] }
              ),
              value: str(z.string().check(filled(), maxLen(400)).refine((v) => !/[;{}<>]/.test(v), 'A token value cannot contain ; { } < or >'), {
                required: true,
                transforms: [trim],
              }),
              group: text(40, 'color'),
            })
          )
        )
        .check(maxItems(300)),
      { default: [] }
    ),
    font_urls: arr(z.array(httpsUrl).check(maxItems(10)), { default: [] }),
    base_css: code(MAX_CSS),
  })
);

export const cmsSiteCodeInputSchema = obj(
  shape({
    head_html: code(MAX_CODE),
    body_end_html: code(MAX_CODE),
    custom_css: code(MAX_CSS),
    custom_js: code(MAX_CODE),
  })
);

export const cmsPageInputSchema = obj(
  shape({
    kind: str(z.enum(CMS_PAGE_KINDS), { default: 'PAGE' }),
    collection_type: str(z.enum(CMS_COLLECTIONS).nullable(), { default: null }),
    title: str(z.string().check(filled('Give the page a title'), maxLen(160)), { required: 'Give the page a title', transforms: [trim] }),
    path: str(
      z.string().check(maxLen(300)).refine((v) => v === '' || CMS_PATH_PATTERN.test(v), 'A path looks like /about or /safety/tools — lowercase, no trailing slash'),
      { transforms: [trim, lowercase], default: '' }
    ),
    seo: seoShape,
    show_header: optionalBool(true),
    show_footer: optionalBool(true),
    head_html: code(MAX_CODE),
    custom_css: code(MAX_CSS),
    custom_js: code(MAX_CODE),
    sort_order: order,
  })
);

export const cmsDraftInputSchema = obj(
  shape({
    project: code(MAX_PROJECT),
    html: code(MAX_HTML),
    css: code(MAX_CSS),
    base_updated_at: str(z.string().nullable().optional(), { default: null }),
  })
);

export const cmsFragmentInputSchema = obj(
  shape({
    key: str(z.string().check(filled('Give the fragment a key'), maxLen(60), matches(CMS_SLUG_PATTERN, 'Use lowercase words joined by hyphens')), {
      required: 'Give the fragment a key',
      transforms: [trim, lowercase],
    }),
    name: str(z.string().check(filled('Name the fragment'), maxLen(120)), { required: 'Name the fragment', transforms: [trim] }),
    kind: str(z.enum(CMS_FRAGMENT_KINDS), { required: true }),
  })
);

export const cmsEntryInputSchema = obj(
  shape({
    collection_type: str(z.enum(CMS_COLLECTIONS), { required: true }),
    title: str(z.string().check(filled('Give it a title'), maxLen(200)), { required: 'Give it a title', transforms: [trim] }),
    slug,
    summary: text(600),
    body_html: code(MAX_HTML),
    cover_image_url: httpsUrl,
    category: text(80),
    tags: arr(z.array(text(40)).check(maxItems(20)), { default: [] }),
    author_name: text(120),
    fields: arr(
      z.array(obj(shape({ key: str(z.string().check(filled(), maxLen(60)), { required: true, transforms: [trim] }), value: text(1000) }))).check(maxItems(30)),
      { default: [] }
    ),
    seo: seoShape,
    is_published: optionalBool(false),
    published_at: str(z.string().nullable(), { default: null }),
    sort_order: order,
  })
);
