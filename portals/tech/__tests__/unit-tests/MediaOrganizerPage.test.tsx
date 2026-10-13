import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';

const m = vi.hoisted(() => ({
  jobs: [] as Array<{ kind: string; status: string }>,
  tableFetch: vi.fn(),
}));

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('@duncit/shell', async (io) => ({
  ...(await io<typeof import('@duncit/shell')>()),
  useBackgroundJobs: () => ({ jobs: m.jobs }),
}));
vi.mock('@duncit/table', async (io) => {
  const actual = await io<typeof import('@duncit/table')>();
  const { ops: o } = await import('../mocks/ops');
  return {
    ...actual,
    useApolloTableFetch: (...args: unknown[]) => {
      m.tableFetch(...args);
      return async () => ({ rows: o.tableRows, total: o.tableRows.length });
    },
  };
});

import MediaOrganizerPage from '../../src/pages/media-organizer';

const run = (over: Record<string, unknown> = {}) => ({
  run_id: 'run-1',
  started_at: '2026-04-01T10:00:00.000Z',
  PENDING: 4,
  DONE: 2,
  IN_PLACE: 1,
  SHARED: 3,
  FAILED: 0,
  ROLLED_BACK: 0,
  ...over,
});

const file = (over: Record<string, unknown> = {}) => ({
  id: 'f1',
  file_path: '/old/path/a.png',
  new_file_path: '/new/path/a.png',
  owners: ['pod:1', 'user:2'],
  status: 'DONE',
  error: '',
  references: 5,
  rewritten: 4,
  ...over,
});

beforeEach(() => {
  resetOps();
  m.jobs = [];
  m.tableFetch.mockReset();
  ops.q.MediaOrganizerRuns = { data: { mediaOrganizerRuns: [run()] } };
});

const mount = async () => {
  const view = renderWithProviders(<MediaOrganizerPage />);
  await screen.findByTestId('media-organizer-view-run-1');
  return view;
};

describe('Media organizer runs', () => {
  it('lists each run with its counts', async () => {
    await mount();
    const row = screen.getByTestId('media-organizer-view-run-1').closest('[role="row"]') as HTMLElement;
    expect(within(row).getByText('4')).toBeInTheDocument();
    expect(within(row).getByText('3')).toBeInTheDocument();
    expect(screen.queryByText('Files')).not.toBeInTheDocument();
  });

  it('starts a dry run without asking for confirmation', async () => {
    await mount();
    fireEvent.click(screen.getByTestId('media-organizer-dry-run'));
    await waitFor(() =>
      expect(mutation('StartMediaOrganizer')).toHaveBeenCalledWith({
        variables: { dry_run: true, url: '/' },
      })
    );
    expect(ops.confirm).not.toHaveBeenCalled();
  });

  it('asks before a real run, and runs nothing when declined', async () => {
    ops.confirm.mockResolvedValue(false);
    await mount();
    fireEvent.click(screen.getByTestId('media-organizer-start'));
    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(mutation('StartMediaOrganizer')).not.toHaveBeenCalled();
  });

  it('starts a real run once confirmed', async () => {
    ops.confirm.mockResolvedValue(true);
    await mount();
    fireEvent.click(screen.getByTestId('media-organizer-start'));
    await waitFor(() =>
      expect(mutation('StartMediaOrganizer')).toHaveBeenCalledWith({
        variables: { dry_run: false, url: '/' },
      })
    );
  });

  it('reports a failed start with the server message, and a thrown string as text', async () => {
    ops.mut.StartMediaOrganizer = vi.fn().mockRejectedValue(new Error('queue full'));
    await mount();
    fireEvent.click(screen.getByTestId('media-organizer-dry-run'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('queue full'));
  });

  it('reports a non-Error rejection as plain text', async () => {
    ops.mut.StartMediaOrganizer = vi.fn().mockRejectedValue('plain failure');
    await mount();
    fireEvent.click(screen.getByTestId('media-organizer-dry-run'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('plain failure'));
  });

  it('shows Starting… while the start mutation is in flight and locks the buttons', async () => {
    ops.mutLoading.StartMediaOrganizer = true;
    await mount();
    expect(screen.getByTestId('media-organizer-start')).toHaveTextContent('Starting');
    expect(screen.getByTestId('media-organizer-start')).toBeDisabled();
    expect(screen.getByTestId('media-organizer-dry-run')).toBeDisabled();
  });

  it('applies a dry run after confirmation, reporting how many files are pending', async () => {
    ops.confirm.mockResolvedValue(true);
    await mount();
    fireEvent.click(screen.getByTestId('media-organizer-apply-run-1'));
    await waitFor(() =>
      expect(mutation('ApplyMediaOrganizerRun')).toHaveBeenCalledWith({
        variables: { run_id: 'run-1', url: '/' },
      })
    );
    expect(ops.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('4') })
    );
  });

  it('does not apply when declined, and surfaces a failed apply', async () => {
    ops.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    ops.mut.ApplyMediaOrganizerRun = vi.fn().mockRejectedValue(new Error('locked'));
    await mount();
    fireEvent.click(screen.getByTestId('media-organizer-apply-run-1'));
    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(ops.mut.ApplyMediaOrganizerRun).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('media-organizer-apply-run-1'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('locked'));
  });

  it('rolls back destructively after confirmation', async () => {
    ops.confirm.mockResolvedValue(true);
    await mount();
    fireEvent.click(screen.getByTestId('media-organizer-rollback-run-1'));
    await waitFor(() =>
      expect(mutation('RollbackMediaOrganizerRun')).toHaveBeenCalledWith({
        variables: { run_id: 'run-1', url: '/' },
      })
    );
    expect(ops.confirm).toHaveBeenCalledWith(expect.objectContaining({ destructive: true }));
  });

  it('does not roll back when declined, and surfaces a failed rollback', async () => {
    ops.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    ops.mut.RollbackMediaOrganizerRun = vi.fn().mockRejectedValue(new Error('cannot undo'));
    await mount();
    fireEvent.click(screen.getByTestId('media-organizer-rollback-run-1'));
    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(ops.mut.RollbackMediaOrganizerRun).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('media-organizer-rollback-run-1'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('cannot undo'));
  });

  it('disables apply and rollback for a run with nothing pending or done', async () => {
    ops.q.MediaOrganizerRuns = { data: { mediaOrganizerRuns: [run({ PENDING: 0, DONE: 0 })] } };
    await mount();
    expect(screen.getByTestId('media-organizer-apply-run-1')).toBeDisabled();
    expect(screen.getByTestId('media-organizer-rollback-run-1')).toBeDisabled();
    expect(screen.getByTestId('media-organizer-view-run-1')).toBeEnabled();
  });
});

