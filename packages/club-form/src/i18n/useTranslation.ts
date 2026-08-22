import { useMemo } from 'react';
import {
  createTranslator,
  flattenCatalogue,
  CLUB_FORM_BUNDLE,
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
export const CLUBFORM_FALLBACK_FLAT = flattenCatalogue(CLUB_FORM_BUNDLE);

/** The `t` a component in this package receives. */
export type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * Translate inside the shared club form.
 *
 * The bundle is layered here rather than left to the host surface for a reason
 * the shared hook makes easy to miss: inside a LocaleProvider it returns the
 * PROVIDER's translator and ignores the fallback passed to it. Every portal and
 * mWeb mount that provider with their own bundle, none of which knows
 * `clubForm.*` — so without this the package would render raw keys on every
 * surface until an admin happened to import them. Provider copy still wins,
 * which is what lets a translated entry reach it; the local bundle only answers
 * the keys the provider has never heard of.
 */
export function useTranslation() {
  const outer = useSharedTranslation(CLUBFORM_FALLBACK_FLAT);

  return useMemo(() => {
    const local = createTranslator({
      locale: outer.locale,
      fallback: CLUBFORM_FALLBACK_FLAT,
    });
    return {
      ...outer,
      has: (key: string) => outer.has(key) || local.has(key),
      t: (key: string, options?: Parameters<typeof outer.t>[1]) =>
        outer.has(key) ? outer.t(key, options) : local.t(key, options),
    };
  }, [outer]);
}
