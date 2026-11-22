import { z } from 'zod';
import { EMPLOYEE_TARGET_LIMITS as L, type EmployeeTargetRecord } from '@duncit/utils';
import type { AchievementValues, SubmitTargetFormValues, Translate } from './submit-target.types';

const tooLong = (t: Translate, max: number) => t('employeeTargets.form.tooLong', { vars: { max } });

/**
 * The report: a whole percent from 0 to 100, at least one achievement with a
 * title, and optional updates — the same limits the server enforces, so a
 * report it would refuse is caught here first.
 */
export const submitTargetSchema = (t: Translate) => {
  const percent = t('employeeTargets.submitForm.percentInvalid');
  return z.object({
    completion_percent: z.number({ error: percent }).int(percent).min(0, percent).max(100, percent),
    achievements: z
      .array(
        z.object({
          title: z
            .string()
            .trim()
            .min(1, t('employeeTargets.submitForm.achievementTitleRequired'))
            .max(L.achievementTitleMax, tooLong(t, L.achievementTitleMax)),
          details: z.string().trim().max(L.achievementDetailsMax, tooLong(t, L.achievementDetailsMax)),
        })
      )
      .min(1, t('employeeTargets.submitForm.achievementsMin'))
      .max(L.achievementsMax, t('employeeTargets.submitForm.achievementsMax', { vars: { max: L.achievementsMax } })),
    updates: z.string().trim().max(L.updatesMax, tooLong(t, L.updatesMax)),
  }) satisfies z.ZodType<SubmitTargetFormValues, SubmitTargetFormValues>;
};

export const EMPTY_ACHIEVEMENT: AchievementValues = { title: '', details: '' };

/** A fresh report, or the earlier one to correct. */
export function valuesFromTarget(target: EmployeeTargetRecord): SubmitTargetFormValues {
  const { submission } = target;
  if (!submission) return { completion_percent: 0, achievements: [{ ...EMPTY_ACHIEVEMENT }], updates: '' };
  return {
    completion_percent: submission.completion_percent,
    achievements: submission.achievements.map((a) => ({ title: a.title, details: a.details })),
    updates: submission.updates,
  };
}
