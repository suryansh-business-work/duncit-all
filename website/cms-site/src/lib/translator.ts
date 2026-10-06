import { getSiteTranslator, siteT, type SiteTranslate } from '@duncit/brand/site-i18n';
import { graphqlUrl } from './cms-api';

/**
 * The renderer's own words (pagination, the plain 404) come from server
 * localization like every other site's, with the bundled catalogue behind it.
 * The other sites translate once at build time; this one renders per request,
 * so the translator is kept for a few minutes instead of fetched per page.
 */
const TTL_MS = 5 * 60 * 1000;

export const SITE_LOCALE = 'en-IN';

let cached: { t: SiteTranslate; expires: number } | null = null;
let loading: Promise<SiteTranslate> | null = null;

async function load(): Promise<SiteTranslate> {
  try {
    const translator = await getSiteTranslator(graphqlUrl(), SITE_LOCALE);
    cached = { t: translator.t, expires: Date.now() + TTL_MS };
    return translator.t;
  } catch {
    // The bundled catalogue still names every key — never render blank.
    return siteT;
  } finally {
    loading = null;
  }
}

export async function translator(): Promise<SiteTranslate> {
  if (cached && cached.expires > Date.now()) return cached.t;
  loading ??= load();
  return loading;
}
