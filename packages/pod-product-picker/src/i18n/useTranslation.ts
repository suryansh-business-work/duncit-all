import { useMemo } from 'react';
import {
  createTranslator,
  flattenCatalogue,
  POD_PRODUCT_BUNDLE,
  useTranslation as useSharedTranslation,
} from '@duncit/app-settings';

/**
 * The picker's LOCAL FALLBACK bundle (CLAUDE.md rule 38).
 *
 * The copy lives in @duncit/i18n with every other surface's, so the admin panel
 * can offer each key for translation — and it is compiled into whichever build
 * imports this package, which is what renders offline and before the API
 * answers.
 */
export const POD_PRODUCT_FALLBACK_FLAT = flattenCatalogue(POD_PRODUCT_BUNDLE);

/**
 * Translate inside the pod product picker.
 *
 * The same @duncit/i18n core mWeb, the portals and the native app use, so a
 * string resolves identically wherever the picker is rendered.
 *
 * The bundle is layered here rather than left to the host surface for the reason
 * the media picker documents: inside a LocaleProvider the shared hook returns
 * the PROVIDER's translator and ignores the fallback passed to it. mWeb mounts
 * `mweb.*` and the portals mount `shell.*`, neither of which knows
 * `podProduct.*` — so without this layer the dialog would render raw keys until
 * an admin happened to import them. Provider copy still wins, which is what lets
 * a translated `podProduct.*` entry reach the dialog; the local bundle only
 * answers the keys the provider has never heard of.
 */
export function useTranslation() {
  const outer = useSharedTranslation(POD_PRODUCT_FALLBACK_FLAT);

  return useMemo(() => {
    const local = createTranslator({ locale: outer.locale, fallback: POD_PRODUCT_FALLBACK_FLAT });
    return {
      ...outer,
      has: (key: string) => outer.has(key) || local.has(key),
      t: (key: string, options?: Parameters<typeof outer.t>[1]) =>
        outer.has(key) ? outer.t(key, options) : local.t(key, options),
    };
  }, [outer]);
}

/** The `t` a component in this package receives. */
export type Translate = ReturnType<typeof useTranslation>['t'];
