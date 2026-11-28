import { z } from 'zod';
import { HR_EMPLOYEE_LIMITS as L } from '@duncit/utils';
import { jobSchema } from '../../../fields/employee-fields.schema';
import type { Translate } from '../../../fields/employee-fields.types';

/** A rehire: the new job (joining after the last working day) and a note. */
export function rehireSchema(t: Translate, lastWorkingDay: string | null) {
  return z
    .object({
      job: jobSchema(t),
      note: z.string().trim().max(L.noteMax, t('hrEmployee.form.tooLong', { vars: { max: L.noteMax } })),
    })
    .superRefine((v, ctx) => {
      if (lastWorkingDay && v.job.date_of_joining <= lastWorkingDay) {
        ctx.addIssue({ code: 'custom', path: ['job', 'date_of_joining'], message: t('hrEmployee.form.rejoinAfterExit') });
      }
    })
    .transform((v) => ({ job: v.job, note: v.note || null }));
}
