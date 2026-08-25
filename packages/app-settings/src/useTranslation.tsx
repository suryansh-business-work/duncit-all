import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import {
  allFallbackEntries,
  createTranslator,
  flattenCatalogue,
  resolveLocale,
  type FlatCatalogue,
  type Locale,
  type NestedCatalogue,
  type TranslateOptions,
  type Translator,
} from '@duncit/i18n';

/** Active locales for the language switcher. Unauthenticated: login screens
 * and the marketing sites need it before there is a session. */
export const PUBLIC_LOCALES = gql`
  query PublicLocales {
    publicLocales {
      code
      label
      english_label
      is_rtl
      is_default
      sort_order
    }
  }
`;

/** Flat catalogue for one locale, already merged over the default locale. */
export const PUBLIC_TRANSLATIONS = gql`
  query PublicTranslations($locale: String!) {
    publicTranslations(locale: $locale) {
      key
      value
    }
  }
`;

const STORAGE_KEY = 'duncit_locale';

function storedLocale(): string | null {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    // Private mode / disabled storage must not break rendering.
    return null;
  }
}

function persistLocale(code: string): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, code);
  } catch {
    /* best effort */
  }
}

interface LocaleContextValue {
  t: Translator['t'];
  has: Translator['has'];
  locale: string;
  isRtl: boolean;
  locales: Locale[];
  setLocale: (code: string) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * The floor for a component rendered with NO LocaleProvider above it.
 *
 * Every shipped namespace, not just one surface's: in that situation a page's
 * own keys have nowhere else to come from, because `mountPortal` is what layers
 * a surface's bundle over the shell's and it has not run. Without it a screen
 * mounted on its own — a test, an error boundary, a page rendered above the
 * provider — shows `finance.podExpense.title` where it should say "Pod
 * Expenses". `@duncit/shell`'s provider-free `fallbackT` has always had this
 * floor; this is the same rule, in the hook the portals actually call (rule 40).
 *
 * Built once, lazily: it is every key in the product, and a surface that always
 * has its provider never pays for it.
 */
let shippedFallback: FlatCatalogue | null = null;
const everyShippedKey = (): FlatCatalogue => {
  shippedFallback ??= allFallbackEntries();
  return shippedFallback;
};

interface ProviderProps {
  /** The surface's bundled fallback catalogue — renders before/without the API. */
  fallback: FlatCatalogue;
  /** The signed-in user's saved language; wins over any local choice. */
  userLocale?: string | null;
  /** Persist the choice server-side (wire to the setMyLocale mutation). */
  onLocaleChange?: (code: string) => void;
  children: React.ReactNode;
}

/**
 * Localization for a React surface.
 *
 * Locale precedence: the signed-in user's saved language, then a local choice,
 * then the device language, then the platform default. Text precedence is the
 * translator's: server text -> default locale -> the surface's bundled fallback
 * -> the key. So a screen renders real copy offline and before the API answers.
 */
export function LocaleProvider({
  fallback,
  userLocale,
  onLocaleChange,
  children,
}: Readonly<ProviderProps>) {
  const [override, setOverride] = useState<string | null>(null);
  const { data: localeData } = useQuery(PUBLIC_LOCALES, { fetchPolicy: 'cache-first' });
  const locales: Locale[] = localeData?.publicLocales ?? [];

  const deviceLocale =
    globalThis.navigator === undefined ? null : globalThis.navigator.language;
  const requested = override ?? userLocale ?? storedLocale() ?? deviceLocale;
  const active = resolveLocale(requested, locales);
  const code = active?.code ?? 'en-IN';

  const { data: catalogueData } = useQuery(PUBLIC_TRANSLATIONS, {
    variables: { locale: code },
    fetchPolicy: 'cache-first',
    // Nothing to fetch until the platform has told us which locales exist.
    skip: locales.length === 0,
  });

  const server: FlatCatalogue = useMemo(() => {
    const entries: FlatCatalogue = {};
    for (const row of catalogueData?.publicTranslations ?? []) entries[row.key] = row.value;
    return entries;
  }, [catalogueData]);

  const translator = useMemo(
    () => createTranslator({ locale: code, isRtl: active?.is_rtl === true, fallback, server }),
    [code, active?.is_rtl, fallback, server],
  );

  // Tell the DOCUMENT what language it is in. `dir` is what actually flips the
  // layout for a right-to-left locale — an admin can mark a locale RTL, and
  // without this nothing would happen — and `lang` is what screen readers and
  // hyphenation read. Guarded for non-DOM hosts (SSR, tests).
  useEffect(() => {
    const root = globalThis.document?.documentElement;
    if (!root) return;
    root.dir = translator.isRtl ? 'rtl' : 'ltr';
    root.lang = translator.locale;
  }, [translator.isRtl, translator.locale]);

  const setLocale = useCallback(
    (next: string) => {
      setOverride(next);
      persistLocale(next);
      onLocaleChange?.(next);
    },
    [onLocaleChange],
  );

  const value = useMemo(
    () => ({
      t: translator.t,
      has: translator.has,
      locale: translator.locale,
      isRtl: translator.isRtl,
      locales,
      setLocale,
    }),
    [translator, locales, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/**
 * Translate inside a LocaleProvider.
 *
 * Outside one it still returns a working translator rather than throwing, so a
 * component rendered in isolation — a test, a storybook, an error boundary —
 * never crashes on a missing provider. Pass the surface's bundled catalogue so
 * that path renders real copy instead of raw keys; a surface should do this
 * through its own thin wrapper (see mWeb's src/i18n/useTranslation) rather than
 * repeating the argument at every call site.
 */
export function useTranslation(fallback?: FlatCatalogue): LocaleContextValue {
  const context = useContext(LocaleContext);
  const fallbackTranslator = useMemo(
    () => createTranslator({ locale: 'en-IN', fallback: fallback ?? everyShippedKey() }),
    [fallback],
  );
  if (context) return context;
  return {
    t: fallbackTranslator.t,
    has: fallbackTranslator.has,
    locale: fallbackTranslator.locale,
    isRtl: false,
    locales: [],
    setLocale: () => undefined,
  };
}

/**
 * A package-scoped `useTranslation`, bound to that package's own bundle.
 *
 * Every shared package that owns a namespace needs the same three things: its
 * bundle flattened once, the shared hook called for the provider's translator,
 * and a local translator layered UNDER it. The layering is the part that is easy
 * to miss — inside a LocaleProvider the shared hook returns the PROVIDER's
 * translator and ignores the fallback handed to it, so a package whose namespace
 * the host surface never mounted would render raw keys until an admin happened
 * to import them. Provider copy still wins, which is what lets a translated
 * entry reach the package; the local bundle only answers the keys the provider
 * has never heard of.
 *
 * It lives here rather than in each package because it was five hand-kept copies
 * of the same twenty lines (rule 40).
 */
export function createBundleTranslation(bundle: NestedCatalogue) {
  const fallback = flattenCatalogue(bundle);
  return function usePackageTranslation(): LocaleContextValue {
    const outer = useTranslation(fallback);
    return useMemo(() => {
      const local = createTranslator({ locale: outer.locale, fallback });
      return {
        ...outer,
        has: (key: string) => outer.has(key) || local.has(key),
        t: (key: string, options?: TranslateOptions) =>
          outer.has(key) ? outer.t(key, options) : local.t(key, options),
      };
    }, [outer]);
  };
}
