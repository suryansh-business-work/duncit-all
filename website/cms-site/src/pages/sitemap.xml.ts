import type { APIRoute } from 'astro';
import { CmsUnavailableError, requestHost, sitemapUrls } from '../lib/cms-api';

const escapeXml = (value: string) =>
  value.replaceAll(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] ?? char);

/** Every indexable published address of the site this hostname belongs to. */
export const GET: APIRoute = async ({ request, url }) => {
  const host = requestHost(request);
  try {
    const entries = await sitemapUrls(host);
    const origin = `${url.protocol}//${host}`;
    const body = entries
      .map((entry) => {
        const lastmod = entry.updated_at ? `<lastmod>${escapeXml(entry.updated_at)}</lastmod>` : '';
        return `<url><loc>${escapeXml(origin + entry.path)}</loc>${lastmod}</url>`;
      })
      .join('');
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`, {
      headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300' },
    });
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;
    return new Response('', { status: 503, headers: { 'retry-after': '60' } });
  }
};
