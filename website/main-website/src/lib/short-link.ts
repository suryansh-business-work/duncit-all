/**
 * Short-link handling for the apex.
 *
 * duncit.com serves this static site, and its nginx answers every unknown path
 * with index.html (deploy/nginx/spa.conf `try_files`). So a marketing link like
 * duncit.com/aB3xY9Zq lands HERE, on the home page, rather than 404ing — and
 * the inline script in Layout.astro is what notices and hands it to the API
 * resolver, which counts the click and redirects to the tagged destination.
 *
 * The code shape is deliberately narrow: exactly 8 base62 characters with at
 * least one digit AND one uppercase letter. Every real page on this site is a
 * lowercase word (/about, /contact, /careers), so the two sets cannot overlap
 * and a genuine 404 is never mistaken for a short link.
 *
 * This pattern is the ONLY thing exported, because the redirect has to run
 * before paint and so lives in an `is:inline` script that cannot import a
 * module. It is handed to that script through `define:vars`, which keeps one
 * definition rather than two that could drift.
 *
 * TWIN: server/src/modules/crm/marketing/shortLink.codes.ts owns the generator
 * and the same rule. The server cannot import from @duncit/* by design, so the
 * rule is deliberately stated on both sides — change one, change the other.
 */
export const SHORT_CODE_PATTERN = /^(?=[^/]*\d)(?=[^/]*[A-Z])[A-Za-z\d]{8}$/;
