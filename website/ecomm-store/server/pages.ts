import type { SiteMetaInput } from '@duncit/brand/site-meta';
import { ECOMM_STORE_BUNDLE, flattenCatalogue } from '@duncit/i18n';

import { firstFilled } from '../src/lib/text';

import { askApi } from './api';
import { SITE_URL } from './config';
import {
  SEO_BRANDS,
  SEO_CATEGORY,
  SEO_COLLECTION,
  SEO_PAGE,
  SEO_PET_TYPE,
  SEO_PRODUCT,
  SEO_SETTINGS,
  type SeoBrand,
  type SeoPage,
  type SeoProduct,
  type SeoSettings,
  type SeoShelf,
} from './documents';
import { breadcrumbList, faqPageLd, productLd, type Crumb } from './structured';

/** What a page's head carries: the social/SEO tags, any structured data, and the favicon. */
export interface PageHead {
  meta: SiteMetaInput;
  structured: unknown[];
  /** The occasion's favicon while one is on, else the store's; '' when it has none. */
  favicon: string;
}

/** The storefront's own titles, read from the copy it ships so the head says what the page says. */
const COPY = flattenCatalogue(ECOMM_STORE_BUNDLE);
const copy = (key: string): string => COPY[key] ?? '';

/** Fixed pages whose title is the SPA's own heading. */
const FIXED_TITLES: Record<string, string> = {
  '/brands': 'ecommStore.menu.brands',
  '/shop': 'ecommStore.shelf.shopTitle',
  '/search': 'ecommStore.shelf.shopTitle',
  '/contact': 'ecommStore.contact.title',
  '/track': 'ecommStore.track.title',
  '/cart': 'ecommStore.cart.title',
  '/account': 'ecommStore.account.title',
  '/autoship': 'ecommStore.autoship.title',
};

/** The four pages every store has, whose copy lives in settings rather than a page record. */
const POLICY_TITLES: Record<string, string> = {
  shipping: 'ecommStore.pages.shipping',
  returns: 'ecommStore.pages.returns',
  terms: 'ecommStore.pages.terms',
  about: 'ecommStore.pages.about',
};

const lookup = (table: Record<string, string>, key: string): string => (Object.hasOwn(table, key) ? table[key] : '');

/** Keep descriptions to what a result snippet shows. */
const clip = (text: string): string => (text.length > 160 ? `${text.slice(0, 157).trimEnd()}...` : text);

const faviconOf = (s: SeoSettings): string => s.active_occasion?.favicon_url || s.favicon_url;

async function settings(): Promise<SeoSettings | null> {
  const data = await askApi<{ storeSettings: SeoSettings }>(SEO_SETTINGS);
  return data?.storeSettings ?? null;
}

function baseHead(s: SeoSettings, path: string, title = ''): PageHead {
  return {
    meta: {
      title: firstFilled(title, s.seo_title, s.store_name),
      description: clip(firstFilled(s.seo_description, s.tagline)),
      url: `${SITE_URL}${path}`,
      siteName: s.store_name,
      imageUrl: s.og_image_url || null,
    },
    structured: [],
    favicon: faviconOf(s),
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
  const structured: unknown[] = [productLd(product, url, description), breadcrumbList(crumbs)];
  if (product.faqs.length > 0) structured.push(faqPageLd(product.faqs));
  return {
    meta: { title: firstFilled(product.seo_title, product.title), description, url, siteName: s.store_name, imageUrl: product.image_url || null, largeImage: Boolean(product.image_url) },
    structured,
    favicon: faviconOf(s),
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
    favicon: faviconOf(s),
  };
}

async function brandHead(s: SeoSettings, slug: string, path: string): Promise<PageHead | null> {
  const data = await askApi<{ storeBrands: SeoBrand[] }>(SEO_BRANDS);
  const brand = data?.storeBrands.find((b) => b.slug === slug);
  if (!brand) return null;
  const url = `${SITE_URL}${path}`;
  const crumbs: Crumb[] = [
    { name: s.store_name, url: `${SITE_URL}/` },
    { name: copy('ecommStore.menu.brands'), url: `${SITE_URL}/brands` },
    { name: brand.name, url },
  ];
  return {
    meta: { title: brand.name, description: clip(firstFilled(brand.tagline, s.seo_description)), url, siteName: s.store_name, imageUrl: brand.logo_url || null },
    structured: [breadcrumbList(crumbs)],
    favicon: faviconOf(s),
  };
}

async function pageHead(s: SeoSettings, slug: string, path: string): Promise<PageHead | null> {
  const policyKey = lookup(POLICY_TITLES, slug);
  if (policyKey) return baseHead(s, path, copy(policyKey));
  const data = await askApi<{ storePage: SeoPage | null }>(SEO_PAGE, { slug });
  const page = data?.storePage;
  if (!page) return null;
  return {
    meta: {
      title: firstFilled(page.seo_title, page.title),
      description: clip(firstFilled(page.seo_description, s.seo_description)),
      url: `${SITE_URL}${path}`,
      siteName: s.store_name,
      imageUrl: s.og_image_url || null,
    },
    structured: [],
    favicon: faviconOf(s),
  };
}

type RouteKind = ShelfKind | 'product' | 'brand' | 'page';

const ROUTES: Array<{ pattern: RegExp; kind: RouteKind }> = [
  { pattern: /^\/p\/([^/]+)\/?$/, kind: 'product' },
  { pattern: /^\/c\/([^/]+)\/?$/, kind: 'category' },
  { pattern: /^\/collections\/([^/]+)\/?$/, kind: 'collection' },
  { pattern: /^\/pet\/([^/]+)\/?$/, kind: 'pet' },
  { pattern: /^\/brand\/([^/]+)\/?$/, kind: 'brand' },
  { pattern: /^\/pages\/([^/]+)\/?$/, kind: 'page' },
];

function routedHead(s: SeoSettings, kind: RouteKind, slug: string, path: string): Promise<PageHead | null> {
  if (kind === 'product') return productHead(s, slug, path);
  if (kind === 'brand') return brandHead(s, slug, path);
  if (kind === 'page') return pageHead(s, slug, path);
  return shelfHead(s, kind, slug, path);
}

const withoutTrailingSlash = (path: string): string => (path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path);

/** The head for a path, or null when the API could not be asked (serve the plain page). */
export async function headFor(path: string): Promise<PageHead | null> {
  const s = await settings();
  if (!s) return null;
  const fixedKey = lookup(FIXED_TITLES, withoutTrailingSlash(path));
  if (fixedKey) return baseHead(s, path, copy(fixedKey));
  for (const route of ROUTES) {
    const match = route.pattern.exec(path);
    if (!match) continue;
    const slug = decodeURIComponent(match[1] ?? '');
    return (await routedHead(s, route.kind, slug, path)) ?? baseHead(s, path);
  }
  return baseHead(s, path);
}
