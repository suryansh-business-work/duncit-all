import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import AccountDeletionSection from '../account-deletion';
import {
  ACCOUNT_DELETION_CRON,
  ACCOUNT_DELETION_RUNS,
  RUN_DELETION_PURGE_NOW,
  UPDATE_ACCOUNT_DELETION_CRON,
  UPDATE_RETENTION_DAYS,
} from '../account-deletion/queries';

/** Who is signed in decides whether the card exists at all. */
const session = vi.hoisted(() => ({ roles: ['SUPER_ADMIN'] as string[] }));
vi.mock('@duncit/user-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/user-context')>();
  const value = {
    loading: false,
    error: null,
    refetch: () => Promise.resolve(undefined),
    logout: () => undefined,
  };
  return {
    ...actual,
    useUserData: () => ({
      ...value,
      user: { user_id: 'u-admin', full_name: 'Asha Admin', email: 'asha@duncit.com', roles: session.roles },
    }),
  };
});

vi.mock('@duncit/table', async (importOriginal) => {
  const stub = await import('../../location-subscriptions/__tests__/table-mock');
  return {
    ...(await importOriginal<typeof import('@duncit/table')>()),
    DuncitTable: stub.DuncitTable,
    useApolloTableFetch: stub.useApolloTableFetch,
  };
});

const settings = {
  __typename: 'AccountDeletionCronSettings',
  retention_days: 30,
  cron_enabled: false,
  cron_frequency: 'DAILY',
  cron_time_of_day: '03:00',
  cron_weekday: 0,
  cron_batch_size: 50,
  last_run_at: null,
  next_run_at: null,
};

const cronMock = (dueCount: number): MockedResponse => ({
  request: { query: ACCOUNT_DELETION_CRON },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { accountDeletionCronSettings: settings, accountDeletionDueCount: dueCount } },
});

const run = {
  __typename: 'AccountDeletionRun',
  id: 'run-1',
  run_id: 'RUN-0001',
  trigger: 'MANUAL',
  status: 'SUCCEEDED',
  cutoff_at: '2026-10-01T00:00:00.000Z',
  retention_days: 30,
  eligible: 3,
  purged: 3,
  failed: 0,
  error: '',
  started_at: '2026-10-01T00:00:00.000Z',
  finished_at: '2026-10-01T00:00:05.000Z',
  results: [],
};

const renderSection = (mocks: MockedResponse[]) => {
  const onToast = vi.fn();
  renderWithProviders(<AccountDeletionSection onToast={onToast} />, { mocks });
  return onToast;
};

const retentionInput = () => screen.getByTestId('retention-days');

