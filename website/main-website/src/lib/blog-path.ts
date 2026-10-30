/**
 * Addresses of a blog post: /blog/<slug>.
 *
 * Every post is drawn by one built page (pages/blog/post.astro), which the
 * HTML server (server/main.ts) serves at the post's own address with that
 * post's card. Posts used to live at /blog/post?slug=…; those links — already
 * shared and printed — are answered with a permanent redirect here.
 */

/** The built page every post is drawn by. Its own address is never a post. */
export const BLOG_POST_SHELL = '/blog/post';

/** `/blog/<slug>`, optionally with a trailing slash. */
const BLOG_POST_PATTERN = /^\/blog\/([^/]+)\/?$/;

export const blogPostPath = (slug: string): string => `/blog/${encodeURIComponent(slug)}`;

/** True for the shell's own address, with or without the trailing slash. */
export const isBlogPostShell = (pathname: string): boolean => pathname.replace(/\/+$/, '') === BLOG_POST_SHELL;

/** The post a /blog/<slug> address names; '' for any other address (including the shell). */
export function blogSlugFromPath(pathname: string): string {
  if (isBlogPostShell(pathname)) return '';
  const raw = BLOG_POST_PATTERN.exec(pathname)?.[1];
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return '';
  }
}

/** The post on screen: from the address, else from the old `?slug=` query. */
export const blogSlugFrom = (pathname: string, search: string): string =>
  blogSlugFromPath(pathname) || (new URLSearchParams(search).get('slug') ?? '');
