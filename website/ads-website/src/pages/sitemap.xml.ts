import type { APIRoute } from 'astro';
import { buildSitemapXml, routesFromPageFiles, SITEMAP_HEADERS } from '@duncit/brand/seo';
import { siteUrls } from '../config/site-config';

/** Every static page, exactly as it names itself canonical. */
export const GET: APIRoute = () => {
  const origin = siteUrls.siteUrl.replace(/\/+$/, '');
  const pages = routesFromPageFiles(Object.keys(import.meta.glob('./**/*.astro')));
  return new Response(buildSitemapXml(pages.map((path) => ({ loc: `${origin}${path}` }))), {
    headers: SITEMAP_HEADERS,
  });
};
