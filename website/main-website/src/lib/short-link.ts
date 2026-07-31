/**
 * Short-link handling for the apex.
 *
 * duncit.com serves this static site, and its nginx answers every unknown path
 * with index.html (deploy/nginx/spa.conf `try_files`). So a marketing link like
 * duncit.com/aB3xY9Zq lands HERE, on the home page, rather than 404ing — and
 * this module is what notices and hands it on to the API resolver, which counts
 * the click and redirects to the tagged destination.
 *
 * The code shape is deliberately narrow: exactly 8 base62 characters with at
 * least one digit AND one uppercase letter. Every real page on this site is a
 * lowercase word (/about, /contact, /careers), so the two sets cannot overlap
 * and a genuine 404 is never mistaken for a short link.
 *
 * TWIN: server/src/modules/crm/marketing/shortLink.codes.ts owns the generator
 * and the same pattern. The server cannot import from @duncit/* by design, so
 * the rule is deliberately stated on both sides — change one, change the other.
 */
export const SHORT_CODE_PATTERN = /^(?=[^/]*\d)(?=[^/]*[A-Z])[A-Za-z\d]{8}$/;

/**
 * The short code a URL path refers to, or null when the path is an ordinary
 * page (or anything else this site should render normally).
 */
export function shortCodeFromPath(pathname: string): string | null {
  const segment = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  return SHORT_CODE_PATTERN.test(segment) ? segment : null;
}

/**
 * Where the browser should go for a code. The API owns the destination — it is
 * never carried in the URL — so this only ever points at our own resolver.
 * Any query string the visitor arrived with is preserved.
 */
export function shortLinkResolverUrl(serverUrl: string, code: string, search = ''): string {
  return `${serverUrl.replace(/\/+$/, '')}/r/${code}${search}`;
}
