import type { SiteMetaInput } from '@duncit/brand/site-meta';

import { firstFilled } from '../src/lib/text';

import { askApi } from './api';
import { SITE_URL } from './config';
import {
  SEO_CATEGORY,
  SEO_COLLECTION,
  SEO_PET_TYPE,
  SEO_PRODUCT,
  SEO_SETTINGS,
  type SeoProduct,
  type SeoSettings,
  type SeoShelf,
} from './documents';
import { breadcrumbList, productLd, type Crumb } from './structured';

/** What a page's head carries: the social/SEO tags and any structured data. */
export interface PageHead {
  meta: SiteMetaInput;
  structured: unknown[];
}

/** Keep descriptions to what a result snippet shows. */
const clip = (text: string): string => (text.length > 160 ? `${text.slice(0, 157).trimEnd()}...` : text);

async function settings(): Promise<SeoSettings | null> {
  const data = await askApi<{ storeSettings: SeoSettings }>(SEO_SETTINGS);
  return data?.storeSettings ?? null;
}

function baseHead(s: SeoSettings, path: string): PageHead {
  return {
    meta: {
      title: firstFilled(s.seo_title, s.store_name),
      description: clip(firstFilled(s.seo_description, s.tagline)),
      url: `${SITE_URL}${path}`,
      siteName: s.store_name,
      imageUrl: s.og_image_url || null,
    },
    structured: [],
  };
}

async function productHead(s: SeoSettings, slug: string, path: string): Promise<PageHead | null> {
  const data = await askApi<{ storeProduct: SeoProduct | null }>(SEO_PRODUCT, { slug });
  const product = data?.storeProduct;
  if (!product) return null;
  const url = `${SITE_URL}${path}`;
  const description = clip(firstFilled(product.seo_description, product.short_description, product.description, s.seo_description));
  const crumbs: Crumb[] = [
    { name: s.store_name, url: `${SITE_URL}/` },
    ...product.breadcrumbs.map((b) => ({ name: b.name, url: `${SITE_URL}/c/${encodeURIComponent(b.slug)}` })),
    { name: product.title, url },
  ];
  return {
    meta: { title: firstFilled(product.seo_title, product.title), description, url, siteName: s.store_name, imageUrl: product.image_url || null, largeImage: Boolean(product.image_url) },
    structured: [productLd(product, url, description), breadcrumbList(crumbs)],
  };
}

type ShelfKind = 'category' | 'collection' | 'pet';

const SHELF_QUERIES: Record<ShelfKind, { query: string; field: string }> = {
  category: { query: SEO_CATEGORY, field: 'storeCategory' },
  collection: { query: SEO_COLLECTION, field: 'storeCollection' },
  pet: { query: SEO_PET_TYPE, field: 'storePetType' },
};

async function shelfHead(s: SeoSettings, kind: ShelfKind, slug: string, path: string): Promise<PageHead | null> {
  const { query, field } = SHELF_QUERIES[kind];
  const data = await askApi<Record<string, SeoShelf | null>>(query, { slug });
  const shelf = data?.[field];
  if (!shelf) return null;
  const url = `${SITE_URL}${path}`;
  const image = firstFilled(shelf.banner_url, shelf.image_url);
  const crumbs: Crumb[] = [{ name: s.store_name, url: `${SITE_URL}/` }];
  if (shelf.parent) crumbs.push({ name: shelf.parent.name, url: `${SITE_URL}/c/${encodeURIComponent(shelf.parent.slug)}` });
  crumbs.push({ name: shelf.name, url });
  return {
    meta: {
      title: firstFilled(shelf.seo_title, shelf.name),
      description: clip(firstFilled(shelf.seo_description, shelf.description, s.seo_description)),
      url,
      siteName: s.store_name,
      imageUrl: image || null,
      largeImage: Boolean(image),
    },
    structured: [breadcrumbList(crumbs)],
  };
}

const ROUTES: Array<{ pattern: RegExp; kind: ShelfKind | 'product' }> = [
  { pattern: /^\/p\/([^/]+)\/?$/, kind: 'product' },
  { pattern: /^\/c\/([^/]+)\/?$/, kind: 'category' },
  { pattern: /^\/collections\/([^/]+)\/?$/, kind: 'collection' },
  { pattern: /^\/pet\/([^/]+)\/?$/, kind: 'pet' },
];

/** The head for a path, or null when the API could not be asked (serve the plain page). */
export async function headFor(path: string): Promise<PageHead | null> {
  const s = await settings();
  if (!s) return null;
  for (const route of ROUTES) {
    const match = route.pattern.exec(path);
    if (!match) continue;
    const slug = decodeURIComponent(match[1] ?? '');
    const head = route.kind === 'product' ? await productHead(s, slug, path) : await shelfHead(s, route.kind, slug, path);
    return head ?? baseHead(s, path);
  }
  return baseHead(s, path);
}
