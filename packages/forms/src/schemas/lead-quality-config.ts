import { z } from 'zod';

import { leadQualityFormPath, leadQualityIssueMessage, type LeadQualityIssueLike } from './lead-quality-issues';
import type { Translate } from './translate';

/**
 * CRM › Settings › Lead Quality Score — one lead type's scoring-model editor
 * (criteria, sub-criteria, the qualification rule and the classification
 * bands), shared by the CRM portal and the Duncit CRM app.
 *
 * The rules are the server's (`leadQuality.rules.ts`). Each client holds a
 * GENERATED copy of them and binds it here with `leadQualityEditor(rules)`, so
 * the form refuses exactly what the API refuses. Numbers are kept as the text
 * the admin typed ("12.5", "") so a half-typed value is never coerced; keys
 * stay hidden (the server makes them from the names for new rows, and
 * evidence is stored against the existing ones, so they ride along untouched).
 */

export type LeadQualityMode = 'DRAFT' | 'PUBLISH';

type ItemBody<C extends string> = {
  key: string;
  name: string;
  mandatory: boolean;
  auto_check: C;
  threshold: number | null;
  guidance: string;
};

/** The scoring-model body the rules check and the API stores. */
export type LeadQualityBody<C extends string = string, T extends string = string> = {
  criteria: Array<ItemBody<C> & { weightage: number; enabled: boolean; sub_criteria: Array<ItemBody<C> & { points: number }> }>;
  /** Null: a lead qualifies on its mandatory gates alone. */
  min_qualification_score: number | null;
  bands: Array<{ key: string; label: string; min: number; tone: T }>;
};

/** What the editor needs from a client's generated copy of the server rules (pass the module itself). */
export interface LeadQualityRules<C extends string, T extends string, I extends LeadQualityIssueLike = LeadQualityIssueLike> {
  /** Every automatic check; the first is NONE (a person records the evidence). */
  readonly AUTO_CHECKS: readonly [none: C, ...rest: C[]];
  /** Green, yellow and red, in that order. */
  readonly BAND_TONES: readonly [success: T, warning: T, error: T];
  /** The checks that compare against a number the admin sets. */
  readonly THRESHOLD_CHECKS: readonly C[];
  withKeys(body: LeadQualityBody<C, T>): LeadQualityBody<C, T>;
  validateQualityConfig(body: LeadQualityBody<C, T>, mode: LeadQualityMode): I[];
}

type ItemValues<C extends string> = {
  key: string;
  name: string;
  mandatory: boolean;
  auto_check: C;
  threshold: string;
  guidance: string;
};
export type LeadQualitySubCriterionValues<C extends string = string> = ItemValues<C> & { points: string };
export type LeadQualityCriterionValues<C extends string = string> = ItemValues<C> & {
  weightage: string;
  enabled: boolean;
  sub_criteria: LeadQualitySubCriterionValues<C>[];
};
export type LeadQualityBandValues<T extends string = string> = { key: string; label: string; min: string; tone: T };

/** The editor's values. */
export type LeadQualityFormValues<C extends string = string, T extends string = string> = {
  criteria: LeadQualityCriterionValues<C>[];
  /** On: `min_qualification_score` is sent as null (a lead qualifies on its mandatory gates alone). */
  qualify_on_gates: boolean;
  min_qualification_score: string;
  bands: LeadQualityBandValues<T>[];
  change_note: string;
};

type StoredItem<C extends string> = Omit<ItemBody<C>, 'threshold'> & { threshold?: number | null };

/** A stored version as the API returns it (only the fields the editor reads). */
export type LeadQualityStoredConfig<C extends string = string> = {
  status: string;
  change_note: string;
  min_qualification_score?: number | null;
  criteria: Array<StoredItem<C> & { weightage: number; enabled: boolean; sub_criteria: Array<StoredItem<C> & { points: number }> }>;
  bands: Array<{ key: string; label: string; min: number; tone: string }>;
};

type InputItem<C extends string> = Omit<ItemBody<C>, 'key'> & { key?: string };

/** The exact `CrmLeadQualityConfigInput` Save draft sends. */
export type LeadQualityConfigInput<C extends string = string, T extends string = string> = {
  criteria: Array<InputItem<C> & { weightage: number; enabled: boolean; sub_criteria: Array<InputItem<C> & { points: number }> }>;
  min_qualification_score: number | null;
  bands: Array<{ key?: string; label: string; min: number; tone: T }>;
};

/** Typed text as a number; blank is NaN (the rules then ask for a number) rather than a silent 0. */
export const leadQualityNumber = (text: string): number => (text.trim() === '' ? Number.NaN : Number(text));

const asText = (value: number | null | undefined): string => (value === null || value === undefined ? '' : String(value));

/** A row's key only when it has one: new rows get theirs from the server, made from the name. */
function withOptionalKey<R extends { key: string }>(row: R): Omit<R, 'key'> & { key?: string } {
  const { key, ...rest } = row;
  return key ? { ...rest, key } : rest;
}

/** One of the listed values (the pickers only offer those; anything else is refused). */
const member = <V extends string>(values: readonly V[]) => z.custom<V>((value) => values.some((listed) => listed === value));

/**
 * The editor bound to one client's generated rules: the Zod schema, the
 * conversions between the typed text and the API body, the live check and the
 * blank rows. Nothing is clamped or rounded: a value the rules refuse reaches
 * them as typed, so the field shows exactly why.
 */
