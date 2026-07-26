import { flattenCatalogue, type NestedCatalogue } from './catalogue';

/**
 * The SHIPPED FALLBACK CATALOGUE — every user-facing key the client surfaces
 * know about, in the same nested shape as the server's Localization entries
 * (CLAUDE.md rule 38).
 *
 * It lives here rather than in each surface for two reasons:
 *  - mWeb and native must be identical (rule 27), and two hand-kept copies of
 *    the same `mweb.*` copy is exactly how they drift apart;
 *  - the admin panel seeds Localization > Translations from this registry, so
 *    a key added here is offered for translation without anyone re-typing it.
 *
 * Each surface still SHIPS its bundle — it re-exports the slice it renders, so
 * the copy is compiled into that build and available offline.
 */

/** Copy shared by mWeb and the native app — one namespace, one source. */
export const MWEB_BUNDLE: NestedCatalogue = {
  mweb: {
    common: {
      language: 'Language',
      languageHint: 'Choose the language for the app.',
      languageSaved: 'Language updated',
    },
    account: {
      preferences: 'Preferences',
    },
    shop: {
      title: 'Pod Shop',
      emptyState: 'No products match your filters.',
      featured: 'Featured Products',
      outOfStock: 'Out of stock',
      includeOutOfStock: 'Include out of stock',
      searchPlaceholder: 'Search products or brands…',
    },
  },
};

/** Chrome rendered by the portal shell, shared by every MUI portal. */
export const SHELL_BUNDLE: NestedCatalogue = {
  mweb: {
    common: {
      language: 'Language',
      languageHint: 'Choose the language for this portal.',
      languageSaved: 'Language updated',
    },
  },
  shell: {
    profile: {
      accessRoles: 'ACCESS ROLES',
      noRoles: 'No roles assigned.',
    },
  },
};

/**
 * The marketing websites' own chrome. Navigation and footer LINK labels are
 * not here — those are content from the Website portal's Navigation manager,
 * and duplicating them as translation keys would give the same text two
 * owners.
 */
export const WEBSITE_BUNDLE: NestedCatalogue = {
  website: {
    footer: {
      newsletterTitle: 'Get Duncit updates',
      emailPlaceholder: 'Email address',
      notify: 'Notify',
      sending: 'Sending',
      subscribed: 'Subscribed!',
      tryAgain: 'Try again',
      policyHub: 'Policy Hub',
      allPolicies: 'All policies',
      rights: 'All Rights Reserved',
    },
    nav: {
      closeMenu: 'Close menu',
    },
  },
};

/** Every client bundle, by the surface that ships it. */
export const SURFACE_BUNDLES: Record<string, NestedCatalogue> = {
  mweb: MWEB_BUNDLE,
  shell: SHELL_BUNDLE,
  website: WEBSITE_BUNDLE,
};

/**
 * Every shipped key as flat `key -> default text`, deduplicated across
 * surfaces. The admin panel imports this to seed missing Translations rows.
 */
export function allFallbackEntries(): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const bundle of Object.values(SURFACE_BUNDLES)) {
    Object.assign(merged, flattenCatalogue(bundle));
  }
  return merged;
}
