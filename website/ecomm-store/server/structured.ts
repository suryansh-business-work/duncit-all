import { firstFilled } from '../src/lib/text';

import type { SeoProduct } from './documents';

/**
 * schema.org JSON-LD for the pages a search engine can show as rich results:
 * a Product (price, stock, rating) and a BreadcrumbList.
 */
export interface Crumb {
  name: string;
  url: string;
}

const SCHEMA = 'https://schema.org';

export function breadcrumbList(crumbs: Crumb[]) {
  return {
    '@context': SCHEMA,
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

export function productLd(product: SeoProduct, url: string, description: string) {
  const images = [...new Set([product.image_url, ...product.images].filter(Boolean))];
  const variant = product.variants.find((v) => v.id === product.default_variant_id) ?? product.variants[0];
  const ld: Record<string, unknown> = {
    '@context': SCHEMA,
    '@type': 'Product',
    name: product.title,
    image: images,
    description,
    sku: firstFilled(variant?.sku, product.slug),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'INR',
      price: product.price.toFixed(2),
      availability: product.in_stock ? `${SCHEMA}/InStock` : `${SCHEMA}/OutOfStock`,
    },
  };
  if (product.brand_name) ld.brand = { '@type': 'Brand', name: product.brand_name };
  if (product.rating_count > 0) {
    ld.aggregateRating = { '@type': 'AggregateRating', ratingValue: product.rating.toFixed(1), reviewCount: product.rating_count };
  }
  return ld;
}

/** A JSON-LD script tag, with `<` escaped so the data can never close the tag. */
export function jsonLdTag(data: unknown): string {
  const json = JSON.stringify(data).replaceAll('<', String.raw`<`);
  return `<script type="application/ld+json">${json}</script>`;
}
