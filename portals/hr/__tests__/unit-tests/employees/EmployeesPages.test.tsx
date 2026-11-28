import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import EmployeesPage from '../../../src/pages/employees/list/EmployeesPage';
import HireEmployeePage from '../../../src/pages/employees/hire/HireEmployeePage';
import HrSettingsPage from '../../../src/pages/settings/HrSettingsPage';
import { renderWithProviders } from '../../testkit';
import { settingsMock, unrecordedMock } from '../../mocks';

// The table pages through the server; its columns are covered by its own contract, not here.
vi.mock('../../../src/pages/employees/list/EmployeesTable', () => ({ default: () => <div>EMPLOYEES TABLE</div> }));

/** Where the hire form landed, and the account it was opened for. */
function HireProbe() {
  const location = useLocation();
  const account = (location.state as { account?: { name: string } } | null)?.account;
  return <div>HIRE FOR {account?.name ?? 'nobody'}</div>;
}

describe('EmployeesPage', () => {
  it('lists the directory and opens the hire form from Add employee', async () => {
    renderWithProviders(<></>, {
      mocks: [unrecordedMock()],
      initialEntries: ['/employees'],
      routes: (
        <>
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/new" element={<HireProbe />} />
        </>
      ),
    });
    expect(screen.getByText('EMPLOYEES TABLE')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('hr-employees-add'));
    expect(await screen.findByText('HIRE FOR nobody')).toBeInTheDocument();
  });

  it('lists Employee-role accounts without an HR record and opens the hire form for one', async () => {
    renderWithProviders(<></>, {
      mocks: [unrecordedMock([{ id: 'u9', name: 'Legacy Lee', email: 'lee@x.com', photo: null }])],
      initialEntries: ['/employees'],
      routes: (
        <>
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/new" element={<HireProbe />} />
        </>
      ),
    });
    expect(await screen.findByTestId('hr-unrecorded-banner')).toHaveTextContent('Legacy Lee');
    fireEvent.click(screen.getByTestId('hr-unrecorded-add-u9'));
    expect(await screen.findByText('HIRE FOR Legacy Lee')).toBeInTheDocument();
  });
});

describe('HireEmployeePage', () => {
  it('loads HR settings and opens the hire form with the next code', async () => {
    renderWithProviders(<HireEmployeePage />, { mocks: [settingsMock()] });
    expect(await screen.findByTestId('hr-hire-form')).toBeInTheDocument();
    expect(screen.getByText('Leave empty to use the next code, EMP-0002.')).toBeInTheDocument();
  });

  it('says so when HR settings cannot be loaded', async () => {
    renderWithProviders(<HireEmployeePage />, { mocks: [] });
    expect(await screen.findByText('HR settings could not be loaded.')).toBeInTheDocument();
  });
});

describe('HrSettingsPage', () => {
  it('shows the settings form filled from the server', async () => {
    renderWithProviders(<HrSettingsPage />, { mocks: [settingsMock()] });
    expect(await screen.findByTestId('hr-settings-form')).toBeInTheDocument();
    expect(screen.getByTestId('hr-settings-prefix')).toHaveValue('EMP');
    expect(screen.getByTestId('hr-settings-departments-0')).toHaveValue('Growth');
  });
});
