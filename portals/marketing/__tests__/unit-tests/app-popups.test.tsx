import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import {
  appPopupAudienceListsMock,
  createAppPopupMock,
  deleteAppPopupMock,
  makeAppPopupRow,
  updateAppPopupMock,
} from '../mocks';
import { __setTableRows, fetchRowsFrom } from './table-mock';

// ---------------------------------------------------------------------------
// Module mocks — the shared table, the confirm/toast host, the image upload
// field (only its ImageKit round-trip is swapped for two buttons) and the MUI X
// picker (a plain input that still shows the helper text the form hands it).
// ---------------------------------------------------------------------------
vi.mock('@duncit/table', () => import('./table-mock'));

const dialogsMock = vi.hoisted(() => ({ confirm: vi.fn(), notifyError: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  useConfirm: () => dialogsMock.confirm,
  notifyError: dialogsMock.notifyError,
}));

vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  SingleImageUploadField: ({
    label,
    helperText,
    onChange,
  }: {
    label: string;
    helperText?: string;
    onChange: (url: string) => void;
  }) => (
    <div>
      <span>{label}</span>
      <button type="button" onClick={() => onChange('https://cdn.duncit.com/app-popups/new.jpg')}>
        upload-image
      </button>
      <button type="button" onClick={() => onChange('')}>
        remove-image
      </button>
      <span>{helperText}</span>
    </div>
  ),
}));

vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: ({
    label,
    value,
    onChange,
    slotProps,
  }: {
    label: string;
    value: Date | null;
    onChange: (d: Date | null) => void;
    slotProps?: { textField?: { helperText?: string } };
  }) => (
    <div>
      <input
        aria-label={label}
        value={value ? value.toISOString() : ''}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
      />
      <span>{slotProps?.textField?.helperText}</span>
    </div>
  ),
}));

import AppPopupsPage from '../../src/pages/app-popups-page/AppPopupsPage';
import AppPopupsTable from '../../src/pages/app-popups-page/AppPopupsTable';

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

beforeEach(() => {
  __setTableRows([]);
  dialogsMock.confirm = vi.fn().mockResolvedValue(true);
});
afterEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
describe('AppPopupsTable', () => {
  const renderTable = (
    rows: ReturnType<typeof makeAppPopupRow>[],
    handlers: { onEdit?: () => void; onDelete?: () => void } = {},
  ) =>
    renderWithProviders(
      <AppPopupsTable
        fetchRows={fetchRowsFrom(rows)}
        refetchRef={{ current: null }}
        listName={(id) => (id === 'a1' ? 'Pune regulars' : '—')}
        onEdit={handlers.onEdit ?? vi.fn()}
        onDelete={handlers.onDelete ?? vi.fn()}
      />,
    );

  // Live is what a phone gets right now: enabled AND inside the window.
  it('reads each popup as Disabled, Live, Scheduled or Ended', async () => {
    renderTable([
      makeAppPopupRow({ id: 'off', enabled: false }),
      makeAppPopupRow({ id: 'live' }),
      makeAppPopupRow({ id: 'soon', start_at: daysFromNow(2), end_at: daysFromNow(9) }),
      makeAppPopupRow({ id: 'gone', start_at: daysFromNow(-9), end_at: daysFromNow(-2) }),
    ]);
    const rows = await screen.findAllByTestId('table-row');
    expect(within(rows[0]).getByTestId('cell-enabled')).toHaveTextContent('Disabled');
    expect(within(rows[1]).getByTestId('cell-enabled')).toHaveTextContent('Live');
    expect(within(rows[2]).getByTestId('cell-enabled')).toHaveTextContent('Scheduled');
    expect(within(rows[3]).getByTestId('cell-enabled')).toHaveTextContent('Ended');
  });

  it('names the platform, the audience and whether the popup can be closed', async () => {
    renderTable([
      makeAppPopupRow({ id: 'both' }),
      makeAppPopupRow({
        id: 'ios',
        platform: 'IOS',
        audience_type: 'AUDIENCE_LIST',
        audience_list_id: 'a1',
        close_button_enabled: false,
      }),
      makeAppPopupRow({ id: 'android', platform: 'ANDROID' }),
    ]);
    const rows = await screen.findAllByTestId('table-row');
    expect(within(rows[0]).getByTestId('cell-platform')).toHaveTextContent('Both (iOS + Android)');
    expect(within(rows[1]).getByTestId('cell-platform')).toHaveTextContent('iOS only');
    expect(within(rows[2]).getByTestId('cell-platform')).toHaveTextContent('Android only');
    expect(within(rows[0]).getByTestId('cell-audience_type')).toHaveTextContent('All users');
    expect(within(rows[1]).getByTestId('cell-audience_type')).toHaveTextContent('Pune regulars');
    expect(within(rows[0]).getByTestId('cell-close_button_enabled')).toHaveTextContent('Yes');
    expect(within(rows[1]).getByTestId('cell-close_button_enabled')).toHaveTextContent('No');
  });

  it('shows where the button leads, and nothing when the popup has no button', async () => {
    renderTable([makeAppPopupRow(), makeAppPopupRow({ id: 'plain', cta_label: '', cta_url: '' })]);
    const rows = await screen.findAllByTestId('table-row');
    expect(within(rows[0]).getByTestId('cell-name')).toHaveTextContent('→ Shop now: /shop');
    expect(within(rows[1]).getByTestId('cell-name')).not.toHaveTextContent('→');
  });

  it('wires the Edit and Delete row actions', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    renderTable([makeAppPopupRow()], { onEdit, onDelete });
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'pp1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'pp1' }));
  });
});

