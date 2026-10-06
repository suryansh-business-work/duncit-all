import type { Types } from 'mongoose';
import { CmsSiteModel, type ICmsSite } from './cmsSite.model';
import { CmsPageModel, type ICmsPage } from './cmsPage.model';
import { CmsFragmentModel } from './cmsFragment.model';
import { CmsEntryModel, type ICmsEntry } from './cmsEntry.model';
import { assertId, collectionPathsOf, iso, notFound, seoOf, toSite } from './cms.mappers';
import { CMS_LIST_PAGE_SIZE, type CmsCollection } from './cms.constants';
import {
  bindEntry,
  DEFAULT_DETAIL_TEMPLATE,
  DEFAULT_LIST_TEMPLATE,
  expandFragments,
  fragmentKeys,
  renderLists,
  type ComposedPart,
  type RenderEntry,
} from './cmsRender.compose';
import type { CmsSeo } from './cmsContent.schema-parts';

/** `published` reads what is live; `draft` is the editor's preview. */
type Mode = 'published' | 'draft';

interface Resolved {
  page: ICmsPage | null;
  template: string;
  title: string;
  seo: CmsSeo;
  status: number;
  entries?: ICmsEntry[];
  entry?: ICmsEntry;
  collectionBase?: string;
  pagination?: { page: number; total_pages: number; base_path: string };
}

const contentOf = (doc: { draft?: ComposedPart; published?: ComposedPart }, mode: Mode): ComposedPart =>
  mode === 'draft' && doc.draft?.html ? { html: doc.draft.html, css: doc.draft.css ?? '' } : { html: doc.published?.html ?? '', css: doc.published?.css ?? '' };

/** `Duncit.com:8080.` → `duncit.com`. */
export function normaliseHost(host: string): string {
  const name = host.trim().toLowerCase().split(':')[0];
  return name.endsWith('.') ? name.slice(0, -1) : name;
}

