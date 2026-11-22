import type { MockedResponse } from '@apollo/client/testing';
import type { EmployeeTargetRecord } from '@duncit/utils';
import {
  MY_DUE_EMPLOYEE_TARGETS,
  MY_EMPLOYEE_TARGET,
  MY_EMPLOYEE_TARGETS_TABLE,
  SUBMIT_EMPLOYEE_TARGET,
} from '../../src/pages/targets/queries';

/**
 * Monthly-target mocks: the employee's own months, the reminder banner's due
 * list and the submit mutation. Every object carries `__typename`, exactly as
 * EMPLOYEE_TARGET_SELECTION reads it back.
 */
const ISO = '2026-11-29T06:00:00.000Z';

type Typed<T> = T & { __typename: string };

export const makeTarget = (over: Partial<EmployeeTargetRecord> = {}): Typed<EmployeeTargetRecord> => ({
  __typename: 'EmployeeTarget',
  id: 'tgt-1',
  employee: { __typename: 'EmployeeTargetPerson', user_id: 'emp-1', name: 'Priya Rao', email: 'priya@duncit.com' } as Typed<
    EmployeeTargetRecord['employee']
  >,
  month: '2026-11',
  goals: [
    { __typename: 'EmployeeTargetGoal', title: 'Onboard venues', description: 'Bengaluru east', target_value: 40, unit: 'venues' },
    { __typename: 'EmployeeTargetGoal', title: 'Run pods', description: '', target_value: null, unit: '' },
  ] as EmployeeTargetRecord['goals'],
  goal_count: 2,
  notes: 'Focus on weekends',
  status: 'ASSIGNED',
  submission: null,
  review: null,
  reminder_active: false,
  revision: 0,
  assigned_by: { __typename: 'EmployeeTargetPerson', user_id: 'adm-1', name: 'Asha Planner' } as EmployeeTargetRecord['assigned_by'],
  created_at: ISO,
  updated_at: ISO,
  ...over,
});

export const makeSubmission = (
  over: Partial<NonNullable<EmployeeTargetRecord['submission']>> = {}
): NonNullable<EmployeeTargetRecord['submission']> =>
  ({
    __typename: 'EmployeeTargetSubmission',
    completion_percent: 80,
    achievements: [{ __typename: 'EmployeeTargetAchievement', title: 'Signed 32 venues', details: 'Indiranagar and HSR' }],
    updates: 'Two more in legal review',
    submitted_at: ISO,
    submission_count: 1,
    ...over,
  }) as NonNullable<EmployeeTargetRecord['submission']>;

export const makeReview = (comment = 'Great month'): NonNullable<EmployeeTargetRecord['review']> =>
  ({
    __typename: 'EmployeeTargetReview',
    comment,
    reviewed_by: { __typename: 'EmployeeTargetPerson', user_id: 'adm-1', name: 'Asha Planner' },
    reviewed_at: ISO,
  }) as NonNullable<EmployeeTargetRecord['review']>;

export const myTargetsTableMock = (rows: EmployeeTargetRecord[] = [makeTarget()]): MockedResponse => ({
  request: { query: MY_EMPLOYEE_TARGETS_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { myEmployeeTargetsTable: { __typename: 'EmployeeTargetTablePage', total: rows.length, rows } } },
});

export const myDueTargetsMock = (due: Array<{ id: string; month: string }> = []): MockedResponse => ({
  request: { query: MY_DUE_EMPLOYEE_TARGETS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { myDueEmployeeTargets: due.map((row) => ({ __typename: 'EmployeeTarget', ...row })) } },
});

export const myTargetMock = (target: EmployeeTargetRecord | null, id = 'tgt-1', usage = 1): MockedResponse => ({
  request: { query: MY_EMPLOYEE_TARGET, variables: { id } },
  maxUsageCount: usage,
  result: { data: { myEmployeeTarget: target } },
});

export const myTargetErrorMock = (message: string, id = 'tgt-1'): MockedResponse => ({
  request: { query: MY_EMPLOYEE_TARGET, variables: { id } },
  result: { errors: [{ message }] },
});

type Matches = (variables: Record<string, unknown>) => boolean;

/** The submit mutation; `code` answers with a GraphQL error carrying that extension code. */
export const submitTargetMock = (
  matches: Matches = () => true,
  answer: { target?: EmployeeTargetRecord; code?: string } = {}
): MockedResponse => ({
  request: { query: SUBMIT_EMPLOYEE_TARGET, variables: matches },
  result:
    answer.code === undefined
      ? { data: { submitEmployeeTarget: answer.target ?? makeTarget({ status: 'SUBMITTED', submission: makeSubmission(), revision: 1 }) } }
      : { errors: [{ message: 'refused', extensions: { code: answer.code } }] },
});
