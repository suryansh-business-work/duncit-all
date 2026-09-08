/**
 * Short-link handling for the apex.
 *
 * duncit.com serves this site, and a marketing link like duncit.com/aB3xY9Zq
 * arrives as an ordinary path on it. The site's HTML server recognises the
 * shape (server/short-link handling in server/main.ts) and answers with a real
 * 302 on to the API resolver, which counts the click and redirects to the
 * tagged destination.
 *
 * It has to be a REDIRECT rather than a page that redirects itself: a
 * link-preview crawler reads the head and leaves without running any script,
 * so the JavaScript hop this used to be made every shared pod, club and
 * profile unfurl as the Duncit home page.
 *
 * The code shape is deliberately narrow: exactly 8 base62 characters with at
 * least one digit AND one uppercase letter. Every real page on this site is a
 * lowercase word (/about, /contact, /careers), so the two sets cannot overlap
 * and a genuine page is never mistaken for a link.
 *
 * TWIN: server/src/modules/crm/marketing/shortLink.codes.ts owns the generator
 * and the same rule. The server cannot import from @duncit/* by design, so the
 * rule is deliberately stated on both sides — change one, change the other.
 */
export const SHORT_CODE_PATTERN = /^(?=[^/]*\d)(?=[^/]*[A-Z])[A-Za-z\d]{8}$/;

/**
 * A path without its leading and trailing slashes, walked rather than matched.
 *
 * `replace(/\/+$/, '')` is the obvious way to write this and the wrong one for
 * the caller that matters: the HTML server hands it the RAW request path, and
 * on a path that is all slashes but for its last character a backtracking
 * engine retries that run from every position — quadratic work whose length an
 * anonymous GET chooses. Walking both ends is one pass, and gives the same
 * answer for every input.
 *
 * It lives beside the pattern because the two are always used together: this
 * is what turns a request path into the thing `SHORT_CODE_PATTERN` tests.
 */
export function trimSlashes(path: string): string {
  let start = 0;
  let end = path.length;
  while (start < end && path[start] === '/') start += 1;
  while (end > start && path[end - 1] === '/') end -= 1;
  return path.slice(start, end);
}
