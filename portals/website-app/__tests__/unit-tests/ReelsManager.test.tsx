import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { notifyError } from '@duncit/dialogs';
import ReelsManager from '../../src/pages/website/reels/ReelsManager';
import { renderWithProviders } from '../testkit';
import { en } from '../en';
import {
  createReelMock,
  deleteReelMock,
  makeReel,
  reelSettingsMock,
  reelsTableMock,
  updateReelMock,
  type ReelFailure,
  type ReelMock,
} from '../mocks/reels.mock';

const upload = vi.hoisted(() => vi.fn());
const uploadState = vi.hoisted(() => ({ uploading: false }));

vi.mock('@duncit/dialogs', async (importOriginal) => ({ ...(await importOriginal<typeof import('@duncit/dialogs')>()), notifyError: vi.fn() }));
vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  useImagekitDirectUpload: () => ({ upload, uploading: uploadState.uploading }),
}));

const ROWS: ReelMock[] = [
  makeReel(),
  makeReel({ id: 'r2', title: '', description: '', is_active: false, sort_order: 2, file_size_bytes: 2048 }),
];

interface Seen {
  table: Record<string, unknown>[];
  create: Record<string, unknown>[];
  update: Record<string, unknown>[];
  remove: Record<string, unknown>[];
}

const mount = (extra: { settings?: MockedResponse; fail?: Partial<Record<'create' | 'update' | 'remove', ReelFailure>> } = {}) => {
  const seen: Seen = { table: [], create: [], update: [], remove: [] };
  renderWithProviders(<ReelsManager site="MAIN" />, {
    mocks: [
      reelsTableMock(ROWS, seen.table),
      extra.settings ?? reelSettingsMock(),
      createReelMock(seen.create, extra.fail?.create),
      updateReelMock(seen.update, extra.fail?.update),
      deleteReelMock(seen.remove, extra.fail?.remove),
    ],
  });
  return seen;
};

const addButton = () => screen.getByRole('button', { name: en('websiteApp.reels.add') });

beforeEach(() => {
  vi.mocked(notifyError).mockClear();
  upload.mockReset();
  uploadState.uploading = false;
  localStorage.setItem('duncit-table-cols:website-reels', JSON.stringify({ sort_order: true, created_at: false }));
});

describe('ReelsManager — the list', () => {
  it('lists the website reels with title fallback, size and visibility, filtered to the site', async () => {
    const seen = mount();
    expect(await screen.findByText('Sunday jam')).toBeInTheDocument();
    expect(screen.getByText(en('websiteApp.reels.untitled'))).toBeInTheDocument();
    expect(screen.getByText(en('websiteApp.reels.visible'))).toBeInTheDocument();
    expect(screen.getByText(en('websiteApp.reels.hidden'))).toBeInTheDocument();
    expect(screen.getByText('5.0 MB')).toBeInTheDocument();
    expect(screen.getByLabelText(en('websiteApp.reels.preview', { title: 'Sunday jam' }))).toHaveAttribute('src', ROWS[0].video_url);
    const query = JSON.stringify(seen.table[0]);
    expect(query).toContain('"field":"site"');
    expect(query).toContain('"value":"MAIN"');
  });

  it('keeps Add disabled and says so when the size cap could not be read', async () => {
    mount({ settings: reelSettingsMock({ fail: true }) });
    expect(await screen.findByText(en('websiteApp.reels.settings.loadFailed'))).toBeInTheDocument();
    expect(addButton()).toBeDisabled();
  });
});

