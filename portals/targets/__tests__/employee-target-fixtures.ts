import type { EmployeeTargetRecord } from '@duncit/utils';

const ISO = '2026-11-29T06:00:00.000Z';

/**
 * A monthly employee target exactly as EMPLOYEE_TARGET_SELECTION reads it back,
 * `__typename` on every object so Apollo's cache can read it, as the API sends it.
 */
export function employeeTarget(over: Partial<EmployeeTargetRecord> = {}): EmployeeTargetRecord {
  return {
    __typename: 'EmployeeTarget',
    id: 'tgt-1',
    employee: { __typename: 'EmployeeTargetPerson', user_id: 'emp-1', name: 'Priya Rao', email: 'priya@duncit.com' },
    month: '2026-11',
    goals: [
      { __typename: 'EmployeeTargetGoal', title: 'Onboard venues', description: 'Bengaluru east', target_value: 40, unit: 'venues' },
      { __typename: 'EmployeeTargetGoal', title: 'Run pods', description: '', target_value: null, unit: '' },
    ],
    goal_count: 2,
    notes: 'Focus on weekends',
    status: 'ASSIGNED',
    submission: null,
    review: null,
    reminder_active: false,
    revision: 0,
    assigned_by: { __typename: 'EmployeeTargetPerson', user_id: 'adm-1', name: 'Asha Planner' },
    created_at: ISO,
    updated_at: ISO,
    ...over,
  } as EmployeeTargetRecord;
}

export function targetSubmission(
  over: Partial<NonNullable<EmployeeTargetRecord['submission']>> = {}
): NonNullable<EmployeeTargetRecord['submission']> {
  return {
    __typename: 'EmployeeTargetSubmission',
    completion_percent: 80,
    achievements: [{ __typename: 'EmployeeTargetAchievement', title: 'Signed 32 venues', details: 'Indiranagar and HSR' }],
    updates: 'Two more in legal review',
    submitted_at: ISO,
    submission_count: 1,
    ...over,
  } as NonNullable<EmployeeTargetRecord['submission']>;
}

export function targetReview(comment = 'Great month'): NonNullable<EmployeeTargetRecord['review']> {
  return {
    __typename: 'EmployeeTargetReview',
    comment,
    reviewed_by: { __typename: 'EmployeeTargetPerson', user_id: 'adm-1', name: 'Asha Planner' },
    reviewed_at: ISO,
  } as NonNullable<EmployeeTargetRecord['review']>;
}
