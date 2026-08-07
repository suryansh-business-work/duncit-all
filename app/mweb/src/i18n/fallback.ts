import { flattenCatalogue, GRIEVANCE_BUNDLE, MWEB_BUNDLE, type NestedCatalogue } from '@duncit/app-settings';

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
// is its own namespace rather than a second copy inside mweb.*. The two
// namespaces are disjoint (`mweb` and `grievance`), so a shallow merge is the
// whole of it — no key can shadow another.
export const MWEB_FALLBACK: NestedCatalogue = { ...MWEB_BUNDLE, ...GRIEVANCE_BUNDLE };

/** Flat, runtime-ready form of the bundle above. */
export const MWEB_FALLBACK_FLAT = flattenCatalogue(MWEB_FALLBACK);
