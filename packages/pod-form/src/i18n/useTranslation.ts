import {
  createBundleTranslation,
  createTranslator,
  EARNINGS_BUNDLE,
  flattenCatalogue,
  POD_FORM_BUNDLE,
} from '@duncit/app-settings';

/**
 * The earnings statement renders inside this form as well as in mWeb and the
 * native app, so its wording is its own namespace rather than a fourth copy —
 * layered in here so a portal mounting the form resolves it too.
 */
const FORM_CATALOGUE = { ...POD_FORM_BUNDLE, ...EARNINGS_BUNDLE };

/**
 * This package's LOCAL FALLBACK bundle (CLAUDE.md rule 38).
 *
 * The copy lives in @duncit/i18n with every other surface's, so the admin panel
 * can offer each key for translation — and it is compiled into whichever build
 * imports this package, which is what renders offline and before the API
 * answers.
 */
export const PODFORM_FALLBACK_FLAT = flattenCatalogue(FORM_CATALOGUE);

/** The `t` a component in this package receives. */
export type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * Translate inside the shared pod form.
 *
 * The bundle is layered over the host surface's rather than left to it: every
 * portal and mWeb mount the provider with their own bundle, none of which knows
 * `podForm.*`. See `createBundleTranslation` for why that matters.
 */
export const useTranslation = createBundleTranslation(FORM_CATALOGUE);

/**
 * Split a sentence around its `{action}` placeholder.
 *
 * The empty states name the control that fills them ("Click **Add image** to
 * upload…") and draw that name in bold. Keeping it ONE key means a translator
 * gets a whole sentence and can put the button name wherever their language
 * needs it — a prefix/suffix pair could only ever be read in English order.
 */
export const splitAroundAction = (sentence: string): readonly [string, string] => {
  const [before, after = ''] = sentence.split('{action}');
  return [before, after];
};

/**
 * A provider-free translator over the bundled copy, for the code in this
 * package that runs outside the React tree.
 */
export const fallbackT: Translate = createTranslator({
  locale: 'en-IN',
  fallback: PODFORM_FALLBACK_FLAT,
}).t;
