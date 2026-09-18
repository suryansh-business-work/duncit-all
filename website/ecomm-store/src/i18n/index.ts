import { useTranslation } from '@duncit/app-settings';
import { CAPTCHA_BUNDLE, ECOMM_STORE_BUNDLE, flattenCatalogue, mergeCatalogues } from '@duncit/i18n';

/**
 * The storefront's bundled copy: its own `ecommStore` namespace plus the shared
 * captcha words its newsletter form shows. Renders before — and without — the
 * Localization API.
 */
export const STORE_FALLBACK = mergeCatalogues(
  flattenCatalogue(ECOMM_STORE_BUNDLE),
  flattenCatalogue(CAPTCHA_BUNDLE),
);

/** `t()` for the store, with the bundle supplied for provider-less renders. */
export function useStoreT() {
  return useTranslation(STORE_FALLBACK);
}
