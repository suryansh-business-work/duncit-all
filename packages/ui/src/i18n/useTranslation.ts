import {
  createBundleTranslation,
  createTranslator,
  flattenCatalogue,
  UI_BUNDLE,
} from '@duncit/app-settings';

/**
 * This package's LOCAL FALLBACK bundle (CLAUDE.md rule 38).
 *
 * The copy lives in @duncit/i18n with every other surface's, so the admin panel
 * can offer each key for translation — and it is compiled into whichever build
 * imports this package, which is what renders offline and before the API
 * answers.
 */
export const UI_FALLBACK_FLAT = flattenCatalogue(UI_BUNDLE);

/** The `t` a component in this package receives. */
export type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * Translate inside the shared UI components.
 *
 * The bundle is layered over the host surface's rather than left to it: every
 * portal and mWeb mount the provider with their own bundle, none of which knows
 * `ui.*`. See `createBundleTranslation` for why that matters.
 */
export const useTranslation = createBundleTranslation(UI_BUNDLE);

/**
 * A provider-free translator over the bundled copy, for the code in this
 * package that runs outside the React tree.
 */
export const fallbackT: Translate = createTranslator({
  locale: 'en-IN',
  fallback: UI_FALLBACK_FLAT,
}).t as Translate;
