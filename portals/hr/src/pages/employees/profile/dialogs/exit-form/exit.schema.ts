import { z } from 'zod';
import { HR_EMPLOYEE_LIMITS as L, HR_EXIT_TYPES, dateOfDayKey } from '@duncit/utils';
import type { Translate } from '../../../fields/employee-fields.types';

const isDay = (v: string) => dateOfDayKey(v) !== null;

/** An exit: the type, the dates (the last day never before joining or the resignation), why, and rehire eligibility. */
export function exitSchema(t: Translate, dateOfJoining: string) {
  return z
    .object({
      exit_type: z.enum(HR_EXIT_TYPES),
      resignation_date: z.string().refine((v) => !v || isDay(v), t('hrEmployee.form.dateInvalid')),
      last_working_day: z.string().refine(isDay, t('hrEmployee.form.dateInvalid')),
      reason: z.string().trim().max(L.noteMax, t('hrEmployee.form.tooLong', { vars: { max: L.noteMax } })),
      eligible_for_rehire: z.boolean(),
    })
    .superRefine((v, ctx) => {
      if (v.resignation_date && v.last_working_day && v.last_working_day < v.resignation_date) {
        ctx.addIssue({ code: 'custom', path: ['last_working_day'], message: t('hrEmployee.form.lastDayBeforeResignation') });
      }
      if (v.last_working_day && v.last_working_day < dateOfJoining) {
        ctx.addIssue({ code: 'custom', path: ['last_working_day'], message: t('hrEmployee.form.lastDayBeforeJoining') });
      }
    })
    .transform((v) => ({ ...v, resignation_date: v.resignation_date || null, reason: v.reason || null }));
}
