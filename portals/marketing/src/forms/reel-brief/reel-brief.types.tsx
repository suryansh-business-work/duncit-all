import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import { valuesOf } from '../../pages/reels/editor/labels';
import { REEL_LENGTHS_S, TONE_LABEL, type ReelLengthS, type ReelTone } from '../../pages/reels/studio/create/voices';

/** A brief is a few lines, not a script — the ideas step writes the rest. */
export const MAX_TOPIC_LENGTH = 300;
export const MAX_AUDIENCE_LENGTH = 200;

/** The length, as the select carries it: a string, so the option and the value compare as equals. */
export type ReelLengthValue = `${ReelLengthS}`;

const LENGTH_VALUES = REEL_LENGTHS_S.map(String) as [ReelLengthValue, ...ReelLengthValue[]];

/** What the ideas are asked for: the subject, who it is for, how it should feel, and how long. */
export const buildReelBriefSchema = (t: Translate) =>
  z.object({
    topic: z
      .string()
      .trim()
      .min(1, t('ai.reels.create.topicRequired'))
      .max(MAX_TOPIC_LENGTH, t('ai.reels.create.topicMax', { vars: { max: MAX_TOPIC_LENGTH } })),
    audience: z.string().trim().max(MAX_AUDIENCE_LENGTH, t('ai.reels.create.audienceMax', { vars: { max: MAX_AUDIENCE_LENGTH } })),
    tone: z.enum(valuesOf(TONE_LABEL)),
    length_s: z.enum(LENGTH_VALUES),
  });

export interface ReelBriefFormValues {
  topic: string;
  audience: string;
  tone: ReelTone;
  length_s: ReelLengthValue;
}

export const reelBriefInitialValues: ReelBriefFormValues = { topic: '', audience: '', tone: 'ENERGETIC', length_s: '30' };

/** The length in seconds, as the script step is asked for it. */
export const briefLengthSeconds = (values: Pick<ReelBriefFormValues, 'length_s'>): number => Number(values.length_s);

export interface ReelBriefFormProps {
  /** The brief as last submitted, so going back to it does not lose it. */
  initialValues?: ReelBriefFormValues;
  submitting: boolean;
  onSubmit: (values: ReelBriefFormValues) => void;
}
