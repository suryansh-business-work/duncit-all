import { useTranslation as useSharedTranslation } from '@duncit/app-settings';

import { MWEB_FALLBACK_FLAT } from './fallback';

/**
 * Translate in mWeb — the twin of the native app's `@/hooks/useTranslation`,
 * built on the same @duncit/i18n core so both surfaces resolve text identically
 * (rule 27).
 *
 * Text precedence: server catalogue -> mWeb's bundled fallback -> the key. The
 * bundle is supplied here rather than at each call site so a component rendered
 * without the provider — in a test, or above it in the tree — still shows real
 * copy instead of a raw key.
 */
export function useTranslation() {
  return useSharedTranslation(MWEB_FALLBACK_FLAT);
}
