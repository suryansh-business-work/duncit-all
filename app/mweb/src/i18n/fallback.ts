import {
  CONTENT_REPORT_BUNDLE,
  EARNINGS_BUNDLE,
  POD_TIMELINE_BUNDLE,
  createTranslator,
  flattenCatalogue,
  GRIEVANCE_BUNDLE,
  MAIL_PREFERENCE_BUNDLE,
  MWEB_BUNDLE,
  POD_PRODUCT_BUNDLE,
  POLICY_ACCEPTANCE_BUNDLE,
  SESSION_BUNDLE,
  WHATSAPP_BUNDLE,
  WITHDRAW_BUNDLE,
  AVAILABILITY_BUNDLE,
  VENUE_SETTINGS_BUNDLE,
  CLUB_ADMIN_BUNDLE,
  FULFILMENT_BUNDLE,
  type NestedCatalogue,
  type Translator,
} from '@duncit/app-settings';

/**
 * mWeb's LOCAL FALLBACK bundle (CLAUDE.md rule 38).
 *
 * The copy itself lives in @duncit/i18n because mWeb and the native app must
 * render identical text (rule 27) — it is compiled into this build, so it is
 * still what renders while the API is loading, offline, and for any key an
 * admin has not translated yet.
 *
 * Add a key to the shared bundle AND to Admin > Localization > Translations
 * BEFORE using it.
 */
// The grievance form renders here, in native AND on the website, so its copy
// is its own namespace rather than a second copy inside mweb.*. The pod product
// picker is the same story across mWeb, native and the two portals, the
// WhatsApp categories across mWeb, native and the admin console, and the signup
// policy gate across mWeb, native and the Legal portal's log page. The
// namespaces are disjoint (`mweb`, `grievance`, `podProduct`,
// `whatsappPreference`, `policyAcceptance`, `session`), so a shallow merge is
// the whole of it — no key can shadow another. `session.*` is
// @duncit/user-context's: the portal-mode gate and the "user data not loaded"
// dialog render here too.
export const MWEB_FALLBACK: NestedCatalogue = {
  ...MWEB_BUNDLE,
  ...CONTENT_REPORT_BUNDLE,
  ...EARNINGS_BUNDLE,
  ...POD_TIMELINE_BUNDLE,
  ...GRIEVANCE_BUNDLE,
  ...MAIL_PREFERENCE_BUNDLE,
  ...POD_PRODUCT_BUNDLE,
  ...POLICY_ACCEPTANCE_BUNDLE,
  ...SESSION_BUNDLE,
  ...WHATSAPP_BUNDLE,
  ...WITHDRAW_BUNDLE,
  // The venue availability calendar and the venue settings form render here
  // through the same packages the Partners console mounts (rule 27).
  ...AVAILABILITY_BUNDLE,
  ...VENUE_SETTINGS_BUNDLE,
  ...CLUB_ADMIN_BUNDLE,
  ...FULFILMENT_BUNDLE,
};

/** Flat, runtime-ready form of the bundle above. */
export const MWEB_FALLBACK_FLAT = flattenCatalogue(MWEB_FALLBACK);

/** The `t` a component receives from `useTranslation`. */
export type Translate = Translator['t'];

/**
 * A provider-free translator over the bundled copy.
 *
 * Zod schemas are built outside React, so a schema factory takes `t` from the
 * form that renders it and follows the reader's language. This is what the
 * module-level schema exports fall back to — they are parsed with no React tree
 * around them, and must still produce real English messages rather than keys.
 */
export const fallbackT: Translate = createTranslator({
  locale: 'en-IN',
  fallback: MWEB_FALLBACK_FLAT,
}).t;
