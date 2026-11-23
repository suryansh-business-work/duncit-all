import type { CrmLeadQualityConfigInput } from '@duncit/gql-types';
import type { LeadQualityConfig } from '../../api/leadQuality.gql';
import {
  BAND_TONES,
  THRESHOLD_CHECKS,
  type AutoCheck,
  type BandTone,
  type QualityConfigBody,
} from '../../lib/generated/lead-quality-rules';
import type { LeadQualityConfigFormValues } from './lead-quality-config.schema';

/**
 * The editor's text values ↔ the scoring-model body the rules check and the
 * API stores. Nothing is clamped or rounded: a value the rules refuse reaches
 * them as typed, so the field shows exactly why.
 */

/** Typed text as a number; blank is NaN (the rules then ask for a number) rather than a silent 0. */
export const toNumber = (text: string): number => (text.trim() === '' ? Number.NaN : Number(text));

/** Only the follower, recent-post and review checks carry a threshold; the field is hidden (and dropped) for the rest. */
const thresholdOf = (check: AutoCheck, text: string): number | null =>
  THRESHOLD_CHECKS.includes(check) && text.trim() !== '' ? Number(text) : null;

const asText = (value: number | null | undefined): string => (value === null || value === undefined ? '' : String(value));

/** The server stores only the three tones; anything else would be a value this build cannot show. */
const toneOf = (value: string): BandTone => BAND_TONES.find((tone) => tone === value) ?? 'error';

export function toConfigBody(values: LeadQualityConfigFormValues): QualityConfigBody {
  return {
    criteria: values.criteria.map((criterion) => ({
      key: criterion.key,
      name: criterion.name.trim(),
      weightage: toNumber(criterion.weightage),
      enabled: criterion.enabled,
      mandatory: criterion.mandatory,
      auto_check: criterion.auto_check,
      threshold: thresholdOf(criterion.auto_check, criterion.threshold),
      guidance: criterion.guidance.trim(),
      sub_criteria: criterion.sub_criteria.map((sub) => ({
        key: sub.key,
        name: sub.name.trim(),
        points: toNumber(sub.points),
        mandatory: sub.mandatory,
        auto_check: sub.auto_check,
        threshold: thresholdOf(sub.auto_check, sub.threshold),
        guidance: sub.guidance.trim(),
      })),
    })),
    min_qualification_score: values.qualify_on_gates ? null : toNumber(values.min_qualification_score),
    bands: values.bands.map((band) => ({ key: band.key, label: band.label.trim(), min: toNumber(band.min), tone: band.tone })),
  };
}

/** A row's key only when it has one: new rows get theirs from the server, made from the name. */
function withOptionalKey<T extends { key: string }>(item: T): Omit<T, 'key'> & { key?: string } {
  const { key, ...rest } = item;
  return key ? { ...rest, key } : rest;
}

/** The exact `CrmLeadQualityConfigInput` Save draft sends. */
export function toConfigInput(values: LeadQualityConfigFormValues): CrmLeadQualityConfigInput {
  const body = toConfigBody(values);
  return {
    criteria: body.criteria.map(({ sub_criteria, ...criterion }) => ({
      ...withOptionalKey(criterion),
      sub_criteria: sub_criteria.map(withOptionalKey),
    })),
    min_qualification_score: body.min_qualification_score,
    bands: body.bands.map(withOptionalKey),
  };
}

/** A stored version as editor values. A draft keeps its change note; a published version starts a fresh one. */
export function valuesFromConfig(config: LeadQualityConfig): LeadQualityConfigFormValues {
  return {
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
  };
}
