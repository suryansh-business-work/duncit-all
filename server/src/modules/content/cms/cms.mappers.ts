import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { ICmsSite } from './cmsSite.model';
import type { ICmsPage } from './cmsPage.model';
import type { ICmsFragment } from './cmsFragment.model';
import type { ICmsEntry } from './cmsEntry.model';
import type { ICmsVersion } from './cmsVersion.model';
import type { CmsDraft, CmsPublished, CmsSeo } from './cmsContent.schema-parts';
import { DEFAULT_COLLECTION_PATHS, type CmsCollection } from './cms.constants';

export const iso = (value?: Date | null) => value?.toISOString?.() ?? null;

/** A Mongo id as the API's string. */
export const idOf = (value: unknown): string => (value instanceof Types.ObjectId ? value.toHexString() : String(value));

export const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
export const notFound = (what: string) => new GraphQLError(`${what} not found`, { extensions: { code: 'NOT_FOUND' } });
export const conflict = (message: string) => new GraphQLError(message, { extensions: { code: 'CONFLICT' } });

/** Rejects anything that is not a Mongo id, before it reaches a query. */
export function assertId(id: string, what: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw badInput(`Invalid ${what} id`);
  return new Types.ObjectId(id);
}

/** Mongo duplicate-key errors, turned into a message a person can act on. */
export function rethrowDuplicate(error: unknown, message: string): never {
  if ((error as { code?: number })?.code === 11000) throw conflict(message);
  throw error;
}

export const seoOf = (seo?: Partial<CmsSeo> | null): CmsSeo => ({
  title: seo?.title ?? '',
  description: seo?.description ?? '',
  og_image_url: seo?.og_image_url ?? '',
  canonical_url: seo?.canonical_url ?? '',
  noindex: seo?.noindex ?? false,
});

const draftOf = (draft?: Partial<CmsDraft> | null) => ({
  project: draft?.project ?? '',
  html: draft?.html ?? '',
  css: draft?.css ?? '',
});

const publishedOf = (published?: Partial<CmsPublished> | null) => ({
  html: published?.html ?? '',
  css: published?.css ?? '',
  version: published?.version ?? 0,
  published_at: iso(published?.published_at),
  published_by: published?.published_by ?? '',
});

/** True when the draft would change what is live. */
export const hasUnpublishedChanges = (doc: { draft?: Partial<CmsDraft>; published?: Partial<CmsPublished>; is_published?: boolean }) =>
  !doc.is_published || (doc.draft?.html ?? '') !== (doc.published?.html ?? '') || (doc.draft?.css ?? '') !== (doc.published?.css ?? '');

/** A site's path for each collection — its override, else the default. */
export function collectionPathsOf(site: Pick<ICmsSite, 'collection_paths'>): Record<CmsCollection, string> {
  const paths = { ...DEFAULT_COLLECTION_PATHS };
  for (const entry of site.collection_paths ?? []) paths[entry.collection] = entry.path;
  return paths;
}

export const toSite = (site: ICmsSite, pageCount = 0) => ({
  id: idOf(site._id),
  key: site.key,
  name: site.name,
  domains: site.domains ?? [],
  legacy_site: site.legacy_site ?? null,
  is_active: site.is_active ?? true,
  design: {
    tokens: (site.design?.tokens ?? []).map((t) => ({ name: t.name, value: t.value, group: t.group ?? 'color' })),
    fonts: (site.design?.fonts ?? []).map((f) => ({
      family: f.family,
      source: f.source,
      weights: f.weights ?? [400],
      italic: f.italic ?? false,
      role: f.role ?? 'NONE',
      variable: f.variable ?? '',
      fallback: f.fallback ?? 'sans-serif',
      files: (f.files ?? []).map((file) => ({ weight: file.weight, style: file.style ?? 'normal', url: file.url })),
    })),
    font_urls: site.design?.font_urls ?? [],
    base_css: site.design?.base_css ?? '',
  },
  head_html: site.head_html ?? '',
  body_end_html: site.body_end_html ?? '',
  custom_css: site.custom_css ?? '',
  custom_js: site.custom_js ?? '',
  favicon_url: site.favicon_url ?? '',
  seo: seoOf({ ...site.seo, canonical_url: '', noindex: false }),
  header_fragment_id: site.header_fragment_id ? idOf(site.header_fragment_id) : null,
  footer_fragment_id: site.footer_fragment_id ? idOf(site.footer_fragment_id) : null,
  collections: site.collections ?? [],
  collection_paths: Object.entries(collectionPathsOf(site)).map(([collection, path]) => ({ collection, path })),
  page_count: pageCount,
  created_at: iso(site.created_at) ?? '',
  updated_at: iso(site.updated_at) ?? '',
});

export const toPage = (page: ICmsPage) => ({
  id: idOf(page._id),
  site_id: idOf(page.site_id),
  kind: page.kind ?? 'PAGE',
  collection_type: page.collection_type ?? null,
  title: page.title,
  path: page.path ?? '',
  is_published: page.is_published ?? false,
  has_unpublished_changes: hasUnpublishedChanges(page),
  seo: seoOf(page.seo),
  show_header: page.show_header ?? true,
  show_footer: page.show_footer ?? true,
  head_html: page.head_html ?? '',
  custom_css: page.custom_css ?? '',
  custom_js: page.custom_js ?? '',
  sort_order: page.sort_order ?? 0,
  draft: draftOf(page.draft),
  published: publishedOf(page.published),
  updated_by: page.updated_by ?? '',
  created_at: iso(page.created_at) ?? '',
  updated_at: iso(page.updated_at) ?? '',
});

export const toFragment = (fragment: ICmsFragment) => ({
  id: idOf(fragment._id),
  site_id: idOf(fragment.site_id),
  key: fragment.key,
  name: fragment.name,
  kind: fragment.kind ?? 'SECTION',
  is_published: fragment.is_published ?? false,
  has_unpublished_changes: hasUnpublishedChanges(fragment),
  draft: draftOf(fragment.draft),
  published: publishedOf(fragment.published),
  updated_by: fragment.updated_by ?? '',
  created_at: iso(fragment.created_at) ?? '',
  updated_at: iso(fragment.updated_at) ?? '',
});

export const toVersion = (version: ICmsVersion) => ({
  id: idOf(version._id),
  owner_kind: version.owner_kind,
  owner_id: idOf(version.owner_id),
  version: version.version,
  published_by: version.published_by ?? '',
  created_at: iso(version.created_at) ?? '',
});

export const toEntry = (entry: ICmsEntry) => ({
  id: idOf(entry._id),
  site_id: idOf(entry.site_id),
  collection_type: entry.collection_type,
  title: entry.title,
  slug: entry.slug,
  summary: entry.summary ?? '',
  body_html: entry.body_html ?? '',
  cover_image_url: entry.cover_image_url ?? '',
  category: entry.category ?? '',
  tags: entry.tags ?? [],
  author_name: entry.author_name ?? '',
  fields: (entry.fields ?? []).map((f) => ({ key: f.key, value: f.value ?? '' })),
  seo: seoOf(entry.seo),
  is_published: entry.is_published ?? false,
  published_at: iso(entry.published_at),
  sort_order: entry.sort_order ?? 0,
  updated_by: entry.updated_by ?? '',
  created_at: iso(entry.created_at) ?? '',
  updated_at: iso(entry.updated_at) ?? '',
});
