import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { formatDateTime } from '@duncit/app-settings';
import { renderWithProviders } from '../../../__tests__/testkit';
import AccountDeletionSection from '../account-deletion';
import {
  ACCOUNT_DELETION_CRON,
  RUN_DELETION_PURGE_NOW,
  UPDATE_ACCOUNT_DELETION_CRON,
  UPDATE_RETENTION_DAYS,
  type CronSettings,
} from '../account-deletion/queries';

/**
 * The schedule half of the Account deletion card: ScheduleFields,
 * ScheduleSummary and the save / Run now paths of useAccountDeletionSettings.
 * The card is SUPER_ADMIN only, so every test signs in as one.
 */
const session = vi.hoisted(() => ({
  user: { user_id: 'u1', roles: ['SUPER_ADMIN'] },
  loading: false,
  error: null,
  refetch: () => Promise.resolve(),
  logout: () => undefined,
}));

vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => session,
}));

const NEXT_RUN = '2026-10-05T03:00:00.000Z';
const LAST_RUN = '2026-10-04T03:00:00.000Z';

const DAILY_OFF: CronSettings = {
  retention_days: 30,
  cron_enabled: false,
  cron_frequency: 'DAILY',
  cron_time_of_day: '03:00',
  cron_weekday: 0,
  cron_batch_size: 50,
  last_run_at: null,
  next_run_at: null,
};

const WEEKLY_ON: CronSettings = {
  ...DAILY_OFF,
  cron_enabled: true,
  cron_frequency: 'WEEKLY',
  cron_weekday: 3,
  last_run_at: LAST_RUN,
  next_run_at: NEXT_RUN,
};

const cronMock = (settings: CronSettings, dueCount: number): MockedResponse => ({
  request: { query: ACCOUNT_DELETION_CRON },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      accountDeletionCronSettings: { __typename: 'AccountDeletionCronSettings', ...settings },
      accountDeletionDueCount: dueCount,
    },
  },
});

const saveCronOk = (settings: CronSettings): MockedResponse => ({
  request: {
    query: UPDATE_ACCOUNT_DELETION_CRON,
    variables: {
      input: {
        cron_enabled: settings.cron_enabled,
        cron_frequency: settings.cron_frequency,
        cron_time_of_day: settings.cron_time_of_day,
        cron_weekday: settings.cron_weekday,
        cron_batch_size: settings.cron_batch_size,
      },
    },
  },
  result: {
    data: {
      updateAccountDeletionCron: { __typename: 'AccountDeletionCronSettings', ...settings },
    },
  },
});

const renderCard = (mocks: MockedResponse[]) => {
  const onToast = vi.fn();
  renderWithProviders(<AccountDeletionSection onToast={onToast} />, { mocks });
  return { onToast };
};

const retentionInput = () => screen.getByTestId('retention-days');
const saveButton = () => screen.getByTestId('save-deletion-settings');
const runButton = () => screen.getByTestId('run-deletion-sweep');
const timeInput = () => screen.getByLabelText('At');
const WARNING = /deleted permanently with nobody watching/;

const waitForSeed = async () => {
  await waitFor(() => expect(retentionInput()).toHaveValue(30));
};

const confirmRunNow = async () => {
  fireEvent.click(runButton());
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Run now' }));
};

