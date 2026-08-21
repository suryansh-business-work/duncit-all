import {
  allFallbackEntries,
  flattenCatalogue,
  SHELL_BUNDLE,
  type FlatCatalogue,
  type NestedCatalogue,
} from '@duncit/i18n';

/**
 * The portal shell's LOCAL FALLBACK bundle (CLAUDE.md rule 38).
 *
 * Shared by every MUI portal, so shell chrome renders real text offline and
 * before the API answers. A portal adds its OWN keys under its own namespace
 * (e.g. `admin.*`) and passes them to mountPortal — this bundle only covers
 * what the shell itself renders.
 *
 * The copy lives in @duncit/i18n alongside the other surfaces' bundles so the
 * admin panel can offer every shipped key for translation; it is compiled into
 * each portal's build all the same.
 */
export const SHELL_FALLBACK: NestedCatalogue = SHELL_BUNDLE;

/** Flat, runtime-ready form of the bundle above. */
export const SHELL_FALLBACK_FLAT = flattenCatalogue(SHELL_FALLBACK);

/**
 * The floor used when a component renders with NO LocaleProvider above it — a
 * test, a storybook, an error boundary, anything mounted above the tree.
 *
 * It is every shipped namespace rather than only the shell's, because in that
 * situation a portal's own keys have nowhere else to come from: `mountPortal`
 * is what layers a portal's `i18nFallback` over the shell's, and it has not run.
 * Without this a page rendered outside the provider shows `ai.welcome.greeting`
 * where it should say "Hi Asha".
 *
 * It costs nothing to include: `@duncit/i18n`'s entry point already imports
 * every namespace to assemble SURFACE_BUNDLES, so they are in the module graph
 * either way.
 *
 * This is ONLY the no-provider floor. Inside a provider the catalogue is the
 * server's merged over what the portal shipped, and that is unchanged — a
 * portal must still pass its own bundle to `mountPortal` so its copy is
 * compiled into its build (rule 38).
 */
export const ALL_FALLBACK_FLAT: FlatCatalogue = allFallbackEntries();
