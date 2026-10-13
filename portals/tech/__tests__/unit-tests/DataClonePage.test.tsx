import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));

import DataClonePage from '../../src/pages/data-clone';
import CloneCollectionList from '../../src/pages/data-clone/CloneCollectionList';
import type { CloneCollection, CloneJob } from '../../src/pages/data-clone/queries';

const targets = (over: Record<string, unknown> = {}) => ({
  sourceDatabase: 'duncit-prod',
  targetDatabase: 'duncit-staging',
  excluded: ['otps', 'push_tokens'],
  ready: true,
  error: null,
  ...over,
});

const job = (over: Partial<CloneJob> = {}): CloneJob => ({
  id: 'j1',
  status: 'SUCCEEDED',
  sourceDatabase: 'duncit-prod',
  targetDatabase: 'duncit-staging',
  currentCollection: null,
  collectionsTotal: 2,
  collectionsDone: 2,
  documentsCopied: 10,
  bytesCopied: 2048,
  excluded: ['sessions'],
  error: null,
  startedBy: 'asha',
  startedAt: '2026-01-01T00:00:00.000Z',
  finishedAt: '2026-01-01T00:05:00.000Z',
  collections: [],
  ...over,
});

const settings = {
  production: {
    role: 'PRODUCTION',
    uriMasked: 'mongodb+srv://***',
    hasUri: true,
    database: 'duncit-prod',
    connected: true,
    collectionCount: 4,
    lastTestedAt: '2026-01-01T00:00:00.000Z',
    lastTestError: null,
  },
  staging: {
    role: 'STAGING',
    uriMasked: '',
    hasUri: false,
    database: '',
    connected: false,
    collectionCount: 0,
    lastTestedAt: null,
    lastTestError: null,
  },
};

beforeEach(() => {
  resetOps();
  ops.q = {
    DataCloneTargets: { data: { dataCloneTargets: targets() } },
    DataCloneJobFields: { data: { dataCloneJob: job() } },
    DataCloneSettingsFields: { data: { dataCloneSettings: settings } },
  };
});

