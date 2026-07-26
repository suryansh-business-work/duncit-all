import { flattenCatalogue, MWEB_BUNDLE, type NestedCatalogue } from '@duncit/i18n';

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
export const NATIVE_FALLBACK: NestedCatalogue = MWEB_BUNDLE;

/** Flat, runtime-ready form of the bundle above. */
export const NATIVE_FALLBACK_FLAT = flattenCatalogue(NATIVE_FALLBACK);
