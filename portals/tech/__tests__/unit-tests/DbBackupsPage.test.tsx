import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { backupRow, backupSettings, backupStore, restoreJob } from '../mocks/backups.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('@duncit/table', async (io) => {
  const actual = await io<typeof import('@duncit/table')>();
  const { ops: o } = await import('../mocks/ops');
  return { ...actual, useApolloTableFetch: () => async () => ({ rows: o.tableRows, total: o.tableRows.length }) };
});

import DbBackupsPage from '../../src/pages/database/backups';

beforeEach(() => {
  resetOps();
  ops.tableRows = [backupRow()];
  ops.q = {
    DbBackupSettings: { data: { dbBackupSettings: backupSettings() } },
    DbBackupStore: { data: { dbBackupStore: backupStore() } },
    DbRestoreJob: { data: { dbRestoreJob: null } },
  };
});

const mount = async () => {
  renderWithProviders(<DbBackupsPage />);
  return (await screen.findByText('duncit-1.dbk.gz', { selector: 'p' })).closest('[role="row"]') as HTMLElement;
};
const rowButtons = (r: HTMLElement) => within(r).getAllByRole('button');

describe('Database > Backups page', () => {
  it('shows the archive row, the store card and the saved schedule', async () => {
    await mount();
    expect(screen.getByTestId('backup-store-latest')).toHaveTextContent('duncit-1.dbk.gz');
    expect(screen.getByDisplayValue('7')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
  });

  it('surfaces a failing settings query instead of an empty page', async () => {
    ops.q.DbBackupSettings = { error: new Error('not authorised') };
    renderWithProviders(<DbBackupsPage />);
    expect(await screen.findByText('not authorised')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload archive' })).toBeDisabled();
  });

  it('starts a backup and reports it', async () => {
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Back up now' }));
    await waitFor(() => expect(mutation('RunDbBackup')).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalled());
  });

  it('reports a backup that could not start', async () => {
    ops.mut.RunDbBackup = vi.fn().mockRejectedValue(new Error('disk full'));
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Back up now' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('disk full'));
  });

  it('deletes only after the operator confirms', async () => {
    ops.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const r = await mount();
    const del = rowButtons(r).at(-1) as HTMLElement;
    fireEvent.click(del);
    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(mutation('DeleteDbBackup')).not.toHaveBeenCalled();
    fireEvent.click(del);
    await waitFor(() => expect(mutation('DeleteDbBackup')).toHaveBeenCalledWith({ variables: { id: 'b1' } }));
    expect(ops.notifySuccess).toHaveBeenCalledWith('Archive deleted.');
  });

  it('reports a delete that failed', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.DeleteDbBackup = vi.fn().mockRejectedValue(new Error('locked'));
    const r = await mount();
    fireEvent.click(rowButtons(r).at(-1) as HTMLElement);
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('locked'));
  });

  it('opens a minted download link, and reports a failed mint', async () => {
    ops.mut.RequestDbBackupDownload = vi
      .fn()
      .mockResolvedValueOnce({ data: { requestDbBackupDownload: { url: 'https://files.example.test/a' } } })
      .mockRejectedValueOnce(new Error('expired'));
    const r = await mount();
    const download = rowButtons(r)[0];
    fireEvent.click(download);
    await waitFor(() =>
      expect(window.open).toHaveBeenCalledWith('https://files.example.test/a', '_blank', 'noopener'),
    );
    fireEvent.click(download);
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('expired'));
  });

  it('shows a finished restore with its failure reason', async () => {
    ops.q.DbRestoreJob = { data: { dbRestoreJob: restoreJob({ status: 'FAILED', error: 'archive truncated' }) } };
    await mount();
    expect(screen.getByText('Restore failed')).toBeInTheDocument();
    expect(screen.getByText('archive truncated')).toBeInTheDocument();
  });

  it('shows a running restore with the collection it is on', async () => {
    ops.q.DbRestoreJob = { data: { dbRestoreJob: restoreJob({ status: 'RUNNING', currentCollection: 'users' }) } };
    await mount();
    expect(screen.getByText('Restore running')).toBeInTheDocument();
    expect(screen.getByText('Restoring users')).toBeInTheDocument();
  });

  it('draws running, failed and file-less rows differently', async () => {
    ops.tableRows = [
      backupRow({ id: 'r', status: 'RUNNING', trigger: 'UPLOADED', currentCollection: 'pods', hasFile: false }),
      backupRow({ id: 'f', status: 'FAILED', error: 'mongo down', fileName: 'bad.dbk.gz' }),
      backupRow({ id: 'g', hasFile: false, fileName: null, sizeBytes: 0, startedBy: null }),
      backupRow({ id: 'u', trigger: 'UPLOADED', archiveTakenAt: '2025-12-25T00:00:00.000Z', fileName: 'up.dbk.gz' }),
    ];
    renderWithProviders(<DbBackupsPage />);
    expect(await screen.findByText('Checking archive')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('bad.dbk.gz', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getAllByText('Archive deleted').length).toBeGreaterThan(0);
    expect(screen.getByText(/^Taken /)).toBeInTheDocument();
  });
});
