/**
 * Targets > Settings: the month-end reminder window loads, saves, and says so
 * when either fails.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import type { MockedResponse } from '@apollo/client/testing';
import TargetSettingsPage from '../../../src/pages/target-settings/TargetSettingsPage';
import { EMPLOYEE_TARGET_SETTINGS, UPDATE_EMPLOYEE_TARGET_SETTINGS } from '../../../src/lib/employee-target-queries';

const { notifySuccess, notifyError } = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess,
  notifyError,
}));

const SETTINGS = {
  __typename: 'EmployeeTargetSettings',
  reminders_enabled: true,
  reminder_days_before_end: 3,
  reminder_grace_days: 3,
  updated_at: null,
};

const settingsMock = (usage = 1): MockedResponse => ({
  request: { query: EMPLOYEE_TARGET_SETTINGS },
  maxUsageCount: usage,
  result: { data: { employeeTargetSettings: SETTINGS } },
});

const saveMock = (fail = false): MockedResponse => ({
  request: {
    query: UPDATE_EMPLOYEE_TARGET_SETTINGS,
    variables: { input: { reminders_enabled: true, reminder_days_before_end: 5, reminder_grace_days: 3 } },
  },
  result: fail
    ? { errors: [{ message: 'no' }] }
    : { data: { updateEmployeeTargetSettings: { ...SETTINGS, reminder_days_before_end: 5 } } },
});

const renderPage = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={mocks}>
      <TargetSettingsPage />
    </MockedProvider>
  );

const changeDaysAndSave = async () => {
  const box = (await screen.findByTestId('target-settings-days-before')) as HTMLInputElement;
  fireEvent.change(box, { target: { value: '5' } });
  fireEvent.click(screen.getByTestId('target-settings-save'));
};

beforeEach(() => {
  notifySuccess.mockClear();
  notifyError.mockClear();
});

describe('TargetSettingsPage', () => {
  it('loads the window and saves a change', async () => {
    renderPage([settingsMock(), saveMock()]);
    expect(screen.getByRole('progressbar', { name: 'Loading settings' })).toBeInTheDocument();
    await changeDaysAndSave();
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Settings saved'));
  });

  it('says so when saving fails', async () => {
    renderPage([settingsMock(), saveMock(true)]);
    await changeDaysAndSave();
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Settings could not be saved. Please try again.'));
  });

  it('says so when the settings cannot be loaded, and retries', async () => {
    renderPage([{ request: { query: EMPLOYEE_TARGET_SETTINGS }, result: { errors: [{ message: 'down' }] } }, settingsMock()]);
    expect(await screen.findByTestId('target-settings-error')).toHaveTextContent('Settings could not be loaded.');
    fireEvent.click(screen.getByTestId('target-settings-retry'));
    expect(await screen.findByTestId('target-settings-form')).toBeInTheDocument();
  });
});
