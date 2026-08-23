import {
  flattenCatalogue,
  SHELL_BUNDLE,
  useTranslation as useSharedTranslation,
} from '@duncit/app-settings';

/**
 * The confirm dialog's LOCAL FALLBACK bundle (CLAUDE.md rule 38).
 *
 * Only the two action words the dialog supplies when a caller names none; both
 * live under `shell.common.*` because every console repeats them (rule 40).
 */
export const DIALOGS_FALLBACK_FLAT = flattenCatalogue(SHELL_BUNDLE);

/** Translate inside the shared dialogs. */
export function useTranslation() {
  return useSharedTranslation(DIALOGS_FALLBACK_FLAT);
}
