import { flattenCatalogue, type NestedCatalogue } from '@duncit/i18n';

/**
 * The native app's LOCAL FALLBACK bundle (CLAUDE.md rule 38).
 *
 * Same structure as the server's Localization entries and as mWeb's bundle, so
 * one parser reads all three. This renders while the API is loading, when the
 * device is offline, and for any key an admin has not translated yet.
 *
 * Add a key HERE and in Admin > Localization > Translations BEFORE using it.
 * mWeb and native share the `mweb.*` namespace where the copy is identical
 * (rule 27), so the two surfaces cannot drift apart.
 */
export const NATIVE_FALLBACK: NestedCatalogue = {
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
export const NATIVE_FALLBACK_FLAT = flattenCatalogue(NATIVE_FALLBACK);
