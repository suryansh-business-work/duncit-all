import {
  allFallbackEntries,
  createTranslator,
  flattenCatalogue,
  SESSION_BUNDLE,
  SHELL_BUNDLE,
  WITHDRAW_BUNDLE,
  AVAILABILITY_BUNDLE,
  PUBLIC_PAGE_BUNDLE,
  VENUE_SETTINGS_BUNDLE,
  CLUB_ADMIN_BUNDLE,
  FULFILMENT_BUNDLE,
  type FlatCatalogue,
  CHANGE_REQUEST_BUNDLE,
  MAIL_PREFERENCE_BUNDLE,
  MWEB_BUNDLE,
  WHATSAPP_BUNDLE,
  type NestedCatalogue,
  type Translator,
} from '@duncit/i18n';

/** One branch of a nested bundle, or nothing when it is a leaf or missing. */
function branch(catalogue: NestedCatalogue | string | undefined, key: string): NestedCatalogue {
  if (!catalogue || typeof catalogue === 'string') return {};
  const value = catalogue[key];
  return value && typeof value !== 'string' ? value : {};
}

const MWEB = branch(MWEB_BUNDLE, 'mweb');

/**
 * The `mweb.*` copy the profile page renders through shared rules — the
 * password and profile schemas in @duncit/forms and the channel labels in
 * @duncit/utils were written for mWeb first and keep their keys, so the page
 * ships only those branches rather than the whole mWeb bundle.
 */
const PROFILE_MWEB_SLICE: NestedCatalogue = {
  mweb: {
    common: {
      language: branch(MWEB, 'common').language ?? '',
      languageSaved: branch(MWEB, 'common').languageSaved ?? '',
    },
    accountEdit: branch(MWEB, 'accountEdit'),
    changePassword: branch(MWEB, 'changePassword'),
    commPreference: branch(MWEB, 'commPreference'),
    auth: { validation: branch(branch(MWEB, 'auth'), 'validation') },
    resetPassword: { validation: branch(branch(MWEB, 'resetPassword'), 'validation') },
  },
};

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
  // availability.* + venueSettings.* are rendered by @duncit/availability-calendar
  // and the venue settings form in the Partners console, mWeb AND native, so
  // they are namespaces of their own rather than shell.* entries (rule 40).
  ...AVAILABILITY_BUNDLE,
  // publicPage.* is the publish card the Partners console, mWeb and native all render.
  ...PUBLIC_PAGE_BUNDLE,
  ...VENUE_SETTINGS_BUNDLE,
  ...CLUB_ADMIN_BUNDLE,
  ...FULFILMENT_BUNDLE,
  // changeRequest.* is the Request Change flow, rendered by the Partners and
  // Admin consoles AND by mWeb and native off the same pod row (rule 27).
  ...CHANGE_REQUEST_BUNDLE,
  // The profile page's Notifications tab — the person's own email and WhatsApp
  // preferences, the same categories mWeb shows. Only the person's own WhatsApp
  // branch: the admin and marketing consoles' copy stays theirs.
  ...MAIL_PREFERENCE_BUNDLE,
  whatsappPreference: branch(WHATSAPP_BUNDLE, 'whatsappPreference'),
  ...PROFILE_MWEB_SLICE,
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
