import { z } from 'zod';
import { HR_EMPLOYEE_LIMITS as L, HR_JOB_CHANGE_REASONS, dateOfDayKey, dayKeyOf } from '@duncit/utils';
import { jobSchema } from '../../../fields/employee-fields.schema';
import type { Translate } from '../../../fields/employee-fields.types';

/** A job change: the new job, why, and the day it took effect (today or earlier — the server refuses later). */
export function jobChangeSchema(t: Translate, today: string = dayKeyOf(new Date())) {
  return z.object({
    job: jobSchema(t),
    reason: z.enum(HR_JOB_CHANGE_REASONS),
    effective_date: z
      .string()
      .refine((v) => dateOfDayKey(v) !== null, t('hrEmployee.form.dateInvalid'))
      .refine((v) => v <= today, t('hrEmployee.form.futureNotAllowed')),
    note: z
      .string()
      .trim()
      .max(L.noteMax, t('hrEmployee.form.tooLong', { vars: { max: L.noteMax } }))
      .transform((v) => v || null),
  });
}