describe('AccountDeletionSection', () => {
  it('renders nothing for someone who is not a super admin', async () => {
    session.roles = ['ADMIN'];
    try {
      renderSection([cronMock(2)]);
      await waitFor(() => expect(screen.queryByText('Account deletion')).toBeNull());
      expect(screen.queryByTestId('save-deletion-settings')).toBeNull();
      expect(screen.queryByTestId('run-deletion-sweep')).toBeNull();
    } finally {
      session.roles = ['SUPER_ADMIN'];
    }
  });

  it('hints the allowed range, and swaps in the range error for an out-of-range window without saving', async () => {
    const sent: unknown[] = [];
    renderSection([
      cronMock(0),
      {
        request: { query: UPDATE_RETENTION_DAYS, variables: () => true },
        result: (variables: Record<string, unknown>) => {
          sent.push(variables);
          return { data: { updateAccountDeletionSettings: { __typename: 'AccountDeletionSettings', retention_days: 0 } } };
        },
      },
      {
        request: { query: UPDATE_ACCOUNT_DELETION_CRON, variables: () => true },
        result: (variables: Record<string, unknown>) => {
          sent.push(variables);
          return { data: { updateAccountDeletionCron: settings } };
        },
      },
    ]);

    await waitFor(() => expect(retentionInput()).toHaveValue(30));
    expect(screen.getByText('Whole days, 1–365. Both apps show this number before anyone confirms.')).toBeInTheDocument();

    fireEvent.change(retentionInput(), { target: { value: '0' } });
    fireEvent.click(screen.getByTestId('save-deletion-settings'));

    expect(await screen.findByText('Enter a whole number of days between 1 and 365.')).toBeInTheDocument();
    expect(retentionInput()).toHaveAttribute('aria-invalid', 'true');
    expect(
      screen.queryByText('Whole days, 1–365. Both apps show this number before anyone confirms.')
    ).toBeNull();
    expect(sent).toEqual([]);
  });

  it('keeps Run now disabled while nobody is past their date', async () => {
    renderSection([cronMock(0)]);
    expect(await screen.findByText('Nothing is past its date right now.')).toBeInTheDocument();
    expect(screen.getByTestId('run-deletion-sweep')).toBeDisabled();
    expect(screen.getByTestId('run-deletion-sweep')).toHaveTextContent('Run now');
  });

  it('shows Running while the sweep is in flight, then reports how many accounts went', async () => {
    const onToast = renderSection([
      cronMock(3),
      {
        request: { query: RUN_DELETION_PURGE_NOW },
        delay: 200,
        result: { data: { runAccountDeletionPurgeNow: run } },
      },
    ]);

    const runButton = await screen.findByTestId('run-deletion-sweep');
    await waitFor(() => expect(runButton).toBeEnabled());
    fireEvent.click(runButton);

    const confirm = await screen.findByRole('dialog');
    expect(within(confirm).getByText('Carry out due requests now?')).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Run now' }));

    await waitFor(() => expect(screen.getByTestId('run-deletion-sweep')).toHaveTextContent('Running…'));
    expect(screen.getByTestId('run-deletion-sweep')).toBeDisabled();

    await waitFor(() => expect(onToast).toHaveBeenCalledWith('3 account(s) deleted'));
    await waitFor(() => expect(screen.getByTestId('run-deletion-sweep')).toHaveTextContent('Run now'));
  });
});

describe('AccountDeletionSection — run history', () => {
  const runsMock = (rows: unknown[]): MockedResponse => ({
    request: { query: ACCOUNT_DELETION_RUNS, variables: () => true },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: {
      data: {
        accountDeletionRuns: {
          __typename: 'AccountDeletionRunsPage',
          rows,
          total: rows.length,
          page: 1,
          page_size: 50,
        },
      },
    },
  });

  const rowOf = (runId: string) =>
    screen
      .getAllByTestId('table-row')
      .find((row) => within(row).queryAllByText(runId).length > 0) as HTMLElement;

  it('lists every sweep, marks a failed one red with its failures, and closes', async () => {
    const failed = {
      ...run,
      id: 'run-2',
      run_id: 'RUN-0002',
      trigger: 'SCHEDULED',
      status: 'FAILED',
      purged: 1,
      failed: 2,
    };
    renderSection([cronMock(0), runsMock([run, failed])]);

    fireEvent.click(await screen.findByTestId('open-deletion-runs'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Deletion runs')).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getAllByTestId('table-row')).toHaveLength(2));

    const ok = rowOf('RUN-0001');
    expect(within(ok).getByText('SUCCEEDED').closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
    expect(within(ok).getByText('MANUAL')).toBeInTheDocument();
    expect(within(ok).getByTestId('cell-purged')).toHaveTextContent(/^3$/);

    const bad = rowOf('RUN-0002');
    expect(within(bad).getByText('FAILED').closest('.MuiChip-root')).toHaveClass('MuiChip-colorError');
    expect(within(bad).getByText('SCHEDULED')).toBeInTheDocument();
    expect(within(bad).getByTestId('cell-purged')).toHaveTextContent('1 · 2 failed');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('says the sweep has not run yet when there are no runs', async () => {
    renderSection([cronMock(0), runsMock([])]);

    fireEvent.click(await screen.findByTestId('open-deletion-runs'));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByTestId('table-empty')).toHaveTextContent('The sweep has not run yet.');
  });
});
