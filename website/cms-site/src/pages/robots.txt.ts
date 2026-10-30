import type { APIRoute } from 'astro';
import { buildRobotsTxt, ROBOTS_HEADERS } from '@duncit/brand/seo';
import { requestHost } from '../lib/cms-api';

/** Open to crawlers, pointing them at this host's own sitemap. */
export const GET: APIRoute = ({ request, url }) =>
  new Response(buildRobotsTxt(`${url.protocol}//${requestHost(request)}`), {
    headers: { ...ROBOTS_HEADERS, 'cache-control': 'public, max-age=3600' },
  });
