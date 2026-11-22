import { z } from 'zod';
import { EMPLOYEE_TARGET_REMINDER_BOUNDS as B } from '@duncit/utils';
import type { TargetSettingsFormValues, TargetSettingsOutput, Translate } from './target-settings.types';

/** A whole number of days inside the server's range; the server clamps to the same numbers. */
const days = (t: Translate, { min, max }: { min: number; max: number }) =>
  z
    .string()
    .trim()
    .refine((raw) => {
      const n = Number(raw);
      return raw !== '' && Number.isInteger(n) && n >= min && n <= max;
    }, t('employeeTargets.settings.range', { vars: { min, max } }))
    .transform(Number);

export const targetSettingsSchema = (t: Translate) =>
  z.object({
    reminders_enabled: z.boolean(),
    reminder_days_before_end: days(t, B.daysBeforeEnd),
    reminder_grace_days: days(t, B.graceDays),
  });

export const toFormValues = (settings: TargetSettingsOutput): TargetSettingsFormValues => ({
  reminders_enabled: settings.reminders_enabled,
  reminder_days_before_end: String(settings.reminder_days_before_end),
  reminder_grace_days: String(settings.reminder_grace_days),
});
