import { z } from 'zod';
import type { ManualTestCaseInput } from '@duncit/gql-types';
import type { Translate } from '@duncit/shell';
import { numberOrNull, wholeNumberRule } from '../../shared/caseRules';
import { CASE_TYPES, ENVIRONMENTS, MANUAL_LIMITS, PRIORITIES } from '../../shared/vocabulary';
import type { ManualCase } from '../../shared/types';

/**
 * The side panel of a case: where it sits, who has it, what it is about.
 * Pick lists hold '' for "not set"; numbers are kept as the typed text.
 */
export const caseDetailsSchema = (t: Translate) =>
  z.object({
    column_id: z.string().min(1, t('testsManual.validation.statusRequired')),
    assignee_id: z.string(),
    reporter_id: z.string(),
    type: z.enum(CASE_TYPES),
    priority: z.enum(PRIORITIES),
    environment: z.enum(ENVIRONMENTS),
    surface: z.string(),
    labels: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(MANUAL_LIMITS.labelMax, t('testsManual.validation.labelLength', { vars: { max: MANUAL_LIMITS.labelMax } }))
      )
      .max(MANUAL_LIMITS.labelsMax, t('testsManual.validation.labelsTooMany', { vars: { max: MANUAL_LIMITS.labelsMax } })),
    due_date: z.string(),
    estimate_minutes: wholeNumberRule(
      1,
      MANUAL_LIMITS.estimateMax,
      t('testsManual.validation.estimate', { vars: { max: MANUAL_LIMITS.estimateMax } })
    ),
    e2e_flow_id: z.string(),
    e2e_sub_flow_id: z.string(),
  });

export type CaseDetailsValues = z.infer<ReturnType<typeof caseDetailsSchema>>;

export const detailsOf = (record: ManualCase): CaseDetailsValues => ({
  column_id: record.column_id,
  assignee_id: record.assignee_id ?? '',
  reporter_id: record.reporter_id ?? '',
  type: record.type,
  priority: record.priority,
  environment: record.environment,
  surface: record.surface,
  labels: [...record.labels],
  due_date: record.due_date ?? '',
  estimate_minutes: typeof record.estimate_minutes === 'number' ? String(record.estimate_minutes) : '',
  e2e_flow_id: record.e2e_flow?.id ?? '',
  e2e_sub_flow_id: record.e2e_sub_flow?.id ?? '',
});

/**
 * Only the fields the person changed, as the API takes them — so saving the
 * panel never rewrites a field someone else just changed. A new flow always
 * carries its sub flow choice with it.
 */
export function toDetailsInput(values: CaseDetailsValues, dirty: readonly string[]): ManualTestCaseInput {
  const full: ManualTestCaseInput = {
    column_id: values.column_id,
    assignee_id: values.assignee_id || null,
    reporter_id: values.reporter_id || null,
    type: values.type,
    priority: values.priority,
    environment: values.environment,
    surface: values.surface,
    labels: values.labels,
    due_date: values.due_date || null,
    estimate_minutes: numberOrNull(values.estimate_minutes),
    e2e_flow_id: values.e2e_flow_id || null,
    e2e_sub_flow_id: values.e2e_sub_flow_id || null,
  };
  const keys = new Set(dirty);
  if (keys.has('e2e_flow_id')) keys.add('e2e_sub_flow_id');
  const input: ManualTestCaseInput = {};
  for (const [key, value] of Object.entries(full)) {
    if (keys.has(key)) Reflect.set(input, key, value);
  }
  return input;
}