describe('DataClonePage', () => {
  it('shows both endpoints and the finished job with its exclusions', () => {
    renderWithProviders(<DataClonePage />);
    expect(screen.getByText('Source (production): duncit-prod')).toBeInTheDocument();
    expect(screen.getByText('Target (staging): duncit-staging')).toBeInTheDocument();
    expect(screen.getByText('Finished')).toBeInTheDocument();
    // The job's own exclusion list wins over the targets' list.
    expect(screen.getByText('Never cloned (1)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start clone' })).toBeEnabled();
  });

  it('falls back to the targets exclusion list when no job has run', () => {
    ops.q.DataCloneJobFields = { data: { dataCloneJob: null } };
    renderWithProviders(<DataClonePage />);
    expect(screen.getByText('No clone has run on this server yet.')).toBeInTheDocument();
    expect(screen.getByText('Never cloned (2)')).toBeInTheDocument();
  });

  it('explains why a clone cannot start and keeps Start disabled', () => {
    ops.q.DataCloneTargets = {
      data: { dataCloneTargets: targets({ ready: false, error: 'Staging is not connected.' }) },
    };
    renderWithProviders(<DataClonePage />);
    expect(screen.getByText(/A clone cannot start yet\./)).toHaveTextContent(
      'Staging is not connected.',
    );
    expect(screen.getByRole('button', { name: 'Start clone' })).toBeDisabled();
    expect(screen.queryByText('Source (production): duncit-prod')).not.toBeInTheDocument();
  });

  it('shows the query failure instead of a silently disabled button', () => {
    ops.q.DataCloneTargets = { error: new Error('Not authorised') };
    renderWithProviders(<DataClonePage />);
    expect(screen.getByText('Not authorised')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start clone' })).toBeDisabled();
  });

  it('keeps Start disabled until the targets have loaded', () => {
    ops.q.DataCloneTargets = { data: undefined, loading: true };
    renderWithProviders(<DataClonePage />);
    expect(screen.getByRole('button', { name: 'Start clone' })).toBeDisabled();
  });

  it('shows a progress bar while either query is loading', () => {
    ops.q.DataCloneTargets = { loading: true };
    ops.q.DataCloneJobFields = { loading: true };
    renderWithProviders(<DataClonePage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    // no empty-state notice while the first job read is in flight
    expect(screen.queryByText('No clone has run on this server yet.')).not.toBeInTheDocument();
  });

  it('asks for confirmation naming both databases, then starts and refreshes the job', async () => {
    const refetch = vi.fn().mockResolvedValue({});
    ops.q.DataCloneJobFields = { data: { dataCloneJob: job() }, refetch };
    ops.confirm.mockResolvedValue(true);
    const start = mutation('DataCloneJobFields');
    renderWithProviders(<DataClonePage />);

    fireEvent.click(screen.getByRole('button', { name: 'Start clone' }));
    await waitFor(() => expect(refetch).toHaveBeenCalled());
    expect(start).toHaveBeenCalledTimes(1);
    expect(ops.confirm.mock.calls[0][0]).toMatchObject({
      destructive: true,
      message: expect.stringContaining('duncit-staging'),
    });
    expect(ops.confirm.mock.calls[0][0].message).toContain('duncit-prod');
  });

  it('does not start when the confirmation is declined', async () => {
    ops.confirm.mockResolvedValue(false);
    const start = mutation('DataCloneJobFields');
    renderWithProviders(<DataClonePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Start clone' }));
    await waitFor(() => expect(ops.confirm).toHaveBeenCalled());
    expect(start).not.toHaveBeenCalled();
  });

  it('shows the server message when the start fails, and lets it be dismissed', async () => {
    ops.confirm.mockResolvedValue(true);
    mutation('DataCloneJobFields').mockRejectedValue(new Error('Clone already running'));
    renderWithProviders(<DataClonePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Start clone' }));
    const alert = await screen.findByText('Clone already running');
    fireEvent.click(within(alert.closest('[role="alert"]') as HTMLElement).getByRole('button'));
    await waitFor(() => expect(screen.queryByText('Clone already running')).not.toBeInTheDocument());
  });

  it('falls back to the generic failure text for a non-Error rejection', async () => {
    ops.confirm.mockResolvedValue(true);
    mutation('DataCloneJobFields').mockRejectedValue('nope');
    renderWithProviders(<DataClonePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Start clone' }));
    expect(await screen.findByText('Failed')).toBeInTheDocument();
  });

  it('shows Starting while the mutation is in flight', () => {
    ops.mutLoading.DataCloneJobFields = true;
    renderWithProviders(<DataClonePage />);
    expect(screen.getByRole('button', { name: 'Starting…' })).toBeDisabled();
  });

  it('locks Settings and Start while a clone runs and asks before an in-app link is followed', () => {
    ops.q.DataCloneJobFields = {
      data: {
        dataCloneJob: job({
          status: 'RUNNING',
          currentCollection: 'orders',
          collectionsDone: 1,
          finishedAt: null,
        }),
      },
    };
    renderWithProviders(
      <>
        <a href="/elsewhere">elsewhere</a>
        <DataClonePage />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Settings' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Start clone' })).toBeDisabled();

    fireEvent.click(screen.getByText('elsewhere'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('A clone is still running')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Stay on this page' }));
    return waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens the connections dialog and re-reads targets when it closes', async () => {
    const refetch = vi.fn().mockResolvedValue({});
    ops.q.DataCloneTargets = { data: { dataCloneTargets: targets() }, refetch };
    renderWithProviders(<DataClonePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Clone connections')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('reports a failed targets re-read after the dialog closes', async () => {
    ops.q.DataCloneTargets = {
      data: { dataCloneTargets: targets() },
      refetch: vi.fn().mockRejectedValue(new Error('targets unreachable')),
    };
    renderWithProviders(<DataClonePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(await screen.findByText('targets unreachable')).toBeInTheDocument();
  });

  it('uses the generic failure text when the re-read rejects with a non-Error', async () => {
    ops.q.DataCloneTargets = {
      data: { dataCloneTargets: targets() },
      refetch: vi.fn().mockRejectedValue('boom'),
    };
    renderWithProviders(<DataClonePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(await screen.findByText('Failed')).toBeInTheDocument();
  });
});

describe('DataClonePage connection dialog failures', () => {
  const openStagingForm = async () => {
    renderWithProviders(<DataClonePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const dialog = await screen.findByRole('dialog');
    const uri = within(dialog).getAllByLabelText(/^Connection string/, { selector: 'input' })[1];
    const db = within(dialog).getAllByLabelText(/^Database name/)[1];
    fireEvent.change(uri, { target: { value: 'mongodb://h/db' } });
    fireEvent.change(db, { target: { value: 'stg' } });
    fireEvent.submit(uri.closest('form') as HTMLFormElement);
    return dialog;
  };

  it('falls back to the generic connect failure for a non-Error rejection', async () => {
    mutation('DataCloneSettingsFields').mockRejectedValue('nope');
    await openStagingForm();
    expect(await screen.findByText('The connection could not be saved.')).toBeInTheDocument();
  });

  it('keeps Close disabled while a connect is still in flight', async () => {
    mutation('DataCloneSettingsFields').mockReturnValue(new Promise(() => undefined));
    const dialog = await openStagingForm();
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Close' })).toBeDisabled());
    expect(within(dialog).getByRole('button', { name: 'Connecting…' })).toBeInTheDocument();
  });
});

describe('CloneCollectionList', () => {
  const rows: CloneCollection[] = [
    { name: 'users', status: 'DONE', sourceCount: 1200, copiedCount: 1200, bytes: 1024, error: null },
    { name: 'orders', status: 'COPYING', sourceCount: 200, copiedCount: 50, bytes: 0, error: null },
    { name: 'events', status: 'COPYING', sourceCount: 0, copiedCount: 0, bytes: 0, error: null },
    { name: 'carts', status: 'PENDING', sourceCount: 5, copiedCount: 0, bytes: 0, error: null },
    { name: 'pods', status: 'FAILED', sourceCount: 5, copiedCount: 2, bytes: 0, error: 'duplicate key' },
    { name: 'over', status: 'COPYING', sourceCount: 10, copiedCount: 30, bytes: 0, error: null },
  ];

  it('shows each collection with its counts, status chip and error', () => {
    renderWithProviders(<CloneCollectionList collections={rows} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByText('1,200 / 1,200')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Waiting')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getAllByText('Copying')).toHaveLength(3);
    expect(screen.getByText('duplicate key')).toBeInTheDocument();
  });

  it('draws a determinate bar capped at 100% and an indeterminate one without a count', () => {
    renderWithProviders(<CloneCollectionList collections={rows} />);
    const bars = screen.getAllByRole('progressbar');
    expect(bars).toHaveLength(3);
    const values = bars.map((b) => b.getAttribute('aria-valuenow'));
    expect(values).toEqual(['25', null, '100']);
  });

  it('renders nothing for an empty feed', () => {
    renderWithProviders(<CloneCollectionList collections={[]} />);
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
