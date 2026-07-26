import { flattenCatalogue, MWEB_BUNDLE, type NestedCatalogue } from '@duncit/app-settings';

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
export const MWEB_FALLBACK: NestedCatalogue = MWEB_BUNDLE;

/** Flat, runtime-ready form of the bundle above. */
export const MWEB_FALLBACK_FLAT = flattenCatalogue(MWEB_FALLBACK);