/** One spelling per address: leading slash, no trailing slash, lowercase. */
export function normalisePath(path: string): string {
  const segments = path.split(/[?#]/)[0].toLowerCase().split('/').filter(Boolean);
  return `/${segments.join('/')}`;
}

const toRenderEntry = (entry: ICmsEntry): RenderEntry => ({
  id: String(entry._id),
  apply: entry.collection_type === 'CAREER',
  title: entry.title,
  slug: entry.slug,
  summary: entry.summary ?? '',
  body_html: entry.body_html ?? '',
  cover_image_url: entry.cover_image_url ?? '',
  category: entry.category ?? '',
  tags: entry.tags ?? [],
  author_name: entry.author_name ?? '',
  fields: entry.fields ?? [],
  published_at: entry.published_at ?? null,
});

/** What the public can see of a collection: published, and not scheduled. */
const liveEntries = (siteId: Types.ObjectId, collection: CmsCollection) => ({
  site_id: siteId,
  collection_type: collection,
  is_published: true,
  published_at: { $lte: new Date() },
});

function mergeSeo(own: CmsSeo, fallback: Partial<CmsSeo>): CmsSeo {
  return {
    title: own.title || fallback.title || '',
    description: own.description || fallback.description || '',
    og_image_url: own.og_image_url || fallback.og_image_url || '',
    canonical_url: own.canonical_url,
    noindex: own.noindex,
  };
}

async function templateFor(siteId: Types.ObjectId, kind: 'COLLECTION_LIST' | 'COLLECTION_DETAIL', collection: CmsCollection, mode: Mode) {
  const filter: Record<string, unknown> = { site_id: siteId, kind, collection_type: collection };
  if (mode === 'published') filter.is_published = true;
  const page = await CmsPageModel.findOne(filter).exec();
  const fallback = kind === 'COLLECTION_LIST' ? DEFAULT_LIST_TEMPLATE : DEFAULT_DETAIL_TEMPLATE;
  return { page, template: page ? contentOf(page, mode).html || fallback : fallback };
}

async function resolveCollection(site: ICmsSite, path: string, pageNumber: number, mode: Mode): Promise<Resolved | null> {
  const paths = collectionPathsOf(site);
  for (const collection of site.collections ?? []) {
    const base = paths[collection];
    if (path === base) {
      const filter = liveEntries(site._id as Types.ObjectId, collection);
      const total = await CmsEntryModel.countDocuments(filter);
      const totalPages = Math.max(1, Math.ceil(total / CMS_LIST_PAGE_SIZE));
      const current = Math.min(Math.max(1, pageNumber), totalPages);
      const [entries, { page, template }] = await Promise.all([
        CmsEntryModel.find(filter)
          .select('-body_html')
          .sort({ sort_order: 1, published_at: -1 })
          .skip((current - 1) * CMS_LIST_PAGE_SIZE)
          .limit(CMS_LIST_PAGE_SIZE)
          .exec(),
        templateFor(site._id as Types.ObjectId, 'COLLECTION_LIST', collection, mode),
      ]);
      return {
        page,
        template,
        title: page?.title || site.name,
        seo: mergeSeo(seoOf(page?.seo), site.seo),
        status: 200,
        entries,
        collectionBase: base,
        pagination: { page: current, total_pages: totalPages, base_path: base },
      };
    }
    const slug = path.startsWith(`${base}/`) ? path.slice(base.length + 1) : '';
    if (slug && !slug.includes('/')) {
      const entry = await CmsEntryModel.findOne({ ...liveEntries(site._id as Types.ObjectId, collection), slug }).exec();
      if (!entry) return null;
      const { page, template } = await templateFor(site._id as Types.ObjectId, 'COLLECTION_DETAIL', collection, mode);
      const own = seoOf(entry.seo);
      return {
        page,
        template,
        title: entry.title,
        seo: mergeSeo(own, { title: entry.title, description: entry.summary, og_image_url: entry.cover_image_url || site.seo?.og_image_url }),
        status: 200,
        entry,
        collectionBase: base,
      };
    }
  }
  return null;
}

async function resolve(site: ICmsSite, path: string, pageNumber: number): Promise<Resolved> {
  const page = await CmsPageModel.findOne({ site_id: site._id, kind: 'PAGE', path, is_published: true }).exec();
  if (page) {
    return { page, template: page.published.html, title: page.title, seo: mergeSeo(seoOf(page.seo), site.seo), status: 200 };
  }
  const collection = await resolveCollection(site, path, pageNumber, 'published');
  if (collection) return collection;
  // A designed 404 page if the site has one; the renderer draws a plain one otherwise.
  const missing = await CmsPageModel.findOne({ site_id: site._id, kind: 'PAGE', path: '/404', is_published: true }).exec();
  return {
    page: missing,
    template: missing?.published.html ?? '',
    title: missing?.title ?? '',
    seo: { ...mergeSeo(seoOf(missing?.seo), site.seo), noindex: true },
    status: 404,
  };
}

/** Header + page + footer, fragments expanded and fields bound. */
async function compose(site: ICmsSite, resolved: Resolved, mode: Mode) {
  const page = resolved.page;
  const ownCss = page ? contentOf(page, mode).css : '';
  const chromeIds = [
    page?.show_header === false ? null : site.header_fragment_id,
    page?.show_footer === false ? null : site.footer_fragment_id,
  ];
  const keys = fragmentKeys(resolved.template);
  const fragmentFilter: Record<string, unknown> = {
    site_id: site._id,
    $or: [{ key: { $in: keys } }, { _id: { $in: chromeIds.filter(Boolean) } }],
  };
  if (mode === 'published') fragmentFilter.is_published = true;
  const fragments = await CmsFragmentModel.find(fragmentFilter).select('-draft.project').exec();
  const byKey = new Map(fragments.map((f) => [f.key, contentOf(f, mode)]));
  const byId = new Map(fragments.map((f) => [String(f._id), f]));

  let body = resolved.template;
  if (resolved.entry) body = bindEntry(body, toRenderEntry(resolved.entry));
  if (resolved.entries) body = renderLists(body, resolved.entries.map(toRenderEntry), resolved.collectionBase ?? '');
  const main = expandFragments(body, byKey);

  const chrome = chromeIds.map((id) => (id ? byId.get(String(id)) : undefined));
  const [header, footer] = chrome.map((f) => (f ? expandFragments(contentOf(f, mode).html, byKey) : null));
  const chromeCss = chrome.map((f) => (f ? contentOf(f, mode).css : ''));

  return {
    html:
      (header ? `<header data-cms-chrome="header">${header.html}</header>` : '') +
      `<main id="main" data-cms-page>${main.html}</main>` +
      (footer ? `<footer data-cms-chrome="footer">${footer.html}</footer>` : ''),
    css: [chromeCss[0], header?.css, ownCss, main.css, chromeCss[1], footer?.css, page?.custom_css].filter(Boolean).join('\n'),
  };
}

function siteOut(site: ICmsSite) {
  const pub = toSite(site);
  return {
    key: pub.key,
    name: pub.name,
    legacy_site: pub.legacy_site,
    design: pub.design,
    head_html: pub.head_html,
    body_end_html: pub.body_end_html,
    custom_css: pub.custom_css,
    custom_js: pub.custom_js,
    favicon_url: pub.favicon_url,
  };
}

const NOTHING = { status: 404, site: null, title: '', html: '', css: '', seo: seoOf(null), head_html: '', custom_js: '', pagination: null };

async function respond(site: ICmsSite, resolved: Resolved, mode: Mode) {
  const { html, css } = await compose(site, resolved, mode);
  return {
    status: resolved.status,
    site: siteOut(site),
    title: resolved.title,
    html,
    css,
    seo: resolved.seo,
    head_html: resolved.page?.head_html ?? '',
    custom_js: resolved.page?.custom_js ?? '',
    pagination: resolved.pagination ?? null,
  };
}

export const cmsRenderService = {
  /** Public: what a CMS site serves at a path. */
  async render(host: string, path: string, pageNumber = 1) {
    const site = await CmsSiteModel.findOne({ domains: normaliseHost(host), is_active: true }).exec();
    if (!site) return NOTHING;
    return respond(site, await resolve(site, normalisePath(path), pageNumber), 'published');
  },

  /** A page's draft (and its fragments' drafts) exactly as it would render. */
  async preview(pageId: string, entryId?: string | null) {
    const page = await CmsPageModel.findById(assertId(pageId, 'page')).exec();
    if (!page) throw notFound('Page');
    const site = await CmsSiteModel.findById(page.site_id).exec();
    if (!site) throw notFound('Site');
    const template = contentOf(page, 'draft').html;
    const resolved: Resolved = { page, template, title: page.title, seo: mergeSeo(seoOf(page.seo), site.seo), status: 200 };
    if (page.kind !== 'PAGE' && page.collection_type) {
      const filter = { site_id: site._id, collection_type: page.collection_type };
      if (page.kind === 'COLLECTION_LIST') {
        resolved.entries = await CmsEntryModel.find(filter).sort({ published_at: -1 }).limit(CMS_LIST_PAGE_SIZE).exec();
      } else {
        const entry = entryId
          ? await CmsEntryModel.findOne({ ...filter, _id: assertId(entryId, 'entry') }).exec()
          : await CmsEntryModel.findOne(filter).sort({ published_at: -1 }).exec();
        if (entry) resolved.entry = entry;
      }
      resolved.collectionBase = collectionPathsOf(site)[page.collection_type];
      resolved.template ||= page.kind === 'COLLECTION_LIST' ? DEFAULT_LIST_TEMPLATE : DEFAULT_DETAIL_TEMPLATE;
    }
    return respond(site, resolved, 'draft');
  },

  /** Public: every indexable live address of a site. */
  async sitemap(host: string) {
    const site = await CmsSiteModel.findOne({ domains: normaliseHost(host), is_active: true }).exec();
    if (!site) return [];
    const [pages, entries] = await Promise.all([
      CmsPageModel.find({ site_id: site._id, kind: 'PAGE', is_published: true, 'seo.noindex': { $ne: true }, path: { $ne: '/404' } })
        .select('path updated_at')
        .exec(),
      CmsEntryModel.find({ site_id: site._id, collection_type: { $in: site.collections }, is_published: true, published_at: { $lte: new Date() }, 'seo.noindex': { $ne: true } })
        .select('collection_type slug updated_at')
        .exec(),
    ]);
    const paths = collectionPathsOf(site);
    return [
      ...pages.map((p) => ({ path: p.path, updated_at: iso(p.updated_at) ?? '' })),
      ...(site.collections ?? []).map((c) => ({ path: paths[c], updated_at: iso(site.updated_at) ?? '' })),
      ...entries.map((e) => ({ path: `${paths[e.collection_type]}/${e.slug}`, updated_at: iso(e.updated_at) ?? '' })),
    ];
  },
};
