import { z } from 'zod';
import {
  AUTO_CHECKS,
  BAND_TONES,
  validateQualityConfig,
  withKeys,
  type QualityValidationMode,
} from '../../lib/generated/lead-quality-rules';
import { toConfigBody } from './lead-quality-config.convert';
import { formPath, issueMessage } from './lead-quality-config.issues';
import type { Translate } from './lead-quality-config.types';

/**
 * The scoring-model editor's values. Numbers are kept as the text the admin
 * typed ("12.5", "") so a half-typed value is never coerced; the conversion to
 * the API body happens in one place (`toConfigBody`). Keys stay hidden: the
 * server makes them from the names for new rows and evidence is stored against
 * the existing ones, so they ride along untouched.
 */
const subCriterionShape = z.object({
  key: z.string(),
  name: z.string(),
  points: z.string(),
  mandatory: z.boolean(),
  auto_check: z.enum(AUTO_CHECKS),
  threshold: z.string(),
  guidance: z.string(),
});

const criterionShape = z.object({
  key: z.string(),
  name: z.string(),
  weightage: z.string(),
  enabled: z.boolean(),
  mandatory: z.boolean(),
  auto_check: z.enum(AUTO_CHECKS),
  threshold: z.string(),
  guidance: z.string(),
  sub_criteria: z.array(subCriterionShape),
});

const bandShape = z.object({
  key: z.string(),
  label: z.string(),
  min: z.string(),
  tone: z.enum(BAND_TONES),
});

const formShape = z.object({
  criteria: z.array(criterionShape),
  /** On: `min_qualification_score` is sent as null (a lead qualifies on its mandatory gates alone). */
  qualify_on_gates: z.boolean(),
  min_qualification_score: z.string(),
  bands: z.array(bandShape),
  change_note: z.string(),
});

export type LeadQualityConfigFormValues = z.infer<typeof formShape>;
export type CriterionFormValues = LeadQualityConfigFormValues['criteria'][number];
export type SubCriterionFormValues = CriterionFormValues['sub_criteria'][number];
export type BandFormValues = LeadQualityConfigFormValues['bands'][number];

/**
 * Every rule comes from the generated copy of the server's validator — the
 * form refuses exactly what the API refuses, in either mode. Each issue lands
 * on the field its path names (a whole list's problem on that list's `root`).
 */
export const leadQualityConfigSchema = (t: Translate, mode: QualityValidationMode = 'DRAFT') =>
  formShape.superRefine((values, ctx) => {
    for (const issue of validateQualityConfig(withKeys(toConfigBody(values)), mode)) {
      ctx.addIssue({ code: 'custom', path: formPath(issue.path), message: issueMessage(t, issue) });
    }
  });

export const blankSubCriterion = (): SubCriterionFormValues => ({
  key: '',
  name: '',
  points: '0',
  mandatory: false,
  auto_check: 'NONE',
  threshold: '',
  guidance: '',
});

export const blankCriterion = (): CriterionFormValues => ({
  key: '',
  name: '',
  weightage: '0',
  enabled: true,
  mandatory: false,
  auto_check: 'NONE',
  threshold: '',
  guidance: '',
  sub_criteria: [],
});

export const blankBand = (): BandFormValues => ({ key: '', label: '', min: '', tone: 'warning' });