describe('AccountDeletionSection — schedule', () => {
  it('summarises a weekly schedule: next and last run, the backlog, and a weekday picker', async () => {
    renderCard([cronMock(WEEKLY_ON, 3)]);

    await waitForSeed();
    expect(screen.getByText(`Next run ${formatDateTime(NEXT_RUN)}`)).toBeInTheDocument();
    expect(screen.getByText(`Last run ${formatDateTime(LAST_RUN)}`)).toBeInTheDocument();
    expect(screen.getByTestId('deletion-due-count')).toHaveTextContent(
      '3 account(s) are past their date and waiting.',
    );
    // The job is on, so the warning shows and the fields are editable.
    expect(screen.getByText(WARNING)).toBeInTheDocument();
    expect(screen.getByText('Server time, in the platform timezone set above.')).toBeInTheDocument();
    expect(timeInput()).toBeEnabled();
    expect(runButton()).toBeEnabled();
    // The saved schedule is what the selects SHOW (they used to keep showing
    // their first default, Every day / Sunday, while the form held Weekly / Wednesday).
    expect(screen.getByRole('combobox', { name: 'Runs' })).toHaveTextContent('Once a week');
    expect(screen.getByRole('combobox', { name: 'On' })).toHaveTextContent('Wednesday');

    // The weekday picker lists the seven days Sunday-first, in the locale's words.
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'On' }));
    const days = within(screen.getByRole('listbox'))
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(days).toEqual([
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ]);
  });

  it('says the job is off and nothing is due, hides the weekday picker and blocks Run now', async () => {
    renderCard([cronMock(DAILY_OFF, 0)]);

    await waitForSeed();
    expect(screen.getByText('No next run — the job is off')).toBeInTheDocument();
    expect(screen.getByText('Never run')).toBeInTheDocument();
    expect(screen.getByTestId('deletion-due-count')).toHaveTextContent(
      'Nothing is past its date right now.',
    );
    expect(screen.queryByRole('combobox', { name: 'On' })).not.toBeInTheDocument();
    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
    // Disabled, not hidden: the operator reads the time before switching the job on.
    expect(timeInput()).toBeDisabled();
    expect(timeInput()).toHaveValue('03:00');
    expect(runButton()).toBeDisabled();

    // Switching the job on raises the warning and unlocks the schedule fields.
    fireEvent.click(screen.getByLabelText('Carry out due requests automatically'));
    expect(screen.getByText(WARNING)).toBeInTheDocument();
    expect(timeInput()).toBeEnabled();
  });

  it('refuses an unreadable time and an out-of-range batch size, with their own messages', async () => {
    const { onToast } = renderCard([cronMock(WEEKLY_ON, 3)]);

    await waitForSeed();
    fireEvent.change(timeInput(), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Accounts per run'), { target: { value: '0' } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('Enter a time as HH:mm, e.g. 03:00.')).toBeInTheDocument();
    expect(screen.getByText('Enter a whole number between 1 and 500.')).toBeInTheDocument();
    expect(timeInput()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Accounts per run')).toHaveAttribute('aria-invalid', 'true');
    expect(onToast).not.toHaveBeenCalled();
  });

  it('saves a changed window and the schedule as two mutations, then toasts', async () => {
    const { onToast } = renderCard([
      cronMock(WEEKLY_ON, 3),
      {
        request: { query: UPDATE_RETENTION_DAYS, variables: { retention_days: 45 } },
        result: {
          data: {
            updateAccountDeletionSettings: {
              __typename: 'AccountDeletionSettings',
              retention_days: 45,
            },
          },
        },
      },
      saveCronOk(WEEKLY_ON),
    ]);

    await waitForSeed();
    fireEvent.change(retentionInput(), { target: { value: '45' } });
    fireEvent.click(saveButton());

    // Only a matching retention mutation AND cron mutation reach the toast.
    await waitFor(() =>
      expect(onToast).toHaveBeenCalledWith('Account deletion settings saved'),
    );
  });

  it('surfaces a failed save as an error and does not toast', async () => {
    const { onToast } = renderCard([
      cronMock(WEEKLY_ON, 3),
      {
        request: { query: UPDATE_RETENTION_DAYS, variables: { retention_days: 45 } },
        error: new Error('retention_days is locked'),
      },
    ]);

    await waitForSeed();
    fireEvent.change(retentionInput(), { target: { value: '45' } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('retention_days is locked')).toBeInTheDocument();
    expect(onToast).not.toHaveBeenCalled();
  });

  it('does nothing when Run now is cancelled at the confirmation', async () => {
    const { onToast } = renderCard([cronMock(WEEKLY_ON, 3)]);

    await waitForSeed();
    fireEvent.click(runButton());
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('This permanently deletes 3 account(s)');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onToast).not.toHaveBeenCalled();
  });

  it('reports how many accounts the confirmed sweep deleted', async () => {
    const { onToast } = renderCard([
      cronMock(WEEKLY_ON, 3),
      {
        request: { query: RUN_DELETION_PURGE_NOW },
        result: {
          data: {
            runAccountDeletionPurgeNow: {
              __typename: 'AccountDeletionRun',
              id: 'r1',
              run_id: 'run-1',
              trigger: 'MANUAL',
              status: 'SUCCEEDED',
              cutoff_at: LAST_RUN,
              retention_days: 30,
              eligible: 3,
              purged: 2,
              failed: 1,
              error: '',
              started_at: LAST_RUN,
              finished_at: LAST_RUN,
              results: [],
            },
          },
        },
      },
    ]);

    await waitForSeed();
    await confirmRunNow();

    await waitFor(() => expect(onToast).toHaveBeenCalledWith('2 account(s) deleted'));
  });

  it('reports zero deleted when the sweep answers without a run', async () => {
    const { onToast } = renderCard([
      cronMock(WEEKLY_ON, 3),
      {
        request: { query: RUN_DELETION_PURGE_NOW },
        result: { data: { runAccountDeletionPurgeNow: null } },
      },
    ]);

    await waitForSeed();
    await confirmRunNow();

    await waitFor(() => expect(onToast).toHaveBeenCalledWith('0 account(s) deleted'));
  });

  it('surfaces a failed sweep as an error and does not toast', async () => {
    const { onToast } = renderCard([
      cronMock(WEEKLY_ON, 3),
      { request: { query: RUN_DELETION_PURGE_NOW }, error: new Error('sweep already running') },
    ]);

    await waitForSeed();
    await confirmRunNow();

    expect(await screen.findByText('sweep already running')).toBeInTheDocument();
    expect(onToast).not.toHaveBeenCalled();
  });
});
