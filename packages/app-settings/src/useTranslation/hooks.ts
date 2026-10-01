import { useContext, useMemo } from 'react';
import {
  allFallbackEntries,
  createTranslator,
  flattenCatalogue,
  type FlatCatalogue,
  type NestedCatalogue,
  type TranslateOptions,
  type Translator,
} from '@duncit/i18n';
import { LocaleContext, type LocaleContextValue } from './context';

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

/** The cached value under `key`, built by `create` the first time it is asked for. */
function cached<K, V>(cache: { get(key: K): V | undefined; set(key: K, value: V): unknown }, key: K, create: () => V): V {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const built = create();
  cache.set(key, built);
  return built;
}

/**
 * One provider-free translator per fallback catalogue, shared by every caller.
 * Building one copies the whole catalogue — thousands of keys — and the hook
 * used to do that for EVERY mounted component, even under a provider where the
 * result was thrown away. Keyed on the catalogue object, which every surface
 * passes as a module constant.
 */
const fallbackTranslators = new WeakMap<FlatCatalogue, Translator>();

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
  if (context) return context;
  const floor = fallback ?? everyShippedKey();
  const fallbackTranslator = cached(fallbackTranslators, floor, () =>
    createTranslator({ locale: 'en-IN', fallback: floor }),
  );
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
  // One local translator per locale for the package, not one per mounted component.
  const locals = new Map<string, Translator>();
  return function usePackageTranslation(): LocaleContextValue {
    const outer = useTranslation(fallback);
    return useMemo(() => {
      const local = cached(locals, outer.locale, () => createTranslator({ locale: outer.locale, fallback }));
      return {
        ...outer,
        has: (key: string) => outer.has(key) || local.has(key),
        t: (key: string, options?: TranslateOptions) =>
          outer.has(key) ? outer.t(key, options) : local.t(key, options),
      };
    }, [outer]);
  };
}
