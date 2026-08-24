import type { NestedCatalogue, Translator } from '@duncit/i18n';
import {
  fetchSiteLocales,
  getSiteTranslator,
  WEBSITE_FALLBACK as SHARED_FALLBACK,
  type SiteLocale,
} from '@duncit/brand/site-i18n';
import { urlConfigs } from '../config/url-configs';

/**
 * Website localization — the SAME @duncit/i18n parser, the same admin data and
 * the same key structure as the apps and portals (CLAUDE.md rule 38). There is
 * no website-only localization.
 *
 * The fetching itself lives in @duncit/brand, so all four marketing sites share
 * one implementation (rule 40); this module only pins it to this site's API URL.
 */

/** The website's LOCAL FALLBACK bundle — held in @duncit/i18n with every other
 * surface's, and baked into this static build. Add a key to the shared bundle
 * AND in Admin > Localization > Translations before using it. */
export const WEBSITE_FALLBACK: NestedCatalogue = SHARED_FALLBACK;

export { WEBSITE_FALLBACK_FLAT } from '@duncit/brand/site-i18n';

export type { SiteLocale };

/** Active locales, for a language menu or per-locale routing. */
export const fetchLocales = (): Promise<SiteLocale[]> => fetchSiteLocales(urlConfigs.graphqlUrl);

/** A translator for one locale, built at build time. */
export const getTranslator = (locale = 'en-IN'): Promise<Translator> =>
  getSiteTranslator(urlConfigs.graphqlUrl, locale);
