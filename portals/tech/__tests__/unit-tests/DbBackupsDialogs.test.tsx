import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { backupRow, backupSettings, backupStore } from '../mocks/backups.mock';

const upload = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('@duncit/media-picker', async (io) => ({
  ...(await io<typeof import('@duncit/media-picker')>()),
  uploadFileWithTicket: upload,
}));
vi.mock('@duncit/table', async (io) => {
  const actual = await io<typeof import('@duncit/table')>();
  const { ops: o } = await import('../mocks/ops');
  return { ...actual, useApolloTableFetch: () => async () => ({ rows: o.tableRows, total: o.tableRows.length }) };
});

import DbBackupsPage from '../../src/pages/database/backups';

beforeEach(() => {
  resetOps();
  upload.mockReset();
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

describe('Backups restore dialog', () => {
  it('keeps Restore disabled until the live database name is typed, then starts it', async () => {
    const r = await mount();
    fireEvent.click(within(r).getAllByRole('button')[1]);
    const confirm = await screen.findByRole('button', { name: 'Restore now' });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Type duncit to confirm'), { target: { value: 'wrong' } });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Type duncit to confirm'), { target: { value: ' duncit ' } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(mutation('RestoreDbBackup')).toHaveBeenCalledWith({ variables: { id: 'b1' } }));
    await waitFor(() => expect(screen.queryByText('Restore the database')).not.toBeInTheDocument());
  });

  it('warns when the archive came from another database, and reports a failed restore', async () => {
    ops.tableRows = [backupRow({ database: 'other-db' })];
    ops.mut.RestoreDbBackup = vi.fn().mockRejectedValue(new Error('restore locked'));
    const r = await mount();
    fireEvent.click(within(r).getAllByRole('button')[1]);
    expect(await screen.findByText(/taken from other-db, not from duncit/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Type duncit to confirm'), { target: { value: 'duncit' } });
    fireEvent.click(screen.getByRole('button', { name: 'Restore now' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('restore locked'));
    expect(screen.getByText('Restore the database')).toBeInTheDocument();
  });

  it('cancel closes the dialog without restoring', async () => {
    const r = await mount();
    fireEvent.click(within(r).getAllByRole('button')[1]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mutation('RestoreDbBackup')).not.toHaveBeenCalled();
  });
});

describe('Backups upload dialog', () => {
  const pick = (name: string, size = 10) => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([new Uint8Array(size)], name);
    fireEvent.change(input, { target: { files: [file] } });
  };

  it('rejects a wrong extension and an oversized archive before any request', async () => {
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Upload archive' }));
    await screen.findByText('Upload a backup archive');
    pick('notes.txt');
    expect(await screen.findByText(/Choose a \.dbk\.gz file/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
    pick('big.dbk.gz', 5000);
    expect(await screen.findByText(/That archive is/)).toBeInTheDocument();
    expect(mutation('DbBackupUploadAuth')).not.toHaveBeenCalled();
  });

  it('sends a valid archive through pass, bytes and read-through, then refreshes', async () => {
    ops.mut.DbBackupUploadAuth = vi.fn().mockResolvedValue({
      data: { dbBackupUploadAuth: { uploadUrl: 'https://up.example.test', ticket: 't', backupId: 'new1' } },
    });
    upload.mockResolvedValue(undefined);
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Upload archive' }));
    await screen.findByText('Upload a backup archive');
    pick('ok.dbk.gz');
    fireEvent.click(await screen.findByRole('button', { name: 'Upload' }));
    await waitFor(() =>
      expect(mutation('CompleteDbBackupUpload')).toHaveBeenCalledWith({ variables: { id: 'new1' } }),
    );
    expect(mutation('DbBackupUploadAuth')).toHaveBeenCalledWith({ variables: { fileName: 'ok.dbk.gz' } });
    expect(ops.notifySuccess).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Upload a backup archive')).not.toBeInTheDocument());
  });

  it('keeps the dialog open and shows the error when the transfer fails', async () => {
    ops.mut.DbBackupUploadAuth = vi.fn().mockResolvedValue({
      data: { dbBackupUploadAuth: { uploadUrl: 'u', ticket: 't', backupId: 'new1' } },
    });
    upload.mockRejectedValue(new Error('network cut'));
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Upload archive' }));
    await screen.findByText('Upload a backup archive');
    pick('ok.dbk.gz');
    fireEvent.click(await screen.findByRole('button', { name: 'Upload' }));
    expect(await screen.findByText('network cut')).toBeInTheDocument();
    expect(ops.notifyError).toHaveBeenCalledWith('network cut');
    expect(mutation('CompleteDbBackupUpload')).not.toHaveBeenCalled();
  });

  it('fails when the server hands back no pass', async () => {
    ops.mut.DbBackupUploadAuth = vi.fn().mockResolvedValue({ data: { dbBackupUploadAuth: null } });
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Upload archive' }));
    await screen.findByText('Upload a backup archive');
    pick('ok.dbk.gz');
    fireEvent.click(await screen.findByRole('button', { name: 'Upload' }));
    expect(await screen.findByText('That archive could not be uploaded.')).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
  });
});

describe('Backups schedule card and polling', () => {
  it('saves a changed schedule, and rejects keep-last outside 1..90', async () => {
    await mount();
    const keep = screen.getByLabelText('Archives to keep');
    const save = screen.getByRole('button', { name: 'Save schedule' });
    expect(save).toBeDisabled();
    fireEvent.change(keep, { target: { value: '0' } });
    fireEvent.click(save);
    expect(await screen.findByText('Keep at least 1')).toBeInTheDocument();
    expect(mutation('SaveDbBackupSettings')).not.toHaveBeenCalled();
    fireEvent.change(keep, { target: { value: '14' } });
    fireEvent.click(save);
    await waitFor(() => expect(mutation('SaveDbBackupSettings')).toHaveBeenCalled());
    const input = mutation('SaveDbBackupSettings').mock.calls[0][0].variables.input;
    expect(input).toMatchObject({ keepLast: 14, frequency: 'DAILY', timeOfDay: '03:00', enabled: true });
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith('Backup schedule saved.'));
  });

  it('shows the server error when saving fails', async () => {
    ops.mut.SaveDbBackupSettings = vi.fn().mockRejectedValue(new Error('schedule rejected'));
    await mount();
    fireEvent.change(screen.getByLabelText('Archives to keep'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save schedule' }));
    expect(await screen.findByText('schedule rejected')).toBeInTheDocument();
  });

  it('offers a weekday only for a weekly schedule', async () => {
    ops.q.DbBackupSettings = { data: { dbBackupSettings: backupSettings({ frequency: 'WEEKLY', nextRunAt: null }) } };
    await mount();
    expect(screen.getByLabelText('Day')).toBeInTheDocument();
    expect(screen.getByText(/Next run: Off/)).toBeInTheDocument();
  });

  it('polls while a backup is running and disables Back up now', async () => {
    const timers: Array<() => void> = [];
    vi.spyOn(globalThis, 'setInterval').mockImplementation(((fn: () => void) => {
      timers.push(fn);
      return 1;
    }) as unknown as typeof setInterval);
    const refetch = vi.fn().mockResolvedValue({});
    ops.q.DbRestoreJob = { data: { dbRestoreJob: null }, refetch };
    ops.tableRows = [backupRow({ id: 'run', status: 'RUNNING', hasFile: false })];
    renderWithProviders(<DbBackupsPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Back up now' })).toBeDisabled());
    await waitFor(() => expect(timers.length).toBeGreaterThan(0));
    timers.forEach((fn) => fn());
    expect(refetch).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