describe('ReelsManager — add and edit', () => {
  const fillAndUpload = async (dialog: HTMLElement, file: File) => {
    const input = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
  };

  it('uploads a video, then creates the reel for this website', async () => {
    upload.mockResolvedValue('https://ik.test/website/reels/new.mp4');
    const seen = mount();
    await screen.findByText('Sunday jam');
    await waitFor(() => expect(addButton()).toBeEnabled());
    fireEvent.click(addButton());
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(en('websiteApp.reels.dialogAdd'))).toBeInTheDocument();
    expect(within(dialog).getByText(en('websiteApp.reels.sizeHint', { max: 20 }))).toBeInTheDocument();

    // Submitting with no video explains what is missing.
    fireEvent.click(within(dialog).getByRole('button', { name: en('shell.common.save') }));
    expect(await within(dialog).findByText(en('websiteApp.reels.errVideo'))).toBeInTheDocument();
    expect(seen.create).toHaveLength(0);

    await fillAndUpload(dialog, new File([new Uint8Array(3 * 1024 * 1024)], 'new.mp4', { type: 'video/mp4' }));
    await waitFor(() => expect(within(dialog).getByText(en('websiteApp.reels.uploaded', { size: '3.0' }))).toBeInTheDocument());
    expect(upload).toHaveBeenCalledWith(expect.any(File), '/website/reels', expect.any(Function));
    fireEvent.change(within(dialog).getByLabelText(new RegExp(en('websiteApp.reels.fieldTitle'))), { target: { value: 'New reel' } });
    fireEvent.click(within(dialog).getByRole('button', { name: en('shell.common.save') }));

    await waitFor(() => expect(seen.create).toHaveLength(1));
    expect(seen.create[0]).toEqual({
      input: {
        site: 'MAIN',
        title: 'New reel',
        description: '',
        video_url: 'https://ik.test/website/reels/new.mp4',
        file_size_bytes: 3 * 1024 * 1024,
        sort_order: 0,
        is_active: true,
      },
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('edits a reel in place and sends its id', async () => {
    const seen = mount();
    await screen.findByText('Sunday jam');
    fireEvent.click(screen.getAllByRole('button', { name: en('shell.common.edit') })[0]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(en('websiteApp.reels.dialogEdit'))).toBeInTheDocument();
    const title = within(dialog).getByLabelText(new RegExp(en('websiteApp.reels.fieldTitle')));
    expect(title).toHaveValue('Sunday jam');
    fireEvent.change(title, { target: { value: 'Sunday jam v2' } });
    fireEvent.click(within(dialog).getByRole('switch'));
    fireEvent.click(within(dialog).getByRole('button', { name: en('shell.common.save') }));
    await waitFor(() => expect(seen.update).toHaveLength(1));
    expect(seen.update[0]).toMatchObject({ id: 'r1', input: { site: 'MAIN', title: 'Sunday jam v2', is_active: false, sort_order: 1 } });
  });

  it('shows the server explanation for a refused write and a generic line otherwise', async () => {
    mount({ fail: { update: [{ message: 'The slider is full', code: 'BAD_USER_INPUT' }] } });
    await screen.findByText('Sunday jam');
    fireEvent.click(screen.getAllByRole('button', { name: en('shell.common.edit') })[0]);
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: en('shell.common.save') }));
    expect(await screen.findByText('The slider is full')).toBeInTheDocument();
  });

  it('hides a non-user error behind the console sentence and keeps the dialog open', async () => {
    mount({ fail: { create: [{ message: 'ECONNRESET at 10.0.0.4', code: 'INTERNAL_SERVER_ERROR' }] } });
    upload.mockResolvedValue('https://ik.test/website/reels/new.mp4');
    await screen.findByText('Sunday jam');
    await waitFor(() => expect(addButton()).toBeEnabled());
    fireEvent.click(addButton());
    const dialog = await screen.findByRole('dialog');
    await fillAndUpload(dialog, new File(['x'], 'a.mp4', { type: 'video/mp4' }));
    await within(dialog).findByText(en('websiteApp.reels.uploaded', { size: '0.0' }));
    fireEvent.click(within(dialog).getByRole('button', { name: en('shell.common.save') }));
    expect(await within(dialog).findByText(en('websiteApp.reels.saveFailed'))).toBeInTheDocument();
    expect(screen.queryByText(/ECONNRESET/)).not.toBeInTheDocument();
  });

  it('closes the dialog on cancel without writing', async () => {
    const seen = mount();
    await screen.findByText('Sunday jam');
    fireEvent.click(screen.getAllByRole('button', { name: en('shell.common.edit') })[0]);
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: en('shell.common.cancel') }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(seen.update).toHaveLength(0);
  });
});

describe('ReelsManager — delete', () => {
  const askDelete = async () => {
    await screen.findByText('Sunday jam');
    fireEvent.click(screen.getAllByRole('button', { name: en('shell.common.delete') })[0]);
    return screen.findByRole('dialog');
  };

  it('deletes after confirmation, naming the reel', async () => {
    const seen = mount();
    const dialog = await askDelete();
    expect(within(dialog).getByText(en('websiteApp.reels.deleteText', { title: 'Sunday jam' }))).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: en('shell.common.delete') }));
    await waitFor(() => expect(seen.remove).toEqual([{ id: 'r1' }]));
  });

  it('does nothing when the operator backs out', async () => {
    const seen = mount();
    const dialog = await askDelete();
    fireEvent.click(within(dialog).getByRole('button', { name: en('shell.common.cancel') }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(seen.remove).toHaveLength(0);
  });

  it('tells the operator when the delete failed', async () => {
    mount({ fail: { remove: [{ message: 'nope' }] } });
    const dialog = await askDelete();
    fireEvent.click(within(dialog).getByRole('button', { name: en('shell.common.delete') }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(en('websiteApp.reels.deleteFailed')));
  });
});
