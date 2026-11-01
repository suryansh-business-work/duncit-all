import { z } from 'zod';
import { fallbackT, type Translate } from '@duncit/shell';
import { OUTREACH_LIMITS } from '../copy';
import type { MarketingLeadPipeline, MarketingLeadStage } from '../../leads-page/queries';
import type { OutreachLeadFilter, OutreachSequence } from '../queries';

/** Which leads to enroll: '' in a select takes any. */
export interface EnrollFormValues {
  pipeline: MarketingLeadPipeline | '';
  stage: MarketingLeadStage | '';
  city: string;
}

const PIPELINE_VALUES = ['', 'VENUE', 'HOST', 'BRAND', 'INFLUENCER', 'ADVERTISER', 'GENERAL'] as const;
const STAGE_VALUES = ['', 'NEW', 'CONTACTED', 'REPLIED', 'QUALIFIED'] as const;

/** The stages a lead can still be enrolled from — converted and lost leads are not taken. */
export const ENROLLABLE_STAGES: readonly MarketingLeadStage[] = ['NEW', 'CONTACTED', 'REPLIED', 'QUALIFIED'];

/** A sequence for one pipeline only takes that pipeline, so the filter starts there. */
export const blankEnrollValues = (sequence: OutreachSequence | null): EnrollFormValues => ({
  pipeline: sequence?.pipeline ?? '',
  stage: '',
  city: '',
});

export const enrollSchema = (t: Translate = fallbackT) =>
  z.object({
    pipeline: z.enum(PIPELINE_VALUES),
    stage: z.enum(STAGE_VALUES),
    city: z
      .string()
      .trim()
      .max(OUTREACH_LIMITS.city.max, t('marketing.outreach.tooLong', { vars: { max: String(OUTREACH_LIMITS.city.max) } })),
  });

/** The filter as the server takes it: an empty field narrows nothing. */
export const toLeadFilter = (values: EnrollFormValues): OutreachLeadFilter => ({
  pipeline: values.pipeline || null,
  stage: values.stage || null,
  city: values.city.trim() || null,
});

export interface EnrollFormProps {
  sequence: OutreachSequence;
  busy: boolean;
  /** Called with every change, so the dialog can show how many leads the filter takes now. */
  onFilterChange: (filter: OutreachLeadFilter) => void;
  onSubmit: (values: EnrollFormValues) => Promise<boolean>;
  onCancel: () => void;
  /** How many leads the current filter takes; null while it is being counted. */
  count: number | null;
  /** The count could not be read; the dialog shows why, and the form shows no number. */
  countFailed: boolean;
}
