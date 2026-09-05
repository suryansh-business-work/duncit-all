import { createBundleTranslation, SHELL_BUNDLE } from '@duncit/app-settings';

/**
 * The confirm dialog's LOCAL FALLBACK bundle (CLAUDE.md rule 38).
 *
 * Only the two action words the dialog supplies when a caller names none; both
 * live under `shell.common.*` because every console repeats them (rule 40).
 *
 * Bound with `createBundleTranslation` rather than the shared hook: these
 * dialogs also render on surfaces that never mount the shell bundle — mWeb
 * ships `mweb.*` and its packages' namespaces, not `shell.*` — and inside a
 * LocaleProvider the shared hook returns the PROVIDER's translator and ignores
 * the fallback handed to it. Without the layering the buttons on those surfaces
 * read `shell.common.confirm` until an admin happens to import the key.
 */
export const useTranslation = createBundleTranslation(SHELL_BUNDLE);
