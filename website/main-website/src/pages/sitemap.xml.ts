import type { APIRoute } from 'astro';
import { buildSitemapXml, routesFromPageFiles, SITEMAP_HEADERS } from '@duncit/brand/seo';
import { urlConfigs } from '../config/url-configs';
import { fetchBlogPosts, fetchPolicies } from '../lib/site-data';
import { policyPagePath } from '../lib/policy-page';

/**
 * Every indexable address, each exactly as its page names itself canonical:
 * the static pages, each live policy and each published blog post. `/policy`
 * is the old alias (a redirect) and `/blog/post/` is the empty post shell.
 */
export const GET: APIRoute = async () => {
  const origin = urlConfigs.siteUrl.replace(/\/+$/, '');
  const pages = routesFromPageFiles(Object.keys(import.meta.glob('./**/*.astro')), ['/policy/', '/blog/post/']);
  const [policies, posts] = await Promise.all([fetchPolicies(), fetchBlogPosts()]);
  const entries = [
    ...pages.map((path) => ({ loc: `${origin}${path}` })),
    ...policies.map((policy) => ({ loc: `${origin}${policyPagePath(policy.slug)}` })),
    ...posts.map((post) => ({
      loc: `${origin}/blog/post?slug=${encodeURIComponent(post.slug)}`,
      lastmod: post.published_at,
    })),
  ];
  return new Response(buildSitemapXml(entries), { headers: SITEMAP_HEADERS });
};
