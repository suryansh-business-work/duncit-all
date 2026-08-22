import {
  flattenCatalogue,
  SHELL_BUNDLE,
  useTranslation as useSharedTranslation,
} from '@duncit/app-settings';

/**
 * The coupons console's LOCAL FALLBACK bundle (CLAUDE.md rule 38).
 *
 * Its copy lives under `shell.coupons.*` in @duncit/i18n with every other
 * surface's, and is compiled into whichever portal build imports this package.
 * Both consoles that render it ship the shell bundle already, so this only
 * matters with no LocaleProvider above (a test, an error boundary).
 */
export const COUPONS_FALLBACK_FLAT = flattenCatalogue(SHELL_BUNDLE);

/** Translate inside the shared coupons console. */
export function useTranslation() {
  return useSharedTranslation(COUPONS_FALLBACK_FLAT);
}

/** The `t` a component in this package receives. */
export type Translate = ReturnType<typeof useTranslation>['t'];
