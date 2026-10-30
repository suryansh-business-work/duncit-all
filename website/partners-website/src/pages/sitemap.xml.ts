import type { APIRoute } from 'astro';
import { buildSitemapXml, routesFromPageFiles, SITEMAP_HEADERS } from '@duncit/brand/seo';
import { urlConfigs } from '../config/url-configs';

/** Every static page, exactly as it names itself canonical. */
export const GET: APIRoute = () => {
  const origin = urlConfigs.siteUrl.replace(/\/+$/, '');
  const pages = routesFromPageFiles(Object.keys(import.meta.glob('./**/*.astro')));
  return new Response(buildSitemapXml(pages.map((path) => ({ loc: `${origin}${path}` }))), {
    headers: SITEMAP_HEADERS,
  });
};
