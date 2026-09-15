/**
 * Addresses of the single-policy page, /policy/<slug>.
 *
 * A page per policy is built from the Legal portal's list, but a policy can be
 * published, renamed or retired long after that build. The HTML server
 * (server/main.ts) therefore answers every /policy/<slug> against the LIVE
 * policy and, for one published since the build, serves the reader page below
 * — a copy of the page with no policy baked in, which loads its text by the
 * slug in the address like every other policy page does.
 */

/** `/policy/<slug>`, optionally with a trailing slash. The slug rule is the
 * server's own (policy.service SLUG_RE): lowercase letters, digits, dashes. */
export const POLICY_PAGE_PATTERN = /^\/policy\/([a-z\d]+(?:-[a-z\d]+)*)\/?$/;

/** The reader's slug. The underscore can never be a real policy's slug, so it
 * can never shadow one. */
export const POLICY_READER_SLUG = '_reader';

export const POLICY_READER_PATH = `/policy/${POLICY_READER_SLUG}`;

export const policyPagePath = (slug: string): string => `/policy/${encodeURIComponent(slug)}`;
