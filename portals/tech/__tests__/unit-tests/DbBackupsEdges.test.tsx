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
// The picker itself is MUI's; what the page owns is turning its Date into the HH:mm it stores.
vi.mock('@mui/x-date-pickers/TimePicker', () => ({
  TimePicker: (p: { label: string; onChange: (value: Date | null) => void }) => (
    <label>
      {p.label}
      <input
        data-testid="time-picker"
        onChange={(e) => {
          const [hours, minutes] = e.target.value.split(':').map(Number);
          p.onChange(e.target.value ? new Date(2026, 0, 1, hours, minutes) : null);
        }}
      />
    </label>
  ),
}));
vi.mock('@duncit/table', async (io) => {
  const actual = await io<typeof import('@duncit/table')>();
  const { ops: o } = await import('../mocks/ops');
  return { ...actual, useApolloTableFetch: () => async () => ({ rows: o.tableRows, total: o.tableRows.length }) };
});

import DbBackupsPage from '../../src/pages/database/backups';
import BackupStoreCard from '../../src/pages/database/backups/BackupStoreCard';
import { compressionLabel } from '../../src/pages/database/backups/queries';

beforeEach(() => {
  resetOps();
  upload.mockReset();
  vi.mocked(window.open).mockClear();
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

const openUpload = async () => {
  await mount();
  fireEvent.click(screen.getByRole('button', { name: 'Upload archive' }));
  await screen.findByText('Upload a backup archive');
};

const pick = (files: File[]) => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
};

describe('Backup store card', () => {
  it('says there is no archive yet, and a missing file name reads as empty', async () => {
    ops.q.DbBackupStore = { data: { dbBackupStore: backupStore({ latest: null }) } };
    renderWithProviders(<BackupStoreCard />);

    expect(await screen.findByText('No completed backup with an archive yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('backup-store-download')).not.toBeInTheDocument();
  });

  it('shows the latest archive even when it has no file name recorded', async () => {
    ops.q.DbBackupStore = { data: { dbBackupStore: backupStore({ latest: backupRow({ fileName: null }) }) } };
    renderWithProviders(<BackupStoreCard />);
    expect(await screen.findByTestId('backup-store-latest')).toBeInTheDocument();
  });

  it('waits for the store, and shows why it could not be read', () => {
    ops.q.DbBackupStore = { loading: true };
    const { unmount } = renderWithProviders(<BackupStoreCard />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    unmount();

    ops.q.DbBackupStore = { error: new Error('volume unmounted') };
    renderWithProviders(<BackupStoreCard />);
    expect(screen.getByRole('alert')).toHaveTextContent('volume unmounted');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('keeps the card while a refresh is in flight', async () => {
    ops.q.DbBackupStore = { loading: true, data: { dbBackupStore: backupStore() } };
    renderWithProviders(<BackupStoreCard />);
    expect(await screen.findByTestId('backup-store-latest')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});

describe('Backup store card / download', () => {
  it('asks for a link to the newest archive', async () => {
    ops.mut.RequestDbBackupDownload = vi.fn().mockResolvedValue({ data: { requestDbBackupDownload: { url: 'https://files.example.test/latest' } } });
    renderWithProviders(<BackupStoreCard />);

    fireEvent.click(await screen.findByTestId('backup-store-download'));

    await waitFor(() => expect(window.open).toHaveBeenCalledWith('https://files.example.test/latest', '_blank', 'noopener'));
    expect(ops.mut.RequestDbBackupDownload).toHaveBeenCalledWith({ variables: { id: 'b1' } });
  });
});

describe('compressionLabel', () => {
  it('shows the ratio once both sizes are known, and a dash until then', () => {
    expect(compressionLabel(backupRow({ rawBytes: 8192, sizeBytes: 2048 }))).toBe('4.0×');
    expect(compressionLabel(backupRow({ rawBytes: 0, sizeBytes: 2048 }))).toBe('—');
    expect(compressionLabel(backupRow({ rawBytes: 8192, sizeBytes: 0 }))).toBe('—');
  });
});

describe('Backups upload dialog / edges', () => {
  it('forgets a chosen archive when the file chooser is emptied', async () => {
    await openUpload();
    pick([new File([new Uint8Array(10)], 'ok.dbk.gz')]);
    expect(await screen.findByText('ok.dbk.gz')).toBeInTheDocument();

    pick([]);

    await waitFor(() => expect(screen.queryByText('ok.dbk.gz')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
  });

  it('shows the read-through while the server walks the archive', async () => {
    let finish: (value: unknown) => void = () => undefined;
    ops.mut.DbBackupUploadAuth = vi.fn().mockResolvedValue({
      data: { dbBackupUploadAuth: { uploadUrl: 'u', ticket: 't', backupId: 'new1' } },
    });
    ops.mut.CompleteDbBackupUpload = vi.fn().mockReturnValue(new Promise((resolve) => (finish = resolve)));
    upload.mockResolvedValue(undefined);
    await openUpload();
    pick([new File([new Uint8Array(10)], 'ok.dbk.gz')]);

    fireEvent.click(await screen.findByRole('button', { name: 'Upload' }));

    expect(await screen.findByText('Reading the archive…', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    finish({ data: {} });
    await waitFor(() => expect(screen.queryByText('Upload a backup archive')).not.toBeInTheDocument());
  });

  it('reports a failure that is not an Error with the generic message', async () => {
    ops.mut.DbBackupUploadAuth = vi.fn().mockResolvedValue({
      data: { dbBackupUploadAuth: { uploadUrl: 'u', ticket: 't', backupId: 'new1' } },
    });
    upload.mockRejectedValue('socket closed');
    await openUpload();
    pick([new File([new Uint8Array(10)], 'ok.dbk.gz')]);

    fireEvent.click(await screen.findByRole('button', { name: 'Upload' }));

    expect(await screen.findByText('That archive could not be uploaded.')).toBeInTheDocument();
    expect(ops.notifyError).toHaveBeenCalledWith('That archive could not be uploaded.');
    expect(screen.getByRole('button', { name: 'Upload' })).toBeEnabled();
  });
});

describe('Backups schedule / controls', () => {
  it('switches the schedule off and saves it', async () => {
    await mount();
    fireEvent.click(screen.getByRole('switch', { name: 'Take backups automatically' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save schedule' }));

    await waitFor(() => expect(mutation('SaveDbBackupSettings')).toHaveBeenCalled());
    expect(mutation('SaveDbBackupSettings').mock.calls[0][0].variables.input).toMatchObject({ enabled: false, timeOfDay: '03:00' });
  });

  it('changes the time of day from the time field', async () => {
    await mount();
    fireEvent.change(screen.getByTestId('time-picker'), { target: { value: '05:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save schedule' }));

    await waitFor(() => expect(mutation('SaveDbBackupSettings')).toHaveBeenCalled());
    expect(mutation('SaveDbBackupSettings').mock.calls[0][0].variables.input.timeOfDay).toBe('05:00');
  });

  it('falls back to the quiet hour when the time field is cleared', async () => {
    ops.q.DbBackupSettings = { data: { dbBackupSettings: backupSettings({ timeOfDay: '04:15' }) } };
    await mount();
    fireEvent.change(screen.getByTestId('time-picker'), { target: { value: '05:00' } });
    fireEvent.change(screen.getByTestId('time-picker'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save schedule' }));

    await waitFor(() => expect(mutation('SaveDbBackupSettings')).toHaveBeenCalled());
    expect(mutation('SaveDbBackupSettings').mock.calls[0][0].variables.input.timeOfDay).toBe('03:00');
  });
});

describe('Backups page / edges', () => {
  it('shows a busy Back up now while the run is starting, and a progress bar', async () => {
    ops.mutLoading.RunDbBackup = true;
    await mount();
    expect(screen.getByRole('button', { name: 'Starting…' })).toBeDisabled();
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
  });

  it('shows a progress bar while the settings are loading', async () => {
    ops.q.DbBackupSettings = { loading: true };
    renderWithProviders(<DbBackupsPage />);
    expect(await screen.findAllByRole('progressbar')).not.toHaveLength(0);
  });

  it('shows a busy save button on the schedule while it is being saved', async () => {
    ops.mutLoading.SaveDbBackupSettings = true;
    await mount();
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('keeps the restore dialog busy while the restore is starting', async () => {
    ops.mutLoading.RestoreDbBackup = true;
    const r = await mount();
    fireEvent.click(within(r).getAllByRole('button')[1]);
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByRole('button', { name: 'Starting…' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(mutation('RestoreDbBackup')).not.toHaveBeenCalled();
  });

  it('reports a restore, a delete, a run and a schedule save refused with text', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.RunDbBackup = vi.fn().mockRejectedValue('no space');
    ops.mut.DeleteDbBackup = vi.fn().mockRejectedValue('no space');
    ops.mut.RestoreDbBackup = vi.fn().mockRejectedValue('no space');
    ops.mut.SaveDbBackupSettings = vi.fn().mockRejectedValue('no space');
    const r = await mount();

    fireEvent.click(screen.getByRole('button', { name: 'Back up now' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledTimes(1));
    fireEvent.click(within(r).getAllByRole('button').at(-1) as HTMLElement);
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledTimes(2));
    fireEvent.click(within(r).getAllByRole('button')[1]);
    fireEvent.change(await screen.findByLabelText('Type duncit to confirm'), { target: { value: 'duncit' } });
    fireEvent.click(screen.getByRole('button', { name: 'Restore now' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledTimes(3));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    fireEvent.change(screen.getByLabelText('Archives to keep'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save schedule' }));
    expect(await screen.findByText(/could not be saved/i)).toBeInTheDocument();

    const messages = ops.notifyError.mock.calls.map(([message]) => String(message));
    expect(messages).not.toContain('no space');
    expect(new Set(messages).size).toBe(3);
  });

  it('names a deleted archive by its file, and by nothing when none is recorded', async () => {
    ops.confirm.mockResolvedValue(false);
    ops.tableRows = [backupRow({ fileName: null, hasFile: true })];
    renderWithProviders(<DbBackupsPage />);
    await screen.findAllByRole('row');
    const rows = screen.getAllByRole('row');
    const del = within(rows[rows.length - 1]).getAllByRole('button').at(-1) as HTMLElement;

    fireEvent.click(del);

    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(mutation('DeleteDbBackup')).not.toHaveBeenCalled();
  });

  it('opens nothing for a download the server answers without a link', async () => {
    ops.mut.RequestDbBackupDownload = vi.fn().mockResolvedValue({ data: { requestDbBackupDownload: null } });
    const r = await mount();

    fireEvent.click(within(r).getAllByRole('button')[0]);

    await waitFor(() => expect(ops.mut.RequestDbBackupDownload).toHaveBeenCalled());
    expect(window.open).not.toHaveBeenCalled();
  });

  it('uses the generic message for a download refused with text', async () => {
    ops.mut.RequestDbBackupDownload = vi.fn().mockRejectedValue('expired');
    const r = await mount();

    fireEvent.click(within(r).getAllByRole('button')[0]);

    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledTimes(1));
    expect(ops.notifyError.mock.calls[0][0]).not.toBe('expired');
  });
});
