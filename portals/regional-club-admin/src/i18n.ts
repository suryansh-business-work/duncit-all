import {
  flattenCatalogue,
  REGIONAL_BUNDLE,
  useTranslation as useSharedTranslation,
} from '@duncit/app-settings';

/**
 * The portal's own bundled copy, flattened once: `main.tsx` mounts it as the
 * LocaleProvider's fallback, and `useTranslation` below hands it to the shared
 * hook so a component rendered OUTSIDE that provider — a test, an error
 * boundary — still shows real words instead of raw keys.
 *
 * Reached through @duncit/app-settings, which already re-exports the i18n
 * package: the portal gains the copy without gaining a dependency (and without
 * the matching Dockerfile COPY that a new @duncit/* dep would silently require).
 */
export const REGIONAL_FALLBACK = flattenCatalogue(REGIONAL_BUNDLE);

export const useTranslation = () => useSharedTranslation(REGIONAL_FALLBACK);
