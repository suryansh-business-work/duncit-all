import {
  createTranslator,
  flattenCatalogue,
  GRIEVANCE_BUNDLE,
  WEBSITE_BUNDLE,
  type NestedCatalogue,
  type Translator,
} from '@duncit/i18n';
import { urlConfigs } from '../config/url-configs';

/**
 * Website localization — the SAME @duncit/i18n parser, the same admin data and
 * the same key structure as the apps and portals (CLAUDE.md rule 38). There is
 * no website-only localization.
 *
 * Copy is resolved at BUILD time: the site is static, so pages are rendered
 * with the catalogue baked in. Like every other build-time fetch here, an
 * unreachable API degrades to the bundled fallback rather than breaking a
 * deploy — the site simply ships its default language.
 */

/** The website's LOCAL FALLBACK bundle — held in @duncit/i18n with every other
 * surface's, and baked into this static build. Add a key to the shared bundle
 * AND in Admin > Localization > Translations before using it. */
// The grievance form renders here as well as in mWeb and native, so its copy is
// its own namespace rather than a third hand-kept copy. The two namespaces are
// disjoint (`website` and `grievance`), so a shallow merge is the whole of it.
export const WEBSITE_FALLBACK: NestedCatalogue = { ...WEBSITE_BUNDLE, ...GRIEVANCE_BUNDLE };

export const WEBSITE_FALLBACK_FLAT = flattenCatalogue(WEBSITE_FALLBACK);

async function gqlFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(urlConfigs.graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.errors?.length) return null;
    return json.data as T;
  } catch {
    return null;
  }
}

export interface SiteLocale {
  code: string;
  label: string;
  english_label: string;
  is_rtl: boolean;
  is_default: boolean;
}

/** Active locales, for a language menu or per-locale routing. */
export async function fetchLocales(): Promise<SiteLocale[]> {
  const data = await gqlFetch<{ publicLocales: SiteLocale[] }>(`
    query PublicLocales {
      publicLocales { code label english_label is_rtl is_default }
    }
  `);
  return data?.publicLocales ?? [];
}

/**
 * A translator for one locale, built at build time. Server text wins; anything
 * untranslated falls back to the bundled bundle, then to the key itself — so a
 * page never renders blank.
 */
export async function getTranslator(locale = 'en-IN'): Promise<Translator> {
  const data = await gqlFetch<{ publicTranslations: { key: string; value: string }[] }>(
    `
      query PublicTranslations($locale: String!) {
        publicTranslations(locale: $locale) { key value }
      }
    `,
    { locale }
  );
  const server: Record<string, string> = {};
  for (const row of data?.publicTranslations ?? []) server[row.key] = row.value;
  return createTranslator({ locale, fallback: WEBSITE_FALLBACK_FLAT, server });
}
