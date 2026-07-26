import { flattenCatalogue, type NestedCatalogue } from '@duncit/i18n';

/**
 * The portal shell's LOCAL FALLBACK bundle (CLAUDE.md rule 38).
 *
 * Shared by every MUI portal, so shell chrome renders real text offline and
 * before the API answers. A portal adds its OWN keys under its own namespace
 * (e.g. `admin.*`) and passes them to mountPortal — this bundle only covers
 * what the shell itself renders.
 *
 * Same nested structure as the server entries and as mWeb/native's bundles, so
 * one parser reads them all.
 */
export const SHELL_FALLBACK: NestedCatalogue = {
  mweb: {
    common: {
      language: 'Language',
      languageHint: 'Choose the language for this portal.',
      languageSaved: 'Language updated',
    },
  },
  shell: {
    profile: {
      title: 'Profile',
      accessRoles: 'ACCESS ROLES',
      noRoles: 'No roles assigned.',
    },
  },
};

/** Flat, runtime-ready form of the bundle above. */
export const SHELL_FALLBACK_FLAT = flattenCatalogue(SHELL_FALLBACK);