describe('Media organizer job state', () => {
  it('warns and locks every action while an organizer job is running', async () => {
    m.jobs = [{ kind: 'MEDIA_ORGANIZE', status: 'RUNNING' }];
    await mount();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByTestId('media-organizer-dry-run')).toBeDisabled();
    expect(screen.getByTestId('media-organizer-start')).toBeDisabled();
    expect(screen.getByTestId('media-organizer-apply-run-1')).toBeDisabled();
  });

  it('ignores other job kinds and finished organizer jobs', async () => {
    m.jobs = [
      { kind: 'DB_BACKUP', status: 'RUNNING' },
      { kind: 'MEDIA_ORGANIZE', status: 'DONE' },
    ];
    await mount();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByTestId('media-organizer-start')).toBeEnabled();
  });

  it('refreshes the runs once more when a running job finishes', async () => {
    const refetch = vi.fn().mockResolvedValue({});
    ops.q.MediaOrganizerRuns = { data: { mediaOrganizerRuns: [run()] }, refetch };
    m.jobs = [{ kind: 'MEDIA_ORGANIZE', status: 'RUNNING' }];
    function Host() {
      const [, force] = useState(0);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              m.jobs = [{ kind: 'MEDIA_ORGANIZE', status: 'DONE' }];
              force((n) => n + 1);
            }}
          >
            finish job
          </button>
          <MediaOrganizerPage />
        </>
      );
    }
    renderWithProviders(<Host />);
    await screen.findByTestId('media-organizer-view-run-1');
    expect(refetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'finish job' }));
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows a progress bar while the first load is pending', () => {
    ops.q.MediaOrganizerRuns = { loading: true };
    const { container } = renderWithProviders(<MediaOrganizerPage />);
    expect(container.querySelector('.MuiLinearProgress-root')).toBeInTheDocument();
  });

  it('shows a load error instead of runs', async () => {
    ops.q.MediaOrganizerRuns = { error: new Error('graphql down') };
    renderWithProviders(<MediaOrganizerPage />);
    expect(await screen.findByText('The organizer runs could not be loaded.')).toBeInTheDocument();
    expect(screen.queryByTestId('media-organizer-view-run-1')).not.toBeInTheDocument();
  });
});

describe('Media organizer run files', () => {
  it('opens the files for the chosen run, scoped to that run', async () => {
    ops.tableRows = [
      file(),
      file({ id: 'f2', file_path: '/old/b.png', new_file_path: '', owners: [], status: 'FAILED', error: 'ImageKit 500' }),
    ];
    await mount();
    fireEvent.click(screen.getByTestId('media-organizer-view-run-1'));
    expect(await screen.findByText('/old/path/a.png')).toBeInTheDocument();
    expect(screen.getByText('/new/path/a.png')).toBeInTheDocument();
    expect(screen.getByText('pod:1, user:2')).toBeInTheDocument();
    expect(screen.getByText('ImageKit 500')).toBeInTheDocument();
    expect(m.tableFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'mediaOrganizerFilesTable',
      { extraVariables: { run_id: 'run-1' } },
      ['run-1']
    );
  });
});
