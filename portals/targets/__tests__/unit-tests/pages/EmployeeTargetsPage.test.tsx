/**
 * Targets > Employee Targets end to end against mocked Apollo: the list, the
 * detail with the employee's report, reviewing, editing goals, reopening and
 * deleting — each write against the revision it was made on, and each refusal
 * explained.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ConfirmProvider } from '@duncit/dialogs';
import EmployeeTargetsPage from '../../../src/pages/employee-targets/EmployeeTargetsPage';
import {
  DELETE_EMPLOYEE_TARGET,
  REOPEN_EMPLOYEE_TARGET,
  REVIEW_EMPLOYEE_TARGET,
  TARGET_ASSIGNABLE_EMPLOYEES,
  UPDATE_EMPLOYEE_TARGET,
} from '../../../src/lib/employee-target-queries';
import { employeeTarget, targetReview, targetSubmission } from '../../employee-target-fixtures';
import { tableControls } from '../../mocks/table';

const { notifySuccess, notifyError } = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess,
  notifyError,
}));

const SUBMITTED = employeeTarget({ id: 'tgt-2', status: 'SUBMITTED', revision: 1, submission: targetSubmission() });
const REVIEWED = employeeTarget({ id: 'tgt-3', status: 'REVIEWED', revision: 2, submission: targetSubmission(), review: targetReview() });

const assignable: MockedResponse = {
  request: { query: TARGET_ASSIGNABLE_EMPLOYEES, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { targetAssignableEmployees: [] } },
};

function renderPage(mocks: MockedResponse[] = []) {
  return render(
    <MockedProvider mocks={[assignable, ...mocks]}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <ConfirmProvider>
          <EmployeeTargetsPage />
        </ConfirmProvider>
      </LocalizationProvider>
    </MockedProvider>
  );
}

const openRow = async (index: number) => {
  fireEvent.click((await screen.findAllByTestId('row-open'))[index]);
  return screen.findByTestId('target-detail');
};

beforeEach(() => {
  notifySuccess.mockClear();
  notifyError.mockClear();
  tableControls.rows = [employeeTarget(), SUBMITTED, REVIEWED];
});

describe('the list', () => {
  it('shows each assignment with its employee, month, goals, status and completion', async () => {
    renderPage();
    const rows = await screen.findAllByTestId('table-row');
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText('Priya Rao')).toBeInTheDocument();
    expect(within(rows[0]).getByText('priya@duncit.com')).toBeInTheDocument();
    expect(within(rows[0]).getByText('November 2026')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Assigned')).toBeInTheDocument();
    expect(within(rows[0]).getAllByText('—').length).toBeGreaterThan(0);
    expect(within(rows[1]).getByText('80%')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Reviewed')).toBeInTheDocument();
  });

  it('says so when nothing has been assigned', async () => {
    tableControls.rows = [];
    renderPage();
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No targets yet. Assign one to get started.');
  });

  it('opens and closes the Assign dialog', async () => {
    renderPage();
    fireEvent.click(screen.getByTestId('employee-targets-assign'));
    expect(await screen.findByText('Assign a monthly target')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('assign-target-cancel'));
    await waitFor(() => expect(screen.queryByText('Assign a monthly target')).not.toBeInTheDocument());
  });
});

describe('the detail and review', () => {
  it('shows the goals and a note that nothing has been reported yet', async () => {
    renderPage();
    const detail = await openRow(0);
    expect(within(detail).getByText('1. Onboard venues')).toBeInTheDocument();
    expect(within(detail).getByText('Target: 40 venues')).toBeInTheDocument();
    expect(within(detail).getByText('Note: Focus on weekends')).toBeInTheDocument();
    expect(within(detail).getByText('The employee has not reported on this month yet.')).toBeInTheDocument();
    expect(screen.getByTestId('target-detail-edit')).toBeInTheDocument();
    expect(screen.queryByTestId('review-target-form')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('target-detail-close'));
    await waitFor(() => expect(screen.queryByTestId('target-detail')).not.toBeInTheDocument());
  });

  it('shows the report and marks it reviewed against its revision', async () => {
    renderPage([
      {
        request: { query: REVIEW_EMPLOYEE_TARGET, variables: { id: 'tgt-2', input: { comment: 'Great month', expected_revision: 1 } } },
        result: { data: { reviewEmployeeTarget: { ...SUBMITTED, status: 'REVIEWED', revision: 2, review: targetReview() } } },
      },
    ]);
    const detail = await openRow(1);
    expect(within(detail).getByTestId('target-completion')).toHaveTextContent('80%');
    expect(within(detail).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '80');
    expect(within(detail).getByText('Signed 32 venues')).toBeInTheDocument();
    expect(within(detail).getByText('Two more in legal review')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('review-target-comment'), { target: { value: 'Great month' } });
    fireEvent.click(screen.getByTestId('review-target-submit'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Marked as reviewed'));
    expect(await screen.findByTestId('target-review')).toHaveTextContent('Great month');
    expect(screen.getByTestId('target-detail-reopen')).toBeInTheDocument();
  });

  it('explains a review that lost a race', async () => {
    renderPage([
      {
        request: { query: REVIEW_EMPLOYEE_TARGET, variables: { id: 'tgt-2', input: { comment: '', expected_revision: 1 } } },
        result: { errors: [new GraphQLError('changed', { extensions: { code: 'CONFLICT' } })] },
      },
    ]);
    await openRow(1);
    fireEvent.click(screen.getByTestId('review-target-submit'));
    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith('This target was changed by someone else. Reload it and try again.')
    );
  });

  it('reopens a reviewed report after confirming', async () => {
    renderPage([
      {
        request: { query: REOPEN_EMPLOYEE_TARGET, variables: { id: 'tgt-3', expectedRevision: 2 } },
        result: { data: { reopenEmployeeTarget: { ...REVIEWED, status: 'SUBMITTED', revision: 3, review: null } } },
      },
    ]);
    await openRow(2);
    expect(screen.getByTestId('target-review')).toHaveTextContent('Reviewed by Asha Planner');
    fireEvent.click(screen.getByTestId('target-detail-reopen'));
    expect(await screen.findByTestId('confirm-dialog-message')).toHaveTextContent('Priya Rao will be able to change their report for November 2026');
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Report handed back to the employee'));
    expect(await screen.findByTestId('review-target-form')).toBeInTheDocument();
  });
});

describe('editing and deleting', () => {
  it('edits the goals of an unreported target and closes the editor', async () => {
    const edited = employeeTarget({ revision: 1 });
    renderPage([
      {
        request: { query: UPDATE_EMPLOYEE_TARGET, variables: () => true },
        result: { data: { updateEmployeeTarget: edited } },
      },
    ]);
    await openRow(0);
    fireEvent.click(screen.getByTestId('target-detail-edit'));
    expect(await screen.findByText('Edit goals', { selector: 'h2' })).toBeInTheDocument();
    await waitFor(() => expect((screen.getByTestId('assign-target-goal-title-0') as HTMLInputElement).value).toBe('Onboard venues'));
    fireEvent.click(screen.getByTestId('assign-target-submit'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Goals updated'));
    await waitFor(() => expect(screen.queryByTestId('assign-target-form')).not.toBeInTheDocument());
  });

  it('keeps the editor open and explains a target reported on meanwhile', async () => {
    renderPage([
      {
        request: { query: UPDATE_EMPLOYEE_TARGET, variables: () => true },
        result: { errors: [new GraphQLError('locked', { extensions: { code: 'BAD_REQUEST' } })] },
      },
    ]);
    await openRow(0);
    fireEvent.click(screen.getByTestId('target-detail-edit'));
    await waitFor(() => expect((screen.getByTestId('assign-target-goal-title-0') as HTMLInputElement).value).toBe('Onboard venues'));
    fireEvent.click(screen.getByTestId('assign-target-submit'));
    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith('This target can no longer be changed that way. Reload it to see where it stands.')
    );
    expect(screen.getByTestId('assign-target-form')).toBeInTheDocument();
  });

  it('deletes only after confirming, and does nothing when cancelled', async () => {
    renderPage([{ request: { query: DELETE_EMPLOYEE_TARGET, variables: { id: 'tgt-1' } }, result: { data: { deleteEmployeeTarget: true } } }]);
    await openRow(0);
    fireEvent.click(screen.getByTestId('target-detail-delete'));
    expect(await screen.findByTestId('confirm-dialog-message')).toHaveTextContent('Priya Rao’s target for November 2026 will be removed');
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
    expect(screen.getByTestId('target-detail')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('target-detail-delete'));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Target deleted'));
    await waitFor(() => expect(screen.queryByTestId('target-detail')).not.toBeInTheDocument());
  });

  it('says so when a delete fails', async () => {
    renderPage([
      {
        request: { query: DELETE_EMPLOYEE_TARGET, variables: { id: 'tgt-1' } },
        result: { errors: [new GraphQLError('no', { extensions: { code: 'FORBIDDEN' } })] },
      },
    ]);
    await openRow(0);
    fireEvent.click(screen.getByTestId('target-detail-delete'));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('That did not work. Please try again.'));
    expect(screen.getByTestId('target-detail')).toBeInTheDocument();
  });
});
