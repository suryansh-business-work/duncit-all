import { useTranslation as useSharedTranslation } from '@duncit/app-settings';

import { SHELL_FALLBACK_FLAT } from './fallback';

/**
 * Translate in shell chrome — the portals' twin of mWeb's and the native app's
 * hook, on the same @duncit/i18n core so every surface resolves text
 * identically.
 *
 * Text precedence: server catalogue -> the shell's bundled fallback -> the key.
 * The bundle is supplied here rather than at each call site so chrome rendered
 * without the provider — in a test, or above it in the tree — still shows real
 * copy instead of a raw key.
 *
 * A portal's OWN keys come from the `i18nFallback` it passes to mountPortal,
 * which the provider layers over this bundle.
 */
export function useTranslation() {
  return useSharedTranslation(SHELL_FALLBACK_FLAT);
}
