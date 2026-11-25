import { z } from 'zod';
import { addDays, addHours } from 'date-fns';

import type { Translate } from '@/i18n/fallback';

export const REMINDER_TITLE_MAX = 200;
export const REMINDER_NOTES_MAX = 2000;

/** When a reminder from the phone is due, relative to now — the choices a thumb can make in one tap. */
export const DUE_CHOICES = ['hour', 'threeHours', 'tomorrow', 'threeDays', 'week'] as const;
export type DueChoice = (typeof DUE_CHOICES)[number];

export function dueAt(choice: DueChoice, now: Date = new Date()): Date {
  switch (choice) {
    case 'hour':
      return addHours(now, 1);
    case 'threeHours':
      return addHours(now, 3);
    case 'tomorrow':
      return addDays(now, 1);
    case 'threeDays':
      return addDays(now, 3);
    case 'week':
      return addDays(now, 7);
  }
}

/** A due time picked on the calendar instead of a quick choice. */
export const CUSTOM_DUE = 'custom';

export const makeReminderSchema = (t: Translate) =>
  z
    .object({
      title: z
        .string()
        .trim()
        .min(1, t('crmApp.reminder.titleRequired'))
        .max(REMINDER_TITLE_MAX, t('crmApp.note.tooLong', { vars: { max: REMINDER_TITLE_MAX } })),
      due: z.enum([...DUE_CHOICES, CUSTOM_DUE], { error: t('crmApp.reminder.dueRequired') }),
      /** The picked date and time, when the due choice is custom. */
      at: z.date().nullable().optional(),
      notes: z
        .string()
        .trim()
        .max(REMINDER_NOTES_MAX, t('crmApp.note.tooLong', { vars: { max: REMINDER_NOTES_MAX } })),
    })
    .refine((v) => v.due !== CUSTOM_DUE || Boolean(v.at), {
      path: ['at'],
      message: t('crm.components.pickAValidDueDateAnd'),
    });

export type ReminderValues = z.infer<ReturnType<typeof makeReminderSchema>>;

export const reminderDefaults: ReminderValues = { title: '', due: 'tomorrow', at: null, notes: '' };

/** When the reminder is due: the picked date and time, or the quick choice from now. */
export function reminderDueDate(
  values: Pick<ReminderValues, 'due' | 'at'>,
  now: Date = new Date(),
): Date {
  if (values.due === CUSTOM_DUE) return values.at ?? now;
  return dueAt(values.due, now);
}
