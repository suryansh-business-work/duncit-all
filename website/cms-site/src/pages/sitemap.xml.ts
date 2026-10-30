import type { APIRoute } from 'astro';
import { buildSitemapXml, SITEMAP_HEADERS } from '@duncit/brand/seo';
import { CmsUnavailableError, requestHost, sitemapUrls } from '../lib/cms-api';

/** Every indexable published address of the site this hostname belongs to. */
export const GET: APIRoute = async ({ request, url }) => {
  const host = requestHost(request);
  try {
    const entries = await sitemapUrls(host);
    const origin = `${url.protocol}//${host}`;
    const xml = buildSitemapXml(entries.map((entry) => ({ loc: origin + entry.path, lastmod: entry.updated_at })));
    return new Response(xml, { headers: { ...SITEMAP_HEADERS, 'cache-control': 'public, max-age=300' } });
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;
    return new Response('', { status: 503, headers: { 'retry-after': '60' } });
  }
};
