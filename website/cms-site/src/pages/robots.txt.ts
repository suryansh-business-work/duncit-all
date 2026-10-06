import type { APIRoute } from 'astro';
import { requestHost } from '../lib/cms-api';

/** Open to crawlers, pointing them at this host's own sitemap. */
export const GET: APIRoute = ({ request, url }) => {
  const sitemap = `${url.protocol}//${requestHost(request)}/sitemap.xml`;
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
};
