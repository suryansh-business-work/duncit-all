import { flattenCatalogue, type NestedCatalogue } from '@duncit/app-settings';

/**
 * mWeb's LOCAL FALLBACK bundle (CLAUDE.md rule 38).
 *
 * Same structure as the server's Localization entries — namespaced portal-wise
 * then page-wise — so one parser reads both. This is what renders while the
 * API is still loading, when the device is offline, and for any key an admin
 * has not translated yet.
 *
 * Add a key HERE and in Admin > Localization > Translations BEFORE using it.
 */
export const MWEB_FALLBACK: NestedCatalogue = {
  mweb: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      language: 'Language',
      languageHint: 'Choose the language for the app.',
      languageSaved: 'Language updated',
    },
    account: {
      title: 'Account',
      preferences: 'Preferences',
    },
    shop: {
      title: 'Pod Shop',
      subtitle: 'Discover. Support. Shop Pods',
      emptyState: 'No products match your filters.',
      featured: 'Featured Products',
      outOfStock: 'Out of stock',
      includeOutOfStock: 'Include out of stock',
      searchPlaceholder: 'Search products or brands…',
    },
  },
};

/** Flat, runtime-ready form of the bundle above. */
export const MWEB_FALLBACK_FLAT = flattenCatalogue(MWEB_FALLBACK);
