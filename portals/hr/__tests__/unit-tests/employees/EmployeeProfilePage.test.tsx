import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Route } from 'react-router';
import { ConfirmProvider } from '@duncit/dialogs';
import EmployeeProfilePage from '../../../src/pages/employees/profile/EmployeeProfilePage';
import { renderWithProviders } from '../../testkit';
import { compensationRecord, employeeRecord, historyMock, profileMock, profileRecord, settingsMock, targetsMock } from '../../mocks';
import type { HrProfile } from '../../../src/lib/employee-queries';

function renderProfile(profile: HrProfile, path = `/employees/${profile.employee.id}`) {
  return renderWithProviders(<></>, {
    initialEntries: [path],
    mocks: [profileMock(profile), settingsMock(), historyMock(profile.employee.id), targetsMock(profile.employee.id)],
    routes: (
      <Route
        path="/employees/:id"
        element={
          <ConfirmProvider>
            <EmployeeProfilePage />
          </ConfirmProvider>
        }
      />
    ),
  });
}

const openActions = async () => {
  fireEvent.click(await screen.findByTestId('hr-profile-actions'));
  return screen.getAllByRole('menuitem').map((item) => item.textContent);
};

describe('EmployeeProfilePage', () => {
  it('shows the person, their status and the overview, with the actions an active record allows', async () => {
    renderProfile(profileRecord());
    expect(await screen.findByRole('heading', { name: 'Meera Nair' })).toBeInTheDocument();
    expect(screen.getByText('EMP-0001 · Community Manager · Growth')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('meera@x.com')).toBeInTheDocument();
    expect(await openActions()).toEqual(['Edit personal details', 'Change job', 'Revise pay', 'Edit bank details', 'Record exit']);
  });

  it('offers only personal edits and rehire on a leaver', async () => {
    const exit = { exit_type: 'RESIGNATION' as const, resignation_date: null, last_working_day: '2026-06-30', reason: null, eligible_for_rehire: true, recorded_by: { user_id: 'u', name: 'Asha' }, recorded_at: '2026-06-01T00:00:00Z' };
    renderProfile(profileRecord({ employee: employeeRecord({ status: 'EXITED', exit }) }));
    expect(await openActions()).toEqual(['Edit personal details', 'Rehire']);
  });

  it('offers to cancel an exit still in its notice period', async () => {
    const exit = { exit_type: 'RESIGNATION' as const, resignation_date: null, last_working_day: '2027-01-31', reason: null, eligible_for_rehire: true, recorded_by: { user_id: 'u', name: 'Asha' }, recorded_at: '2026-11-01T00:00:00Z' };
    renderProfile(profileRecord({ employee: employeeRecord({ status: 'ON_NOTICE', exit }) }));
    expect(await openActions()).toContain('Cancel exit');
  });

  it('warns when the account lost Employee access and offers to restore it', async () => {
    renderProfile(profileRecord({ has_employee_access: false }));
    expect(await screen.findByText('No Employee console access')).toBeInTheDocument();
    expect(screen.getByTestId('hr-restore-access')).toBeInTheDocument();
  });

  it('opens the tab the URL names: pay with the revision in force, and the history', async () => {
    renderProfile(profileRecord({ compensation: [compensationRecord({ id: 'up', effective_from: '2027-01-01', is_current: false, is_upcoming: true, reason: 'REVISION' }), compensationRecord()] }), '/employees/e1?selectedtab=pay');
    expect(await screen.findByTestId('hr-pay-totals')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'History' }));
    expect(await screen.findByText('Job changed')).toBeInTheDocument();
    expect(screen.getByText('Strong year')).toBeInTheDocument();
  });

  it('opens the edit dialog an action names', async () => {
    renderProfile(profileRecord());
    fireEvent.click(await screen.findByTestId('hr-profile-actions'));
    fireEvent.click(screen.getByTestId('hr-profile-action-personal'));
    expect(await screen.findByTestId('hr-personal-form')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('hr-personal-form-cancel'));
  });
});
