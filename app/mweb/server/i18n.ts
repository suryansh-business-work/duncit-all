import {
  createTranslator,
  flattenCatalogue,
  MWEB_BUNDLE,
  type FlatCatalogue,
  type Translator,
} from '@duncit/i18n';
import { cachedGql } from './graphql-client';

/**
 * The translator behind every `mweb.meta.*` string this server injects.
 *
 * Same layering as the SPA (rule 38): the compiled-in MWEB_BUNDLE renders even
 * when the API is unreachable, and the platform's default-locale entries from
 * Admin > Localization layer over it so edited copy reaches crawlers too.
 * Crawlers carry no user locale, so the platform default is the right voice.
 */
const FALLBACK_FLAT = flattenCatalogue(MWEB_BUNDLE);

const TRANSLATOR_TTL_MS = 5 * 60 * 1000;

interface PublicLocale {
  code: string;
  is_default: boolean;
  is_active: boolean;
}

interface LocalesResult {
  publicLocales: PublicLocale[];
}

interface TranslationsResult {
  publicTranslations: { key: string; value: string }[];
}

const LOCALES_QUERY = /* GraphQL */ `
  query MetaServerLocales {
    publicLocales {
      code
      is_default
      is_active
    }
  }
`;

const TRANSLATIONS_QUERY = /* GraphQL */ `
  query MetaServerTranslations($locale: String!) {
    publicTranslations(locale: $locale) {
      key
      value
    }
  }
`;

let cached: { translator: Translator; expires: number } | null = null;

async function serverCatalogue(): Promise<{ locale: string; entries: FlatCatalogue | null }> {
  const locales = await cachedGql<LocalesResult>(LOCALES_QUERY, {}, TRANSLATOR_TTL_MS);
  const active = (locales?.publicLocales ?? []).filter((l) => l.is_active);
  const defaultLocale = active.find((l) => l.is_default) ?? active[0];
  if (!defaultLocale) return { locale: 'en-IN', entries: null };
  const translations = await cachedGql<TranslationsResult>(
    TRANSLATIONS_QUERY,
    { locale: defaultLocale.code },
    TRANSLATOR_TTL_MS
  );
  if (!translations) return { locale: defaultLocale.code, entries: null };
  const entries: FlatCatalogue = {};
  for (const entry of translations.publicTranslations) entries[entry.key] = entry.value;
  return { locale: defaultLocale.code, entries };
}

export async function getTranslator(): Promise<Translator> {
  if (cached && cached.expires > Date.now()) return cached.translator;
  const { locale, entries } = await serverCatalogue();
  const translator = createTranslator({ locale, fallback: FALLBACK_FLAT, server: entries });
  cached = { translator, expires: Date.now() + TRANSLATOR_TTL_MS };
  return translator;
}