// ===========================================================================
describe('AppPopupsPage', () => {
  const renderPage = (mocks = [appPopupAudienceListsMock()]) =>
    renderWithProviders(<AppPopupsPage />, { mocks });

  const fillNewPopup = async () => {
    fireEvent.click(await screen.findByRole('button', { name: 'New Popup' }));
    fireEvent.change(await screen.findByLabelText(/^Name/), { target: { value: 'Diwali pod sale' } });
    fireEvent.click(screen.getByText('upload-image'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create popup' })).toBeEnabled());
  };

  it('says so when there are no popups yet, and opens the create dialog', async () => {
    renderPage();
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No app popups yet');
    fireEvent.click(screen.getByRole('button', { name: 'New Popup' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('New popup')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Create popup' })).toBeInTheDocument();
  });

  it('creates a popup, toasts, and lets the toast be dismissed', async () => {
    renderPage([appPopupAudienceListsMock(), createAppPopupMock()]);
    await fillNewPopup();
    fireEvent.click(screen.getByRole('button', { name: 'Create popup' }));

    expect(await screen.findByText('Popup created')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Popup created')).not.toBeInTheDocument());
  });

  it('locks Cancel while the create request is in flight', async () => {
    renderPage([appPopupAudienceListsMock(), createAppPopupMock({}, { delay: 200 })]);
    await fillNewPopup();
    fireEvent.click(screen.getByRole('button', { name: 'Create popup' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled());
    expect(await screen.findByText('Popup created')).toBeInTheDocument();
  });

  it('keeps the dialog open with the server error when a create fails', async () => {
    renderPage([appPopupAudienceListsMock(), createAppPopupMock({}, { failWith: 'Image host not allowed' })]);
    await fillNewPopup();
    fireEvent.click(screen.getByRole('button', { name: 'Create popup' }));
    expect(await screen.findByText('Image host not allowed')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes the dialog from Cancel and from Escape', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'New Popup' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'New Popup' }));
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  // A list deleted after the popup was aimed at it has no name left to show.
  it('names the saved list a popup targets, and em-dashes one that is gone', async () => {
    __setTableRows([
      makeAppPopupRow({ id: 'p1', audience_type: 'AUDIENCE_LIST', audience_list_id: 'a1' }),
      makeAppPopupRow({ id: 'p2', audience_type: 'AUDIENCE_LIST', audience_list_id: 'deleted-list' }),
    ]);
    renderPage();
    const rows = await screen.findAllByTestId('table-row');
    await waitFor(() =>
      expect(within(rows[0]).getByTestId('cell-audience_type')).toHaveTextContent('Pune regulars'),
    );
    expect(within(rows[1]).getByTestId('cell-audience_type')).toHaveTextContent('—');
  });

  it('opens a popup pre-filled for editing and saves the change', async () => {
    __setTableRows([makeAppPopupRow({ name: 'Old name' })]);
    renderPage([appPopupAudienceListsMock(), updateAppPopupMock()]);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit popup')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/)).toHaveValue('Old name');

    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'New name' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Popup updated')).toBeInTheDocument();
  });

  it('deletes a popup after confirming, and says so', async () => {
    __setTableRows([makeAppPopupRow()]);
    renderPage([appPopupAudienceListsMock(), deleteAppPopupMock()]);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(dialogsMock.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Delete popup',
        message: 'Delete "Diwali pod sale"? It stops showing in the app immediately.',
        destructive: true,
      }),
    );
    expect(await screen.findByText('Deleted')).toBeInTheDocument();
  });

  it('does nothing when the delete is declined', async () => {
    dialogsMock.confirm = vi.fn().mockResolvedValue(false);
    __setTableRows([makeAppPopupRow()]);
    renderPage([appPopupAudienceListsMock(), deleteAppPopupMock()]);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(dialogsMock.confirm).toHaveBeenCalled());
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
    expect(dialogsMock.notifyError).not.toHaveBeenCalled();
  });

  it('reports a failed delete through notifyError', async () => {
    __setTableRows([makeAppPopupRow()]);
    renderPage([appPopupAudienceListsMock(), deleteAppPopupMock({ failWith: 'still showing' })]);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(dialogsMock.notifyError).toHaveBeenCalledWith('still showing'));
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
  });
});
