import { useMemo } from 'react';
import {
  AI_MONITORING_BUNDLE,
  createTranslator,
  flattenCatalogue,
  useTranslation as useSharedTranslation,
} from '@duncit/app-settings';

/**
 * The notice's LOCAL FALLBACK bundle (CLAUDE.md rule 38) — the same
 * `aiMonitoring.*` namespace the native app ships, held once in @duncit/i18n.
 */
export const AI_MONITORING_FALLBACK_FLAT = flattenCatalogue(AI_MONITORING_BUNDLE);

/**
 * Translate inside the AI Monitoring notice.
 *
 * Layered here rather than left to the host surface for the reason the shared
 * hook makes easy to miss: inside a LocaleProvider it returns the PROVIDER's
 * translator and ignores the fallback passed to it. mWeb and all seventeen
 * portals mount that provider with their own bundle, none of which knows
 * `aiMonitoring.*` — so without this the chip would render raw keys everywhere
 * until an admin happened to import them. Provider copy still wins, which is
 * what lets a translated entry reach the chip; the local bundle only answers
 * keys the provider has never heard of.
 */
export function useTranslation() {
  const outer = useSharedTranslation(AI_MONITORING_FALLBACK_FLAT);

  return useMemo(() => {
    const local = createTranslator({
      locale: outer.locale,
      fallback: AI_MONITORING_FALLBACK_FLAT,
    });
    return {
      ...outer,
      has: (key: string) => outer.has(key) || local.has(key),
      t: (key: string, options?: Parameters<typeof outer.t>[1]) =>
        outer.has(key) ? outer.t(key, options) : local.t(key, options),
    };
  }, [outer]);
}
