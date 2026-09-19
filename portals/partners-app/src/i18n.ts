import {
  flattenCatalogue,
  PACKAGING_BUNDLE,
  PARTNERS_BUNDLE,
  useTranslation as useSharedTranslation,
} from '@duncit/app-settings';

/**
 * The portal's own bundled copy, flattened once: `main.tsx` mounts it as the
 * LocaleProvider's fallback, and `useTranslation` below hands it to the shared
 * hook so a component rendered OUTSIDE that provider — a test, an error
 * boundary — still shows real words instead of raw keys.
 *
 * This is the thin per-surface wrapper @duncit/app-settings' own doc comment
 * asks for, rather than repeating the argument at every call site.
 *
 * The shared "Shipping & packaging" section of the listing form ships its own
 * `packaging.*` copy, layered in here.
 */
export const PARTNERS_FALLBACK = {
  ...flattenCatalogue(PARTNERS_BUNDLE),
  ...flattenCatalogue(PACKAGING_BUNDLE),
};

export const useTranslation = () => useSharedTranslation(PARTNERS_FALLBACK);
