import type { Types } from 'mongoose';
import { CmsSiteModel, type ICmsSite } from './cmsSite.model';
import { CmsPageModel, type ICmsPage } from './cmsPage.model';
import { CmsFragmentModel } from './cmsFragment.model';
import { CmsEntryModel, type ICmsEntry } from './cmsEntry.model';
import { CmsVersionModel } from './cmsVersion.model';
import { assertId, collectionPathsOf, iso, notFound, seoOf, toSite } from './cms.mappers';
import { CMS_ERROR_CODES, CMS_ERROR_PATHS, CMS_LIST_PAGE_SIZE, errorCodeOf, type CmsCollection } from './cms.constants';
import { compileScssOrRaw } from './cmsCode.service';
import {
  bindEntry,
  DEFAULT_DETAIL_TEMPLATE,
  DEFAULT_LIST_TEMPLATE,
  expandFragments,
  fragmentKeys,
  MAX_FRAGMENT_DEPTH,
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
  /** The page's own css/js when they are not the draft/published copy (a saved version). */
  css?: string;
  js?: string;
  /** Components to render from these contents instead of their published copies (a component preview). */
  overrides?: Map<string, ComposedPart>;
  /** No site header or footer: a component shown on its own. */
  bare?: boolean;
  title: string;
  seo: CmsSeo;
  status: number;
  entries?: ICmsEntry[];
  entry?: ICmsEntry;
  collectionBase?: string;
  pagination?: { page: number; total_pages: number; base_path: string };
}

/** What a page or component stores per copy; Mongoose fills in every field's default. */
interface StoredContent {
  html: string;
  css: string;
  scss: string;
  js: string;
}

/** The draft when it is wanted and has been designed, else the published copy. */
const contentOf = (doc: { draft: StoredContent; published: StoredContent }, mode: Mode): ComposedPart => {
  const copy = mode === 'draft' && doc.draft.html ? doc.draft : doc.published;
  return { html: copy.html, css: joinCss(copy.css, copy.scss), js: copy.js };
};

/** The visual editor's styles, then the hand-written SCSS (so code wins a tie). Compiled together. */
function joinCss(css: string, scss: string): string {
  return [css, scss].filter(Boolean).join('\n');
}

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
    // A page's share card, keywords and structured data fall back to the site's; the site's extra tags come first.
    og_title: own.og_title || fallback.og_title || '',
    og_description: own.og_description || fallback.og_description || '',
    twitter_card: own.twitter_card || fallback.twitter_card || '',
    keywords: own.keywords || fallback.keywords || '',
    json_ld: own.json_ld || fallback.json_ld || '',
    meta_tags: [...(fallback.meta_tags ?? []), ...own.meta_tags],
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
    // An error page opened directly keeps its own status, and is never indexed.
    const code = errorCodeOf(path);
    const seo = mergeSeo(seoOf(page.seo), site.seo);
    return { page, template: page.published.html, title: page.title, seo: code ? { ...seo, noindex: true } : seo, status: code ?? 200 };
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

/**
 * Every component a render can show: the ones the template and the chrome
 * place, then the ones those place in turn — as deep as expandFragments goes.
 */
async function loadComponents(site: ICmsSite, resolved: Resolved, mode: Mode, chromeIds: (Types.ObjectId | null)[]) {
  const scope: Record<string, unknown> = { site_id: site._id };
  if (mode === 'published') scope.is_published = true;
  const find = (match: Record<string, unknown>) => CmsFragmentModel.find({ ...scope, ...match }).select('-draft.project').exec();
  const fragments = await find({ $or: [{ key: { $in: fragmentKeys(resolved.template) } }, { _id: { $in: chromeIds.filter(Boolean) } }] });
  const byKey = new Map([...fragments.map((f): [string, ComposedPart] => [f.key, contentOf(f, mode)]), ...(resolved.overrides ?? [])]);
  for (let level = 1; level < MAX_FRAGMENT_DEPTH; level++) {
    const missing = [...new Set([...byKey.values()].flatMap((part) => fragmentKeys(part.html)))].filter((key) => !byKey.has(key));
    if (!missing.length) break;
    const nested = await find({ key: { $in: missing } });
    fragments.push(...nested);
    for (const f of nested) byKey.set(f.key, contentOf(f, mode));
  }
  return { fragments, byKey };
}

/** Header + page + footer, fragments expanded and fields bound. */
async function compose(site: ICmsSite, resolved: Resolved, mode: Mode) {
  const page = resolved.page;
  const ownCss = resolved.css ?? (page ? contentOf(page, mode).css : '');
  const ownJs = resolved.js ?? (page ? contentOf(page, mode).js : '');
  const chromeIds = resolved.bare
    ? [null, null]
    : [page?.show_header === false ? null : site.header_fragment_id, page?.show_footer === false ? null : site.footer_fragment_id];
  const { fragments, byKey } = await loadComponents(site, resolved, mode, chromeIds);
  const byId = new Map(fragments.map((f) => [String(f._id), f]));

  let body = resolved.template;
  if (resolved.entry) body = bindEntry(body, toRenderEntry(resolved.entry));
  if (resolved.entries) body = renderLists(body, resolved.entries.map(toRenderEntry), resolved.collectionBase ?? '');
  const main = expandFragments(body, byKey);

  const chrome = chromeIds.map((id) => (id ? byId.get(String(id)) : undefined));
  // The header and footer are components too: scoped like any other, inside their own wrapper.
  const [header, footer] = chrome.map((f) =>
    f ? expandFragments(`<cms-fragment data-key="${f.key}"></cms-fragment>`, new Map([...byKey, [f.key, contentOf(f, mode)]])) : null
  );

  return {
    html:
      (header ? `<header data-cms-chrome="header">${header.html}</header>` : '') +
      `<main id="main" data-cms-page>${main.html}</main>` +
      (footer ? `<footer data-cms-chrome="footer">${footer.html}</footer>` : ''),
    // The page's own CSS is global (SCSS, compiled); each component's arrives compiled and scoped.
    css: [header?.css, compileScssOrRaw(ownCss), main.css, footer?.css, compileScssOrRaw(page?.custom_css ?? '')].filter(Boolean).join('\n'),
    js: [ownJs, header?.js, main.js, footer?.js].filter(Boolean).join('\n'),
  };
}

