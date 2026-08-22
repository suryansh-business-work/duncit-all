import { useMemo } from 'react';
import {
  createTranslator,
  flattenCatalogue,
  AD_REQUEST_BUNDLE,
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
export const AD_REQUEST_FALLBACK_FLAT = flattenCatalogue(AD_REQUEST_BUNDLE);

/**
 * Translate inside the shared ad-request form.
 *
 * The bundle is layered here rather than left to the host surface for a reason
 * the shared hook makes easy to miss: inside a LocaleProvider it returns the
 * PROVIDER's translator and ignores the fallback passed to it. mWeb and every
 * portal mount that provider with their own bundle, none of which knows
 * `adRequest.*` — so without this the form would render raw keys everywhere
 * until an admin happened to import them. Provider copy still wins, which is
 * what lets a translated entry reach it; the local bundle only answers the keys
 * the provider has never heard of.
 */
export function useTranslation() {
  const outer = useSharedTranslation(AD_REQUEST_FALLBACK_FLAT);

  return useMemo(() => {
    const local = createTranslator({
      locale: outer.locale,
      fallback: AD_REQUEST_FALLBACK_FLAT,
    });
    return {
      ...outer,
      has: (key: string) => outer.has(key) || local.has(key),
      t: (key: string, options?: Parameters<typeof outer.t>[1]) =>
        outer.has(key) ? outer.t(key, options) : local.t(key, options),
    };
  }, [outer]);
}

/** The `t` a component or schema in this package receives. */
export type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * A provider-free translator over the bundled copy.
 *
 * `toSubmitAdRequestInput` re-runs the schema outside React for its coercions,
 * and a suite asserts on the option labels with no tree around it. The twin of
 * @duncit/shell's and mWeb's `fallbackT`.
 */
export const adRequestT: Translate = createTranslator({
  locale: 'en-IN',
  fallback: AD_REQUEST_FALLBACK_FLAT,
}).t as Translate;
