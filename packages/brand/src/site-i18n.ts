import {
  createTranslator,
  flattenCatalogue,
  GRIEVANCE_BUNDLE,
  WEBSITE_BUNDLE,
  type NestedCatalogue,
  type Translator,
} from '@duncit/i18n';

/**
 * Build-time localization for the Astro marketing sites (CLAUDE.md rule 38).
 *
 * The SAME @duncit/i18n parser, the same admin data and the same key structure
 * as the apps and portals — there is no website-only localization. It lives in
 * @duncit/brand rather than in each site because all four render the same
 * chrome from this package, and four hand-kept copies of a forty-line fetch is
 * exactly the drift rule 40 exists to stop.
 *
 * Copy is resolved at BUILD time: the sites are static, so pages are rendered
 * with the catalogue baked in. Like every other build-time fetch here, an
 * unreachable API degrades to the bundled fallback rather than breaking a
 * deploy — the site simply ships its default language.
 */

/**
 * The websites' LOCAL FALLBACK bundle — held in @duncit/i18n with every other
 * surface's, and baked into each static build.
 *
 * The grievance form renders on the main site as well as in mWeb and native, so
 * its copy is its own namespace rather than a third hand-kept copy. The two
 * namespaces are disjoint (`website` and `grievance`), so a shallow merge is the
 * whole of it.
 */
export const WEBSITE_FALLBACK: NestedCatalogue = { ...WEBSITE_BUNDLE, ...GRIEVANCE_BUNDLE };

export const WEBSITE_FALLBACK_FLAT = flattenCatalogue(WEBSITE_FALLBACK);

async function gqlFetch<T>(
  graphqlUrl: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T | null> {
  try {
    const res = await fetch(graphqlUrl, {
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
export async function fetchSiteLocales(graphqlUrl: string): Promise<SiteLocale[]> {
  const data = await gqlFetch<{ publicLocales: SiteLocale[] }>(
    graphqlUrl,
    `
      query PublicLocales {
        publicLocales { code label english_label is_rtl is_default }
      }
    `,
  );
  return data?.publicLocales ?? [];
}

/**
 * A translator for one locale, built at build time. Server text wins; anything
 * untranslated falls back to the bundled catalogue, then to the key itself — so
 * a page never renders blank.
 */
export async function getSiteTranslator(
  graphqlUrl: string,
  locale = 'en-IN',
): Promise<Translator> {
  const data = await gqlFetch<{ publicTranslations: { key: string; value: string }[] }>(
    graphqlUrl,
    `
      query PublicTranslations($locale: String!) {
        publicTranslations(locale: $locale) { key value }
      }
    `,
    { locale },
  );
  const server: Record<string, string> = {};
  for (const row of data?.publicTranslations ?? []) server[row.key] = row.value;
  return createTranslator({ locale, fallback: WEBSITE_FALLBACK_FLAT, server });
}

/** The `t` a shared Astro component accepts. */
export type SiteTranslate = Translator['t'];

/**
 * A provider-free translator over the bundled catalogue.
 *
 * An Astro component has no context to read from — a site hands its live `t`
 * down as a prop — so this is what a component renders with when a caller has
 * not. It answers from the shipped bundle, so the page reads real copy rather
 * than raw keys. The twin of @duncit/shell's and mWeb's `fallbackT`.
 */
export const siteT: SiteTranslate = createTranslator({
  locale: 'en-IN',
  fallback: WEBSITE_FALLBACK_FLAT,
}).t;
