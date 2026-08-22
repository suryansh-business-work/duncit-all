import { flattenCatalogue, STATUS_BUNDLE, type FlatCatalogue } from '@duncit/i18n';

/**
 * This surface's SHIPPED fallback catalogue (CLAUDE.md rule 38).
 *
 * Re-exported from the shared package rather than written here, so the copy the
 * Tech portal reads on a report and the copy the visitor typed it into are the
 * same words — and flattened at module load so the page renders real text
 * offline and before the Localization API answers.
 */
export const STATUS_FALLBACK: FlatCatalogue = flattenCatalogue(STATUS_BUNDLE);