export function leadQualityEditor<C extends string, T extends string, I extends LeadQualityIssueLike>(rules: LeadQualityRules<C, T, I>) {
  const [none] = rules.AUTO_CHECKS;
  const [, warning, error] = rules.BAND_TONES;

  /** Only the threshold checks carry a threshold; the field is hidden (and dropped) for the rest. */
  const thresholdOf = (check: C, text: string): number | null =>
    rules.THRESHOLD_CHECKS.includes(check) && text.trim() !== '' ? Number(text) : null;
  /** The server stores only the listed tones; anything else shows as red. */
  const toneOf = (value: string): T => rules.BAND_TONES.find((tone) => tone === value) ?? error;

  const toBody = (values: LeadQualityFormValues<C, T>): LeadQualityBody<C, T> => ({
    criteria: values.criteria.map((criterion) => ({
      key: criterion.key,
      name: criterion.name.trim(),
      weightage: leadQualityNumber(criterion.weightage),
      enabled: criterion.enabled,
      mandatory: criterion.mandatory,
      auto_check: criterion.auto_check,
      threshold: thresholdOf(criterion.auto_check, criterion.threshold),
      guidance: criterion.guidance.trim(),
      sub_criteria: criterion.sub_criteria.map((sub) => ({
        key: sub.key,
        name: sub.name.trim(),
        points: leadQualityNumber(sub.points),
        mandatory: sub.mandatory,
        auto_check: sub.auto_check,
        threshold: thresholdOf(sub.auto_check, sub.threshold),
        guidance: sub.guidance.trim(),
      })),
    })),
    min_qualification_score: values.qualify_on_gates ? null : leadQualityNumber(values.min_qualification_score),
    bands: values.bands.map((band) => ({ key: band.key, label: band.label.trim(), min: leadQualityNumber(band.min), tone: band.tone })),
  });

  const toInput = (values: LeadQualityFormValues<C, T>): LeadQualityConfigInput<C, T> => {
    const body = toBody(values);
    return {
      criteria: body.criteria.map(({ sub_criteria, ...criterion }) => ({
        ...withOptionalKey(criterion),
        sub_criteria: sub_criteria.map(withOptionalKey),
      })),
      min_qualification_score: body.min_qualification_score,
      bands: body.bands.map(withOptionalKey),
    };
  };

  /** A stored version as editor values. A draft keeps its change note; a published version starts a fresh one. */
  const fromConfig = (config: LeadQualityStoredConfig<C>): LeadQualityFormValues<C, T> => ({
    criteria: config.criteria.map((criterion) => ({
      key: criterion.key,
      name: criterion.name,
      weightage: asText(criterion.weightage),
      enabled: criterion.enabled,
      mandatory: criterion.mandatory,
      auto_check: criterion.auto_check,
      threshold: asText(criterion.threshold),
      guidance: criterion.guidance,
      sub_criteria: criterion.sub_criteria.map((sub) => ({
        key: sub.key,
        name: sub.name,
        points: asText(sub.points),
        mandatory: sub.mandatory,
        auto_check: sub.auto_check,
        threshold: asText(sub.threshold),
        guidance: sub.guidance,
      })),
    })),
    qualify_on_gates: config.min_qualification_score === null || config.min_qualification_score === undefined,
    min_qualification_score: asText(config.min_qualification_score),
    bands: config.bands.map((band) => ({ key: band.key, label: band.label, min: asText(band.min), tone: toneOf(band.tone) })),
    change_note: config.status === 'DRAFT' ? config.change_note : '',
  });

  /** Everything the rules find in the current values (PUBLISH: a superset of what a draft save refuses). */
  const liveIssues = (values: LeadQualityFormValues<C, T>, mode: LeadQualityMode): I[] =>
    rules.validateQualityConfig(rules.withKeys(toBody(values)), mode);

  const item = { key: z.string(), name: z.string(), mandatory: z.boolean(), auto_check: member(rules.AUTO_CHECKS), threshold: z.string(), guidance: z.string() };
  const shape = z.object({
    criteria: z.array(
      z.object({ ...item, weightage: z.string(), enabled: z.boolean(), sub_criteria: z.array(z.object({ ...item, points: z.string() })) }),
    ),
    qualify_on_gates: z.boolean(),
    min_qualification_score: z.string(),
    bands: z.array(z.object({ key: z.string(), label: z.string(), min: z.string(), tone: member(rules.BAND_TONES) })),
    change_note: z.string(),
  });

  /**
   * Every rule comes from the generated rules, in either mode (DRAFT: never
   * over 100%; PUBLISH: exactly 100%, every criterion's sub-criteria adding up
   * to it). Each problem lands on the field its path names.
   */
  const schema = (t: Translate, mode: LeadQualityMode) =>
    shape.superRefine((values, ctx) => {
      for (const issue of liveIssues(values, mode)) {
        ctx.addIssue({ code: 'custom', path: leadQualityFormPath(issue.path), message: leadQualityIssueMessage(t, issue) });
      }
    });

  const blankSubCriterion = (): LeadQualitySubCriterionValues<C> => ({
    key: '',
    name: '',
    points: '0',
    mandatory: false,
    auto_check: none,
    threshold: '',
    guidance: '',
  });
  const blankCriterion = (): LeadQualityCriterionValues<C> => ({
    key: '',
    name: '',
    weightage: '0',
    enabled: true,
    mandatory: false,
    auto_check: none,
    threshold: '',
    guidance: '',
    sub_criteria: [],
  });
  const blankBand = (): LeadQualityBandValues<T> => ({ key: '', label: '', min: '', tone: warning });

  return { schema, toBody, toInput, fromConfig, liveIssues, blankCriterion, blankSubCriterion, blankBand };
}

/** The bound editor's API, for a client that names its type. */
export type LeadQualityEditor<C extends string, T extends string, I extends LeadQualityIssueLike = LeadQualityIssueLike> = ReturnType<
  typeof leadQualityEditor<C, T, I>
>;
