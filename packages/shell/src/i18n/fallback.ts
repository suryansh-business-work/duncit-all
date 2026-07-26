import { flattenCatalogue, SHELL_BUNDLE, type NestedCatalogue } from '@duncit/i18n';

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
