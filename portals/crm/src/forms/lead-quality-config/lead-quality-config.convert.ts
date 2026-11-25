import { leadQualityNumber } from '@duncit/forms/schemas';
import { LEAD_QUALITY_EDITOR } from './lead-quality-config.schema';

/**
 * The editor's text values ↔ the scoring-model body the rules check and the
 * API stores (shared with the Duncit CRM app in `@duncit/forms/schemas`).
 * Nothing is clamped or rounded: a value the rules refuse reaches them as
 * typed, so the field shows exactly why.
 */

/** Typed text as a number; blank is NaN (the rules then ask for a number) rather than a silent 0. */
export const toNumber = leadQualityNumber;

export const { toBody: toConfigBody, toInput: toConfigInput, fromConfig: valuesFromConfig } = LEAD_QUALITY_EDITOR;
