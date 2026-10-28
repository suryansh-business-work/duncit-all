import { useTranslation } from '@duncit/app-settings';
import { SHELL_BUNDLE, catalogueBranch, flattenCatalogue, mergeCatalogues, type FlatCatalogue } from '@duncit/i18n';
import { LITE_COMMON_BUNDLE } from './bundle.common';
import { LITE_PORTAL_BUNDLE } from './bundle.portal';
import { LITE_WEB_BUNDLE } from './bundle.web';

/**
 * The shared rich-text editor's own words (shell.richText.*): Lite's server
 * catalogue has none of them, so without this layer its toolbar would read as
 * raw keys. Only the console mounts the editor (to write policies).
 */
const RICH_TEXT: FlatCatalogue = flattenCatalogue({ shell: { richText: catalogueBranch(catalogueBranch(SHELL_BUNDLE, 'shell'), 'richText') } });

/** The web app's local fallback: its own copy plus the shared words. */
export const WEB_FALLBACK: FlatCatalogue = mergeCatalogues(flattenCatalogue(LITE_COMMON_BUNDLE), flattenCatalogue(LITE_WEB_BUNDLE));

/** The console's local fallback. */
export const PORTAL_FALLBACK: FlatCatalogue = mergeCatalogues(mergeCatalogues(RICH_TEXT, flattenCatalogue(LITE_COMMON_BUNDLE)), flattenCatalogue(LITE_PORTAL_BUNDLE));

/** The shared words alone, for components both pages render. */
const COMMON_FALLBACK: FlatCatalogue = flattenCatalogue(LITE_COMMON_BUNDLE);

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

/** `t()` for a shared component (the picture picker), which only uses the shared words. */
export function useCommonT() {
  return useTranslation(COMMON_FALLBACK);
}
