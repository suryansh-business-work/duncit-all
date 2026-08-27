import {
  allFallbackEntries,
  createTranslator,
  flattenCatalogue,
  SESSION_BUNDLE,
  SHELL_BUNDLE,
  WITHDRAW_BUNDLE,
  type FlatCatalogue,
  type NestedCatalogue,
  type Translator,
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
// `session.*` is @duncit/user-context's — the login screen, the maintenance /
// under-development gates and the "user data not loaded" dialog. It renders in
// mWeb as well, so it is its own namespace rather than a second copy inside
// `shell.*` (rule 40); the two are disjoint, so a shallow merge is the whole of
// it.
// withdraw.* rides along because the wallet withdrawal rules live in
// @duncit/forms/schemas and every portal that shows a wallet renders them.
export const SHELL_FALLBACK: NestedCatalogue = {
  ...SHELL_BUNDLE,
  ...SESSION_BUNDLE,
  ...WITHDRAW_BUNDLE,
};

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

/** The `t` a portal component receives from `useTranslation`. */
export type Translate = Translator['t'];

/**
 * A provider-free translator over every shipped bundle.
 *
 * Zod schemas are built outside React, so a schema factory takes `t` from the
 * form that renders it and follows the reader's language. This is what the
 * module-level schema exports fall back to — they are parsed with no React tree
 * around them, and must still produce real English messages rather than keys.
 *
 * The twin of mWeb's and the native app's `fallbackT`; one per surface family,
 * not one per portal (rule 40).
 */
export const fallbackT: Translate = createTranslator({
  locale: 'en-IN',
  fallback: ALL_FALLBACK_FLAT,
}).t;
