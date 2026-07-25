import { mergeCatalogues, type FlatCatalogue, type Locale } from './catalogue';

/** Values substituted into {placeholders}. */
export type TranslateVars = Record<string, string | number>;

export interface TranslateOptions {
  /** Literal shown when the key is missing everywhere. Prefer adding the key. */
  defaultValue?: string;
  /** Selects the .one / .other sub-key for count-driven copy. */
  count?: number;
  vars?: TranslateVars;
}

export interface Translator {
  locale: string;
  isRtl: boolean;
  /** Translate a dot-path key. */
  t: (key: string, options?: TranslateOptions) => string;
  /** True when the key resolves anywhere — lets a caller branch instead of
   * rendering a placeholder. */
  has: (key: string) => boolean;
  /** The merged catalogue, for debugging and the admin's coverage views. */
  catalogue: FlatCatalogue;
}

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Substitute {name} placeholders. A placeholder with no matching var is left
 * verbatim rather than replaced with "undefined", so a missing value is
 * obvious in review instead of silently corrupting the sentence.
 */
export function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(PLACEHOLDER, (match, name: string) => {
    const value = vars[name];
    return value === undefined || value === null ? match : String(value);
  });
}

/**
 * Resolution order for a key, which is the whole point of the fallback bundle:
 *   1. the active locale's merged catalogue (server over local fallback)
 *   2. the default locale's catalogue
 *   3. an explicit defaultValue
 *   4. the key itself — visible, greppable, never blank
 */
export interface TranslatorInput {
  locale: string;
  isRtl?: boolean;
  /** The surface's bundled fallback for the active locale. */
  fallback?: FlatCatalogue | null;
  /** Entries fetched from the server for the active locale. */
  server?: FlatCatalogue | null;
  /** Merged catalogue of the platform's default locale. */
  defaultCatalogue?: FlatCatalogue | null;
  /** Called once per missing key — wire it to logging in dev to find gaps. */
  onMissing?: (key: string, locale: string) => void;
}

export function createTranslator(input: Readonly<TranslatorInput>): Translator {
  const catalogue = mergeCatalogues(input.fallback, input.server);
  const fallbackCatalogue = input.defaultCatalogue ?? {};

  const lookup = (key: string): string | null => {
    const own = catalogue[key];
    if (typeof own === 'string' && own !== '') return own;
    const inherited = fallbackCatalogue[key];
    if (typeof inherited === 'string' && inherited !== '') return inherited;
    return null;
  };

  // Count-driven copy uses sibling keys (`cart.items.one` / `.other`) rather
  // than a separate plural API, so the admin edits plain rows like any other.
  const resolve = (key: string, count?: number): string | null => {
    if (count !== undefined) {
      const suffix = Math.abs(count) === 1 ? 'one' : 'other';
      const plural = lookup(`${key}.${suffix}`);
      if (plural !== null) return plural;
    }
    return lookup(key);
  };

  const t = (key: string, options?: TranslateOptions): string => {
    const found = resolve(key, options?.count);
    if (found === null) {
      input.onMissing?.(key, input.locale);
      const fallbackText = options?.defaultValue ?? key;
      return interpolate(fallbackText, { ...options?.vars, count: options?.count ?? '' });
    }
    return interpolate(found, { ...options?.vars, count: options?.count ?? '' });
  };

  return {
    locale: input.locale,
    isRtl: input.isRtl === true,
    t,
    has: (key: string) => resolve(key) !== null,
    catalogue,
  };
}

/**
 * Pick the locale to use: the user's choice when the platform still supports
 * it, else the default, else the first active one. Never returns a locale the
 * platform has switched off.
 */
export function resolveLocale(
  requested: string | null | undefined,
  locales: readonly Locale[] | null | undefined,
): Locale | null {
  const active = (locales ?? []).filter((l) => l.is_active !== false);
  if (active.length === 0) return null;
  const wanted = (requested ?? '').trim().toLowerCase();
  const exact = active.find((l) => l.code.toLowerCase() === wanted);
  if (exact) return exact;
  // 'hi' should still match 'hi-IN' when the exact region is unavailable.
  const language = wanted.split('-')[0];
  const byLanguage = language
    ? active.find((l) => l.code.toLowerCase().split('-')[0] === language)
    : undefined;
  if (byLanguage) return byLanguage;
  return active.find((l) => l.is_default === true) ?? active[0];
}
