import type { APIRoute } from 'astro';
import { buildSitemapXml, routesFromPageFiles, SITEMAP_HEADERS } from '@duncit/brand/seo';
import { urlConfigs } from '../config/url-configs';
import { isListableSolution, solutionPath } from '@duncit/utils';
import { fetchBlogPosts, fetchPolicies, fetchSolutions } from '../lib/site-data';
import { policyPagePath } from '../lib/policy-page';
import { blogPostPath } from '../lib/blog-path';

/**
 * Every indexable address, each exactly as its page names itself canonical:
 * the static pages, each live policy, each published blog post and each
 * Solutions offering. `/policy` and `/venue-kit` are old aliases (redirects)
 * and `/blog/post/` is the empty post shell.
 */
export const GET: APIRoute = async () => {
  const origin = urlConfigs.siteUrl.replace(/\/+$/, '');
  const pages = routesFromPageFiles(Object.keys(import.meta.glob('./**/*.astro')), ['/policy/', '/blog/post/', '/venue-kit/']);
  const [policies, posts, solutions] = await Promise.all([fetchPolicies(), fetchBlogPosts(), fetchSolutions()]);
  const entries = [
    ...pages.map((path) => ({ loc: `${origin}${path}` })),
    ...policies.map((policy) => ({ loc: `${origin}${policyPagePath(policy.slug)}` })),
    ...posts.map((post) => ({
      loc: `${origin}${blogPostPath(post.slug)}`,
      lastmod: post.published_at,
    })),
    ...solutions.filter(isListableSolution).map((item) => ({ loc: `${origin}${solutionPath(item)}` })),
  ];
  return new Response(buildSitemapXml(entries), { headers: SITEMAP_HEADERS });
};
