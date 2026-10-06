/**
 * The website CMS: sites, GrapesJS pages, reusable fragments and per-site
 * collections (Blog, Careers, Newsletter issues, Case studies, Newsroom),
 * rendered at request time by `website/cms-site`.
 *
 * Every model is prefixed `Cms` on purpose: `crm/websitePage` already owns the
 * `WebsitePage` name (pages scraped from CRM lead websites).
 */

/** Who may manage a site. Custom JS/CSS is part of the job, so this is also the
 * set that can put script on a public domain — keep it narrow. */
export const CMS_ROLES = ['SUPER_ADMIN', 'WEBSITE_MANAGER'];

export const CMS_COLLECTIONS = ['BLOG', 'CAREER', 'NEWSLETTER', 'CASE_STUDY', 'NEWSROOM'] as const;
export type CmsCollection = (typeof CMS_COLLECTIONS)[number];

/** Where each collection lives on a site unless the site overrides it. */
export const DEFAULT_COLLECTION_PATHS: Record<CmsCollection, string> = {
  BLOG: '/blog',
  CAREER: '/careers',
  NEWSLETTER: '/newsletter',
  CASE_STUDY: '/case-studies',
  NEWSROOM: '/newsroom',
};

export const CMS_PAGE_KINDS = ['PAGE', 'COLLECTION_LIST', 'COLLECTION_DETAIL'] as const;
export type CmsPageKind = (typeof CMS_PAGE_KINDS)[number];

export const CMS_FRAGMENT_KINDS = ['HEADER', 'FOOTER', 'SECTION'] as const;
export type CmsFragmentKind = (typeof CMS_FRAGMENT_KINDS)[number];

/** The existing marketing-site enum (nav, reels, GA) a CMS site can map onto,
 * so the reel slider and nav blocks keep reading what the portal manages. */
export const CMS_LEGACY_SITES = ['MAIN', 'PARTNERS', 'ADS', 'EARNWITH'] as const;

/** Published versions kept per page/fragment for rollback. */
export const CMS_VERSIONS_KEPT = 30;

/** Entries a collection list page shows per page of results. */
export const CMS_LIST_PAGE_SIZE = 12;

/**
 * Error pages a site designs as ordinary pages at /404, /500 and /503: not found,
 * something broke, and down for maintenance / API unreachable. Served with their
 * own status, never in the sitemap.
 */
export const CMS_ERROR_CODES = [404, 500, 503] as const;
export const CMS_ERROR_PATHS = CMS_ERROR_CODES.map((code) => `/${code}`);
export const errorCodeOf = (path: string): number | null => CMS_ERROR_CODES.find((code) => path === `/${code}`) ?? null;

// The three address shapes below MIRROR `@duncit/regex` (`SITE_PATH`,
// `URL_SLUG`, `isHostname`) — `server/src` imports no `@duncit/*` package
// (rule 40), and the portal validates with the package copies first.

/** A path a page can be served at: `/`, `/about`, `/safety/tools`. */
export const CMS_PATH_PATTERN = /^\/(?:[a-z0-9]+(?:[-/][a-z0-9]+)*)?$/;

/** A design token's name: `--color-primary` (mirrors `CSS_VARIABLE`). */
export const CMS_CSS_VARIABLE = /^--[a-z0-9-]{1,60}$/;

/** A font family name as css and Google's css2 URL can carry it: `Plus Jakarta Sans`. */
export const CMS_FONT_FAMILY = /^[A-Za-z0-9][A-Za-z0-9 -]{0,79}$/;

/** A post or page slug: `summer-meetups-2026`. */
export const CMS_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A <meta> name or property: description, author, og:locale, article:author… The mirror of META_NAME in @duncit/regex, which the portal validates with. */
export const CMS_META_NAME = /^[A-Za-z][\w:.-]{0,79}$/;

const HOSTNAME_LABEL = /^(?!-)[a-z\d-]{1,63}(?<!-)$/i;

/** A hostname a site answers on: `duncit.com`, `main.localhost`. */
export const isCmsDomain = (value: string): boolean => {
  const labels = value.split('.');
  return value.length <= 253 && labels.length >= 2 && labels.every((label) => HOSTNAME_LABEL.test(label));
};
