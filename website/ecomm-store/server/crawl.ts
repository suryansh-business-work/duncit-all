import { askApi } from './api';
import { SITE_URL } from './config';
import { SEO_SITEMAP, type SitemapKind } from './documents';

const XML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
const xml = (value: string): string => value.replaceAll(/[&<>"']/g, (char) => XML_ESCAPES[char] ?? char);

const PREFIX: Record<SitemapKind, string> = {
  PRODUCT: '/p/',
  CATEGORY: '/c/',
  COLLECTION: '/collections/',
  PET_TYPE: '/pet/',
};

/** The fixed pages worth indexing; everything else comes from the catalogue. */
const FIXED_PATHS = ['/', '/shop', '/brands', '/pages/about', '/pages/shipping', '/pages/returns', '/pages/terms', '/contact'];

const entry = (loc: string, lastmod?: string | null): string => {
  const modified = lastmod ? `<lastmod>${xml(lastmod.slice(0, 10))}</lastmod>` : '';
  return `<url><loc>${xml(loc)}</loc>${modified}</url>`;
};

/** /sitemap.xml — every shelf and product the API lists, as absolute URLs. */
export async function sitemapXml(): Promise<string> {
  const data = await askApi<{ storeSitemap: { kind: SitemapKind; slug: string; updated_at: string | null }[] }>(SEO_SITEMAP);
  const fixed = FIXED_PATHS.map((path) => entry(`${SITE_URL}${path}`));
  const catalogue = (data?.storeSitemap ?? []).map((row) =>
    entry(`${SITE_URL}${PREFIX[row.kind]}${encodeURIComponent(row.slug)}`, row.updated_at),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...fixed,
    ...catalogue,
    '</urlset>',
  ].join('\n');
}

/** /robots.txt — crawl the shop, not the private pages; the sitemap is here. */
export function robotsTxt(): string {
  const sitemap = ['Sitemap:', `${SITE_URL}/sitemap.xml`].join(' ');
  return ['User-agent: *', 'Allow: /', 'Disallow: /account', 'Disallow: /checkout', 'Disallow: /cart', 'Disallow: /track', sitemap, ''].join('\n');
}
