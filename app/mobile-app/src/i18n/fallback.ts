import {
  AI_MONITORING_BUNDLE,
  CONTENT_REPORT_BUNDLE,
  createTranslator,
  flattenCatalogue,
  GRIEVANCE_BUNDLE,
  MAIL_PREFERENCE_BUNDLE,
  MWEB_BUNDLE,
  POD_PRODUCT_BUNDLE,
  POLICY_ACCEPTANCE_BUNDLE,
  VERIFICATION_BUNDLE,
  WHATSAPP_BUNDLE,
  WITHDRAW_BUNDLE,
  type NestedCatalogue,
  type Translator,
} from '@duncit/i18n';

/**
 * The native app's LOCAL FALLBACK bundle (CLAUDE.md rule 38).
 *
 * It is the SAME `mweb.*` catalogue mWeb renders — held once in @duncit/i18n so
 * the two surfaces cannot drift apart (rule 27) — and compiled into this build,
 * so it still renders while the API is loading, when the device is offline, and
 * for any key an admin has not translated yet.
 *
 * Add a key to the shared bundle AND to Admin > Localization > Translations
 * BEFORE using it.
 */
// Same grievance and pod-product namespaces mWeb ships — one copy, two surfaces
// (rule 27). `podProduct.*` is also what the MUI picker resolves in the admin
// and Club Admin portals, so all four surfaces read the same sentences,
// `whatsappPreference.categories.*` is what the admin console names a scenario
// row with, and `policyAcceptance.*` is the signup gate both apps must word
// identically.
// `aiMonitoring.*` is the notice shown beside every upload control. It is its
// own namespace rather than an mweb.* key because the portals render the same
// sentences through @duncit/ai-monitoring/mui — three copies of them is exactly
// the drift rule 27 exists to stop.
export const NATIVE_FALLBACK: NestedCatalogue = {
  ...MWEB_BUNDLE,
  ...AI_MONITORING_BUNDLE,
  ...CONTENT_REPORT_BUNDLE,
  ...GRIEVANCE_BUNDLE,
  ...MAIL_PREFERENCE_BUNDLE,
  ...POD_PRODUCT_BUNDLE,
  ...POLICY_ACCEPTANCE_BUNDLE,
  ...VERIFICATION_BUNDLE,
  ...WHATSAPP_BUNDLE,
  ...WITHDRAW_BUNDLE,
};

/** Flat, runtime-ready form of the bundle above. */
export const NATIVE_FALLBACK_FLAT = flattenCatalogue(NATIVE_FALLBACK);

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
  fallback: NATIVE_FALLBACK_FLAT,
}).t;
