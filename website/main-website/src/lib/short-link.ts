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
