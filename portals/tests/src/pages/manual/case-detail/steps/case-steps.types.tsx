import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import { MANUAL_LIMITS } from '../../shared/vocabulary';

/** The ordered steps of a case: what the tester does, and what should happen. */
export const caseStepsSchema = (t: Translate) => {
  const tooLong = t('testsManual.validation.tooLong', { vars: { max: MANUAL_LIMITS.stepTextMax } });
  return z.object({
    steps: z
      .array(
        z.object({
          action: z
            .string()
            .trim()
            .min(1, t('testsManual.validation.actionRequired'))
            .max(MANUAL_LIMITS.stepTextMax, tooLong),
          expected: z.string().trim().max(MANUAL_LIMITS.stepTextMax, tooLong),
        })
      )
      .max(MANUAL_LIMITS.stepsMax, t('testsManual.validation.stepsTooMany', { vars: { max: MANUAL_LIMITS.stepsMax } })),
  });
};

export type CaseStepsValues = z.infer<ReturnType<typeof caseStepsSchema>>;

export const BLANK_STEP: CaseStepsValues['steps'][number] = { action: '', expected: '' };
