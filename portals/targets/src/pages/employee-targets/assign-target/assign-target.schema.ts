import { z } from 'zod';
import { EMPLOYEE_TARGET_LIMITS as L, dateOfMonthKey, monthKeyOf, type EmployeeTargetRecord } from '@duncit/utils';
import type { AssignTargetFormValues, GoalValues, Translate } from './assign-target.types';

const tooLong = (t: Translate, max: number) => t('employeeTargets.form.tooLong', { vars: { max } });

/** A blank figure is "no figure"; anything else must be a number from 0 to the server's ceiling. */
const figure = (raw: string): number | null | undefined => {
  const text = raw.trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 && n <= L.goalTargetMax ? n : undefined;
};

const goalSchema = (t: Translate) =>
  z
    .object({
      title: z.string().trim().min(1, t('employeeTargets.form.goalTitleRequired')).max(L.goalTitleMax, tooLong(t, L.goalTitleMax)),
      description: z.string().trim().max(L.goalDescriptionMax, tooLong(t, L.goalDescriptionMax)),
      target_value: z.string().refine((raw) => figure(raw) !== undefined, t('employeeTargets.form.goalTargetInvalid')),
      unit: z.string().trim().max(L.goalUnitMax, tooLong(t, L.goalUnitMax)),
    })
    .transform((goal) => ({ ...goal, target_value: figure(goal.target_value) ?? null }));

/**
 * Who, which month and the goals — the same limits the server enforces, so a
 * row it would refuse is caught here first. The employee and month are fixed
 * once a target exists; editing only changes the goals and notes.
 */
export const assignTargetSchema = (t: Translate) => {
  // Field-level checks, so every missing field is marked on the same submit.
  const employeeRequired = t('employeeTargets.form.employeeRequired');
  const monthRequired = t('employeeTargets.form.monthRequired');
  return z
    .object({
      employee: z
        .object({ id: z.string(), name: z.string(), email: z.string().nullish() })
        .nullable()
        .refine((employee) => employee !== null, employeeRequired),
      month: z
        .date({ error: monthRequired })
        .nullable()
        .refine((month) => month !== null, monthRequired),
      goals: z
        .array(goalSchema(t))
        .min(1, t('employeeTargets.form.goalsMin'))
        .max(L.goalsMax, t('employeeTargets.form.goalsMax', { vars: { max: L.goalsMax } })),
      notes: z.string().trim().max(L.notesMax, tooLong(t, L.notesMax)),
    })
    .transform((values) => ({
      employee_id: values.employee?.id ?? '',
      month: values.month ? monthKeyOf(values.month) : '',
      goals: values.goals,
      notes: values.notes,
    }));
};

export const EMPTY_GOAL: GoalValues = { title: '', description: '', target_value: '', unit: '' };

export const EMPTY_ASSIGN_VALUES: AssignTargetFormValues = { employee: null, month: null, goals: [EMPTY_GOAL], notes: '' };

/** The form seeded from a target being edited. */
export function valuesFromTarget(target: EmployeeTargetRecord): AssignTargetFormValues {
  return {
    employee: { id: target.employee.user_id, name: target.employee.name, email: target.employee.email },
    month: dateOfMonthKey(target.month),
    goals: target.goals.map((goal) => ({
      title: goal.title,
      description: goal.description,
      target_value: goal.target_value === null ? '' : String(goal.target_value),
      unit: goal.unit,
    })),
    notes: target.notes,
  };
}
