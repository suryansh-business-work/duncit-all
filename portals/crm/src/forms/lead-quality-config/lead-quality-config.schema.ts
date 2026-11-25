import {
  leadQualityEditor,
  type LeadQualityBandValues,
  type LeadQualityCriterionValues,
  type LeadQualityFormValues,
  type LeadQualitySubCriterionValues,
} from '@duncit/forms/schemas';
import * as rules from '../../lib/generated/lead-quality-rules';
import type { AutoCheck, BandTone, QualityValidationMode } from '../../lib/generated/lead-quality-rules';
import type { Translate } from './lead-quality-config.types';

/**
 * The scoring-model editor (shared with the Duncit CRM app in
 * `@duncit/forms/schemas`), bound to this console's generated copy of the
 * server rules — the form refuses exactly what the API refuses, in either mode.
 */
export const LEAD_QUALITY_EDITOR = leadQualityEditor(rules);

export type LeadQualityConfigFormValues = LeadQualityFormValues<AutoCheck, BandTone>;
export type CriterionFormValues = LeadQualityCriterionValues<AutoCheck>;
export type SubCriterionFormValues = LeadQualitySubCriterionValues<AutoCheck>;
export type BandFormValues = LeadQualityBandValues<BandTone>;

/** Each issue lands on the field its path names (a whole list's problem on that list's `root`). */
export const leadQualityConfigSchema = (t: Translate, mode: QualityValidationMode = 'DRAFT') => LEAD_QUALITY_EDITOR.schema(t, mode);

export const { blankSubCriterion, blankCriterion, blankBand } = LEAD_QUALITY_EDITOR;
