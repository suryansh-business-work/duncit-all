import {
  AVAILABILITY_BUNDLE,
  createBundleTranslation,
  createTranslator,
  flattenCatalogue,
} from '@duncit/app-settings';

/**
 * The copy a new offer's ask shares with Create Pod on mWeb, the Partners pod
 * form and the app: `availability.offers.*` — what the host needs from the
 * venue, the note, the venue's minimum guests and the ask's validation. One
 * namespace on every surface (mWeb and the portals both mount it), so unlike
 * the dialog's `mweb.*` / `shell.*` labels it needs no per-surface builder: it
 * is read here straight from the surface's translator, with the bundled
 * English layered under it for a key the surface has never heard of.
 */
export const useAskTranslation = createBundleTranslation(AVAILABILITY_BUNDLE);

/** The same copy outside React — the resubmit schema's default wording. */
export const askFallbackT = createTranslator({ locale: 'en-IN', fallback: flattenCatalogue(AVAILABILITY_BUNDLE) }).t;
