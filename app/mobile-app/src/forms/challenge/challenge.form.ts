import { z } from 'zod';
import { CHALLENGE_CAPTION_MAX } from '@duncit/utils';

import type { JudgeCriterion, JudgeSheetValues, SubmissionValues } from './challenge.types';

/**
 * The challenge forms' schemas — the native twins of mWeb's judge-sheet,
 * create-challenge, roster and reason forms (rule 27). Same rules, same copy
 * keys; only the inputs differ. The server re-validates every one of them.
 */

type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

export const ROSTER_NAME_MAX = 60;
export const CHALLENGE_NAME_MAX = 80;
export const REASON_MAX = 300;

const isMark = (text: string, max: number) => {
  const n = Number(text);
  return text.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= max;
};

/** A judge's sheet for one competitor: every criterion marked within 0..max. */
export const makeJudgeSheetSchema = (t: Translate, criteria: JudgeCriterion[]) =>
  z.object({
    candidate_id: z.string().min(1, t('mweb.challenge.errors.pickCompetitor')),
    marks: z.object(
      Object.fromEntries(
        criteria.map((c) => [
          c.key,
          z
            .string()
            .refine(
              (text) => isMark(text, c.max),
              t('mweb.challenge.errors.mark', { vars: { max: c.max } }),
            ),
        ]),
      ),
    ),
  });

export const judgeSheetInitialValues = (
  candidateId: string,
  criteria: JudgeCriterion[],
): JudgeSheetValues => ({
  candidate_id: candidateId,
  marks: Object.fromEntries(criteria.map((c) => [c.key, ''])),
});

export const makeCreateChallengeSchema = (t: Translate) =>
  z.object({
    template_id: z.string().min(1, t('mweb.challenge.errors.template')),
    name: z.string().trim().max(CHALLENGE_NAME_MAX, t('mweb.challenge.errors.challengeName')),
  });

export const makeRosterSchema = (t: Translate) =>
  z.object({
    competitors: z
      .array(
        z.object({
          competitor_id: z.string(),
          name: z
            .string()
            .trim()
            .min(1, t('mweb.challenge.errors.name'))
            .max(ROSTER_NAME_MAX, t('mweb.challenge.errors.name')),
          user_id: z.string(),
        }),
      )
      .min(1, t('mweb.challenge.errors.noCompetitors')),
  });

/**
 * A competitor's piece: a picked file (its kind and size are checked when it is
 * picked, against the tool's settings and the upload caps) and an optional
 * caption. A host submitting on someone's behalf must also say for whom.
 */
export const makeSubmissionSchema = (t: Translate, pickCompetitor: boolean) =>
  z.object({
    file: z
      .object({ uri: z.string(), name: z.string(), type: z.string() })
      .nullable()
      .refine((file) => file !== null, t('mweb.challenge.tools.errors.file')),
    caption: z
      .string()
      .trim()
      .max(
        CHALLENGE_CAPTION_MAX,
        t('mweb.challenge.tools.errors.caption', { vars: { max: CHALLENGE_CAPTION_MAX } }),
      ),
    competitor_id: pickCompetitor
      ? z.string().min(1, t('mweb.challenge.errors.pickCompetitor'))
      : z.string(),
  });

export const SUBMISSION_INITIAL_VALUES: SubmissionValues = {
  file: null,
  caption: '',
  competitor_id: '',
};

/** Why a score is removed or a result corrected — kept in the audit trail. */
export const makeReasonSchema = (t: Translate, required: boolean) =>
  z.object({
    reason: required
      ? z
          .string()
          .trim()
          .min(3, t('mweb.challenge.errors.reason'))
          .max(REASON_MAX, t('mweb.challenge.errors.reasonLong'))
      : z.string().trim().max(REASON_MAX, t('mweb.challenge.errors.reasonLong')),
  });
