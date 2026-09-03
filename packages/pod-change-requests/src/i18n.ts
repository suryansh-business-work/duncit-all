import {
  CHANGE_REQUEST_BUNDLE,
  createBundleTranslation,
  createTranslator,
  flattenCatalogue,
} from '@duncit/app-settings';

/**
 * This package's LOCAL FALLBACK bundle (CLAUDE.md rule 38).
 *
 * The copy lives in @duncit/i18n with every other surface's, so the admin panel
 * can offer each key for translation — and it is compiled into whichever build
 * imports this package, which is what renders offline and before the API
 * answers.
 */
export const CHANGE_REQUEST_FALLBACK_FLAT = flattenCatalogue(CHANGE_REQUEST_BUNDLE);

/** The `t` a component in this package receives. */
export type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * Translate inside the Change Requests surfaces.
 *
 * Layered over the host's rather than left to it: mWeb mounts `mweb.*` and a
 * portal mounts `shell.*` plus its own namespace, and neither knows
 * `changeRequest.*`. See `createBundleTranslation` for why that matters.
 */
export const useTranslation = createBundleTranslation(CHANGE_REQUEST_BUNDLE);

/** A provider-free translator, for anything that runs outside the React tree. */
export const fallbackT: Translate = createTranslator({
  locale: 'en-IN',
  fallback: CHANGE_REQUEST_FALLBACK_FLAT,
}).t;