function siteOut(site: ICmsSite) {
  const pub = toSite(site);
  return {
    key: pub.key,
    name: pub.name,
    legacy_site: pub.legacy_site,
    design: { ...pub.design, base_css: compileScssOrRaw(pub.design.base_css) },
    head_html: pub.head_html,
    body_end_html: pub.body_end_html,
    // Every site stylesheet is SCSS; the renderer receives plain CSS.
    custom_css: compileScssOrRaw(pub.custom_css),
    custom_js: pub.custom_js,
    favicon_url: pub.favicon_url,
  };
}

const NOTHING = { status: 404, site: null, title: '', html: '', css: '', seo: seoOf(null), head_html: '', custom_js: '', pagination: null };

async function respond(site: ICmsSite, resolved: Resolved, mode: Mode) {
  const { html, css, js } = await compose(site, resolved, mode);
  return {
    status: resolved.status,
    site: siteOut(site),
    title: resolved.title,
    html,
    css,
    seo: resolved.seo,
    head_html: resolved.page?.head_html ?? '',
    // The page's custom script, then its own and its components' (each scoped to its component).
    custom_js: [resolved.page?.custom_js ?? '', js].filter(Boolean).join('\n'),
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

  /**
   * A page exactly as it would render: its draft (with its fragments' drafts),
   * or — given `version` — that published version beside the live fragments.
   */
  async preview(pageId: string, entryId?: string | null, version?: number | null) {
    const page = await CmsPageModel.findById(assertId(pageId, 'page')).exec();
    if (!page) throw notFound('Page');
    const site = await CmsSiteModel.findById(page.site_id).exec();
    if (!site) throw notFound('Site');
    const saved = version ? await CmsVersionModel.findOne({ owner_kind: 'PAGE', owner_id: page._id, version }).exec() : null;
    if (version && !saved) throw notFound('Version');
    const mode: Mode = saved ? 'published' : 'draft';
    const template = saved ? saved.html : contentOf(page, 'draft').html;
    const resolved: Resolved = { page, template, title: page.title, seo: mergeSeo(seoOf(page.seo), site.seo), status: 200 };
    if (saved) {
      resolved.css = joinCss(saved.css, saved.scss);
      resolved.js = saved.js;
    }
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
    return respond(site, resolved, mode);
  },

  /**
   * Public: a site's designed error page for `code` (404, 500, 503), or null
   * when it has none. The renderer keeps the last good copy, so it can still
   * show the 503 page while this API is the thing that is down.
   */
  async errorPage(host: string, code: number) {
    if (!CMS_ERROR_CODES.some((known) => known === code)) return null;
    const site = await CmsSiteModel.findOne({ domains: normaliseHost(host), is_active: true }).exec();
    if (!site) return null;
    const page = await CmsPageModel.findOne({ site_id: site._id, kind: 'PAGE', path: `/${code}`, is_published: true }).exec();
    if (!page) return null;
    const seo = { ...mergeSeo(seoOf(page.seo), site.seo), noindex: true };
    return respond(site, { page, template: page.published.html, title: page.title, seo, status: code }, 'published');
  },

  /**
   * One component on its own, in its site's styles but without the header and
   * footer: its draft (with its nested components' drafts) or one saved version.
   */
  async previewComponent(fragmentId: string, version?: number | null) {
    const fragment = await CmsFragmentModel.findById(assertId(fragmentId, 'component')).exec();
    if (!fragment) throw notFound('Component');
    const site = await CmsSiteModel.findById(fragment.site_id).exec();
    if (!site) throw notFound('Site');
    const saved = version ? await CmsVersionModel.findOne({ owner_kind: 'FRAGMENT', owner_id: fragment._id, version }).exec() : null;
    if (version && !saved) throw notFound('Version');
    const content: ComposedPart = saved ? { html: saved.html, css: joinCss(saved.css, saved.scss), js: saved.js } : contentOf(fragment, 'draft');
    const resolved: Resolved = {
      page: null,
      template: `<cms-fragment data-key="${fragment.key}"></cms-fragment>`,
      overrides: new Map([[fragment.key, content]]),
      bare: true,
      title: fragment.name,
      seo: { ...mergeSeo(seoOf(null), site.seo), noindex: true },
      status: 200,
    };
    return respond(site, resolved, saved ? 'published' : 'draft');
  },

  /** Public: every indexable live address of a site. */
  async sitemap(host: string) {
    const site = await CmsSiteModel.findOne({ domains: normaliseHost(host), is_active: true }).exec();
    if (!site) return [];
    const [pages, entries] = await Promise.all([
      CmsPageModel.find({ site_id: site._id, kind: 'PAGE', is_published: true, 'seo.noindex': { $ne: true }, path: { $nin: CMS_ERROR_PATHS } })
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
