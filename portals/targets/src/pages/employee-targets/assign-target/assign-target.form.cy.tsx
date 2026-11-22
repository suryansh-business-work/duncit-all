import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import type { MockedResponse } from '@apollo/client/testing';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { EMPLOYEE_TARGET_LIMITS } from '@duncit/utils';
import { AssignTargetForm, EMPTY_ASSIGN_VALUES, assignTargetSchema, valuesFromTarget } from '.';
import { TARGET_ASSIGNABLE_EMPLOYEES } from '../../../lib/employee-target-queries';
import { employeeTarget } from '../../../../__tests__/employee-target-fixtures';

type Translate = Parameters<typeof assignTargetSchema>[0];
const t = ((key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${Object.values(options.vars).join('|')}` : key) as Translate;

const PRIYA = { id: 'emp-1', name: 'Priya Rao', email: 'priya@duncit.com' };
const goal = (over: Record<string, string> = {}) => ({ title: 'Onboard venues', description: '', target_value: '', unit: '', ...over });
const valid = { employee: PRIYA, month: new Date(2026, 10, 1), goals: [goal()], notes: '' };

const issues = (values: unknown) => {
  const result = assignTargetSchema(t).safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

const assignableMock: MockedResponse = {
  request: { query: TARGET_ASSIGNABLE_EMPLOYEES, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { targetAssignableEmployees: [{ __typename: 'EmployeeTargetAssignee', ...PRIYA }] } },
};

function renderForm(props: Partial<Parameters<typeof AssignTargetForm>[0]> = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(true);
  const onCancel = props.onCancel ?? vi.fn();
  render(
    <MockedProvider mocks={[assignableMock]}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <AssignTargetForm editing={null} onSubmit={onSubmit} onCancel={onCancel} {...props} />
      </LocalizationProvider>
    </MockedProvider>
  );
  return { onSubmit, onCancel };
}

describe('assignTargetSchema', () => {
  it('turns the form into the API input: employee id, YYYY-MM month and numeric figures', () => {
    expect(
      assignTargetSchema(t).parse({
        ...valid,
        goals: [goal({ title: '  Onboard venues ', target_value: ' 40 ', unit: 'venues' }), goal({ title: 'Run pods' })],
        notes: ' east ',
      })
    ).toEqual({
      employee_id: 'emp-1',
      month: '2026-11',
      goals: [
        { title: 'Onboard venues', description: '', target_value: 40, unit: 'venues' },
        { title: 'Run pods', description: '', target_value: null, unit: '' },
      ],
      notes: 'east',
    });
  });

  it('asks for an employee, a month and a titled goal', () => {
    expect(issues(EMPTY_ASSIGN_VALUES)).toEqual([
      'employeeTargets.form.employeeRequired',
      'employeeTargets.form.monthRequired',
      'employeeTargets.form.goalTitleRequired',
    ]);
    expect(issues({ ...valid, month: new Date('not a date') })).toEqual(['employeeTargets.form.monthRequired']);
  });

  it('refuses a negative or non-numeric figure, and too few or too many goals', () => {
    expect(issues({ ...valid, goals: [goal({ target_value: '-1' })] })).toEqual(['employeeTargets.form.goalTargetInvalid']);
    expect(issues({ ...valid, goals: [goal({ target_value: 'forty' })] })).toEqual(['employeeTargets.form.goalTargetInvalid']);
    expect(issues({ ...valid, goals: [] })).toEqual(['employeeTargets.form.goalsMin']);
    const many = Array.from({ length: EMPLOYEE_TARGET_LIMITS.goalsMax + 1 }, () => goal());
    expect(issues({ ...valid, goals: many })).toEqual([`employeeTargets.form.goalsMax:${EMPLOYEE_TARGET_LIMITS.goalsMax}`]);
    expect(issues({ ...valid, goals: [goal({ title: 'x'.repeat(EMPLOYEE_TARGET_LIMITS.goalTitleMax + 1) })] })).toEqual([
      `employeeTargets.form.tooLong:${EMPLOYEE_TARGET_LIMITS.goalTitleMax}`,
    ]);
  });

  it('seeds the editor from a saved target', () => {
    expect(valuesFromTarget(employeeTarget())).toEqual({
      employee: PRIYA,
      month: new Date(2026, 10, 1),
      goals: [
        { title: 'Onboard venues', description: 'Bengaluru east', target_value: '40', unit: 'venues' },
        { title: 'Run pods', description: '', target_value: '', unit: '' },
      ],
      notes: 'Focus on weekends',
    });
  });
});

describe('AssignTargetForm', () => {
  it('refuses to assign without an employee, a month and a goal title', async () => {
    const { onSubmit } = renderForm();
    fireEvent.click(screen.getByTestId('assign-target-submit'));
    expect(await screen.findByText('Choose an employee')).toBeInTheDocument();
    expect(screen.getByText('Choose a month')).toBeInTheDocument();
    expect(screen.getByText('Give the goal a title')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('offers the active employees the server returns', async () => {
    renderForm();
    fireEvent.mouseDown(screen.getByTestId('assign-target-employee'));
    fireEvent.change(screen.getByTestId('assign-target-employee'), { target: { value: 'pri' } });
    expect(await screen.findByText('Priya Rao · priya@duncit.com')).toBeInTheDocument();
  });

  it('adds and removes goal rows, keeping at least one', () => {
    renderForm();
    expect(screen.getAllByTestId('assign-target-goal')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Remove goal 1' })).toBeDisabled();
    fireEvent.click(screen.getByTestId('assign-target-add-goal'));
    expect(screen.getAllByTestId('assign-target-goal')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Remove goal 2' }));
    expect(screen.getAllByTestId('assign-target-goal')).toHaveLength(1);
  });

  it('edits the goals of a saved target with its employee and month fixed', async () => {
    const { onSubmit, onCancel } = renderForm({ editing: employeeTarget() });
    const title = (await screen.findByTestId('assign-target-goal-title-0')) as HTMLInputElement;
    await waitFor(() => expect(title.value).toBe('Onboard venues'));
    expect(screen.getByTestId('assign-target-employee')).toBeDisabled();
    expect(screen.getByTestId('assign-target-submit')).toHaveTextContent('Save goals');

    fireEvent.change(screen.getByTestId('assign-target-goal-target-1'), { target: { value: '12' } });
    fireEvent.click(screen.getByTestId('assign-target-submit'));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        employee_id: 'emp-1',
        month: '2026-11',
        goals: [
          { title: 'Onboard venues', description: 'Bengaluru east', target_value: 40, unit: 'venues' },
          { title: 'Run pods', description: '', target_value: 12, unit: '' },
        ],
        notes: 'Focus on weekends',
      })
    );
    fireEvent.click(screen.getByTestId('assign-target-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('marks a figure that is not a number', async () => {
    const { onSubmit } = renderForm({ editing: employeeTarget() });
    await waitFor(() => expect((screen.getByTestId('assign-target-goal-title-0') as HTMLInputElement).value).toBe('Onboard venues'));
    fireEvent.change(screen.getByTestId('assign-target-goal-target-0'), { target: { value: 'forty' } });
    fireEvent.click(screen.getByTestId('assign-target-submit'));
    expect(await screen.findByText('Enter a number of 0 or more, or leave it blank')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
