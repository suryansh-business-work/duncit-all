import { useMemo } from 'react';
import {
  createTranslator,
  flattenCatalogue,
  LOCATION_BUNDLE,
  useTranslation as useSharedTranslation,
} from '@duncit/app-settings';

/**
 * This package's LOCAL FALLBACK bundle (CLAUDE.md rule 38).
 *
 * The copy lives in @duncit/i18n with every other surface's, so the admin panel
 * can offer each key for translation — and it is compiled into whichever build
 * imports this package, which is what renders offline and before the API
 * answers.
 */
export const LOCATION_FALLBACK_FLAT = flattenCatalogue(LOCATION_BUNDLE);

/**
 * Translate inside the shared location picker.
 *
 * The bundle is layered here rather than left to the host surface for a reason
 * the shared hook makes easy to miss: inside a LocaleProvider it returns the
 * PROVIDER's translator and ignores the fallback passed to it. mWeb and every
 * portal mount that provider with their own bundle, none of which knows
 * `location.*` — so without this the picker would render raw keys everywhere
 * until an admin happened to import them. Provider copy still wins, which is
 * what lets a translated entry reach it; the local bundle only answers the keys
 * the provider has never heard of.
 */
export function useTranslation() {
  const outer = useSharedTranslation(LOCATION_FALLBACK_FLAT);

  return useMemo(() => {
    const local = createTranslator({
      locale: outer.locale,
      fallback: LOCATION_FALLBACK_FLAT,
    });
    return {
      ...outer,
      has: (key: string) => outer.has(key) || local.has(key),
      t: (key: string, options?: Parameters<typeof outer.t>[1]) =>
        outer.has(key) ? outer.t(key, options) : local.t(key, options),
    };
  }, [outer]);
}
