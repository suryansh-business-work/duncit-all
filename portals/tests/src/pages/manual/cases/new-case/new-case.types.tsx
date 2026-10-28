import { z } from 'zod';
import type { ManualTestCaseInput } from '@duncit/gql-types';
import type { Translate } from '@duncit/shell';
import { titleRule } from '../../shared/caseRules';
import { CASE_TYPES, ENVIRONMENTS, PRIORITIES } from '../../shared/vocabulary';

/**
 * What a new case starts with. Everything else — the rich-text sections, the
 * steps, labels, dates — is written on the case's own page once it exists.
 * Empty pick-list values mean "not set" (and for the column, the board's first).
 */
export const newCaseSchema = (t: Translate) =>
  z.object({
    title: titleRule(t),
    type: z.enum(CASE_TYPES),
    priority: z.enum(PRIORITIES),
    column_id: z.string(),
    assignee_id: z.string(),
    surface: z.string(),
    environment: z.enum(ENVIRONMENTS),
  });

export type NewCaseValues = z.infer<ReturnType<typeof newCaseSchema>>;

export const BLANK_NEW_CASE: NewCaseValues = {
  title: '',
  type: 'TEST_CASE',
  priority: 'MEDIUM',
  column_id: '',
  assignee_id: '',
  surface: '',
  environment: 'STAGING',
};

export const toCreateInput = (values: NewCaseValues): ManualTestCaseInput => ({
  title: values.title,
  type: values.type,
  priority: values.priority,
  environment: values.environment,
  column_id: values.column_id || null,
  assignee_id: values.assignee_id || null,
  surface: values.surface || null,
});
