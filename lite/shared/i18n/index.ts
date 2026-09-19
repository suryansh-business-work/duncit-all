import { useTranslation } from '@duncit/app-settings';
import { flattenCatalogue, mergeCatalogues, type FlatCatalogue } from '@duncit/i18n';
import { LITE_COMMON_BUNDLE } from './bundle.common';
import { LITE_PORTAL_BUNDLE } from './bundle.portal';
import { LITE_WEB_BUNDLE } from './bundle.web';

/** The web app's local fallback: its own copy plus the shared words. */
export const WEB_FALLBACK: FlatCatalogue = mergeCatalogues(flattenCatalogue(LITE_COMMON_BUNDLE), flattenCatalogue(LITE_WEB_BUNDLE));

/** The console's local fallback. */
export const PORTAL_FALLBACK: FlatCatalogue = mergeCatalogues(flattenCatalogue(LITE_COMMON_BUNDLE), flattenCatalogue(LITE_PORTAL_BUNDLE));

/** Every key Lite ships, for Console → Localization → "Import app keys". */
export const ALL_LITE_ENTRIES = (): { key: string; value: string }[] =>
  Object.entries(mergeCatalogues(WEB_FALLBACK, PORTAL_FALLBACK)).map(([key, value]) => ({ key, value }));

/** `t()` for the web app, with the bundle supplied for provider-less renders. */
export function useWebT() {
  return useTranslation(WEB_FALLBACK);
}

/** `t()` for the console. */
export function usePortalT() {
  return useTranslation(PORTAL_FALLBACK);
}
