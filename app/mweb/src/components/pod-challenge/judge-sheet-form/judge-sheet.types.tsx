import { z } from 'zod';

type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

export interface JudgeCriterion {
  key: string;
  label: string;
  max: number;
}

/** A judge's sheet for one competitor: every criterion marked within 0..max. */
export const buildJudgeSheetSchema = (t: Translate, criteria: JudgeCriterion[]) =>
  z.object({
    candidate_id: z.string().min(1, t('mweb.challenge.errors.pickCompetitor')),
    marks: z.object(
      Object.fromEntries(
        criteria.map((c) => [
          c.key,
          z
            .number({ error: t('mweb.challenge.errors.mark', { vars: { max: c.max } }) })
            .min(0, t('mweb.challenge.errors.mark', { vars: { max: c.max } }))
            .max(c.max, t('mweb.challenge.errors.mark', { vars: { max: c.max } })),
        ])
      )
    ),
  });

export interface JudgeSheetValues {
  candidate_id: string;
  marks: Record<string, number>;
}
