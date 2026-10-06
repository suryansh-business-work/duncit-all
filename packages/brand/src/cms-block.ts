/**
 * CMS block markers on the shared brand components.
 *
 * Each block's root carries `data-cms-block="<key>"` and `data-cms-props` — the
 * JSON of the props a renderer needs to draw that block again. Functions (the
 * translator) and the environment's `graphqlUrl` are left out: a renderer
 * supplies its own. Astro escapes the attribute value, so the JSON reads back
 * intact with `JSON.parse(el.dataset.cmsProps)`.
 */

/** Every block key, with the component that draws it. */
export const CMS_BLOCKS = {
  newsletter: 'NewsletterSignup.astro',
  'reel-slider': 'ReelSlider.astro',
  'earn-showcase': 'EarnShowcase.astro',
  'app-download': 'AppDownload.astro',
  'social-links': 'SocialLinks.astro',
  'policy-strip': 'PolicyStrip.astro',
} as const;

export type CmsBlockKey = keyof typeof CMS_BLOCKS;

/** Props never serialised: the renderer brings its own. */
const OMITTED = new Set(['t', 'graphqlUrl']);

/** Astro hands a parent's style scope down as a `data-astro-cid-*` prop; it is
 * build output, not something the page chose. */
const ASTRO_PREFIX = 'data-astro-';

const keep = ([key, value]: [string, unknown]): boolean =>
  !OMITTED.has(key) && !key.startsWith(ASTRO_PREFIX) && typeof value !== 'function';

/** The `data-cms-props` JSON for a component's props. */
export function cmsBlockProps(props: object): string {
  const kept = Object.entries(props).filter(keep);
  return JSON.stringify(Object.fromEntries(kept));
}
