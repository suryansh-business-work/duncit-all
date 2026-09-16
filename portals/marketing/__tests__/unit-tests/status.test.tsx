import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import {
  createOfficialStatusMock,
  deleteOfficialStatusMock,
  locationsForStatusMock,
  makeOfficialStatusRow,
  STATUS_LOCATIONS,
  updateOfficialStatusMock,
} from '../mocks';
import { __setTableRows, fetchRowsFrom } from './table-mock';

// ---------------------------------------------------------------------------
// Shared module mocks — table + confirm/toast host mirror every other
// marketing-portal page spec (see short-links.test.tsx / notifications.test.tsx).
// The media picker and date-time picker keep their REAL logic (describeAttachment,
// useUploadCaps, MB) and only swap the heavy dialog UI for a couple of buttons /
// a plain input, so StatusMediaField's video-vs-image branch stays real.
// ---------------------------------------------------------------------------
vi.mock('@duncit/table', () => import('./table-mock'));

const dialogsMock = vi.hoisted(() => ({ confirm: vi.fn(), notifyError: vi.fn() }));
vi.mock('@duncit/dialogs', () => ({
  useConfirm: () => dialogsMock.confirm,
  notifyError: dialogsMock.notifyError,
}));

vi.mock('@duncit/media-picker', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/media-picker')>();
  return {
    ...actual,
    default: ({ open, onPicked }: { open: boolean; onPicked: (url: string) => void }) =>
      open ? (
        <div>
          <button type="button" onClick={() => onPicked('https://cdn.duncit.com/status/pick.jpg')}>
            pick-image
          </button>
          <button type="button" onClick={() => onPicked('https://cdn.duncit.com/status/pick.mp4')}>
            pick-video
          </button>
        </div>
      ) : null,
  };
});

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

import StatusPage from '../../src/pages/status-page/StatusPage';
import StatusTable from '../../src/pages/status-page/StatusTable';

beforeEach(() => {
  __setTableRows([]);
  dialogsMock.confirm = vi.fn().mockResolvedValue(true);
});
afterEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
describe('StatusTable', () => {
  const renderTable = (rows: ReturnType<typeof makeOfficialStatusRow>[]) =>
    renderWithProviders(
      <StatusTable
        fetchRows={fetchRowsFrom(rows)}
        refetchRef={{ current: null }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

  it('shows the title, caption, image thumbnail, global scope, no expiry and the live chip', async () => {
    const { container } = renderTable([makeOfficialStatusRow()]);
    const row = await screen.findByTestId('table-row');
    expect(row).toHaveTextContent('Diwali sale is live');
    expect(row).toHaveTextContent('20% off badminton pods');
    expect(container.querySelector('img[src="https://cdn.duncit.com/status/diwali.jpg"]')).toBeTruthy();
    expect(within(row).getByTestId('cell-scope')).toHaveTextContent('Global');
    expect(within(row).getByTestId('cell-expires_at')).toHaveTextContent('Never');
    expect(within(row).getByTestId('cell-is_active')).toHaveTextContent('Live');
    expect(within(row).getByTestId('cell-view_count')).toHaveTextContent('128');
    expect(within(row).getByTestId('cell-created_by')).toHaveTextContent('Asha Verma');
  });

  it('shows a play icon instead of an image thumbnail for a video status', async () => {
    const { container } = renderTable([makeOfficialStatusRow({ media_type: 'VIDEO' })]);
    await screen.findByTestId('table-row');
    expect(screen.getByTestId('PlayCircleIcon')).toBeInTheDocument();
    expect(container.querySelector('img[src="https://cdn.duncit.com/status/diwali.jpg"]')).toBeNull();
  });

  it('joins the picked cities for a LOCATION scope, and em-dashes an empty pick', async () => {
    renderTable([
      makeOfficialStatusRow({ id: 'os1', scope: 'LOCATION', location_names: ['Mumbai', 'Pune'] }),
      makeOfficialStatusRow({ id: 'os2', scope: 'LOCATION', location_names: [] }),
    ]);
    const rows = await screen.findAllByTestId('table-row');
    expect(within(rows[0]).getByTestId('cell-scope')).toHaveTextContent('Mumbai, Pune');
    expect(within(rows[1]).getByTestId('cell-scope')).toHaveTextContent('—');
  });

  it('reads expiry as Never, Expired, or the formatted date', async () => {
    renderTable([
      makeOfficialStatusRow({ id: 'never', expires_at: null }),
      makeOfficialStatusRow({ id: 'gone', expires_at: new Date(Date.now() - 60_000).toISOString() }),
      makeOfficialStatusRow({ id: 'live', expires_at: new Date(Date.now() + 3_600_000).toISOString() }),
    ]);
    const rows = await screen.findAllByTestId('table-row');
    expect(within(rows[0]).getByTestId('cell-expires_at')).toHaveTextContent('Never');
    expect(within(rows[1]).getByTestId('cell-expires_at')).toHaveTextContent('Expired');
    // Any live expiry is rendered as a formatted date+time, not the two known labels.
    const futureText = within(rows[2]).getByTestId('cell-expires_at').textContent ?? '';
    expect(futureText).not.toBe('Never');
    expect(futureText).not.toBe('Expired');
    expect(futureText).toContain('·');
  });

  it('shows Off when switched off, Expired when active past its date, and Live when actually live', async () => {
    renderTable([
      makeOfficialStatusRow({ id: 'off', is_live: false, is_active: false }),
      makeOfficialStatusRow({ id: 'expired-active', is_live: false, is_active: true }),
      makeOfficialStatusRow({ id: 'live', is_live: true }),
    ]);
    const rows = await screen.findAllByTestId('table-row');
    expect(within(rows[0]).getByTestId('cell-is_active')).toHaveTextContent('Off');
    expect(within(rows[1]).getByTestId('cell-is_active')).toHaveTextContent('Expired');
    expect(within(rows[2]).getByTestId('cell-is_active')).toHaveTextContent('Live');
  });

  it('em-dashes a blank publisher', async () => {
    renderTable([makeOfficialStatusRow({ created_by: '' })]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('cell-created_by')).toHaveTextContent('—');
  });

  it('wires the Edit and Delete row actions', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const row = makeOfficialStatusRow();
    renderWithProviders(
      <StatusTable
        fetchRows={fetchRowsFrom([row])}
        refetchRef={{ current: null }}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledWith(row);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(row);
  });
});

// ===========================================================================
describe('StatusPage', () => {
  const pageMocks = () => [locationsForStatusMock()];
  const renderPage = (mocks = pageMocks()) => renderWithProviders(<StatusPage />, { mocks });

  const pickImage = async () => {
    fireEvent.click(screen.getByTestId('status-media-pick'));
    fireEvent.click(await screen.findByText('pick-image'));
  };

  it('says so when there are no statuses yet, and opens the create dialog', async () => {
    renderPage();
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No statuses yet');

    fireEvent.click(screen.getByTestId('status-new'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('New status')).toBeInTheDocument();
    expect(screen.getByTestId('form-actions-row-submit')).toHaveTextContent('Create status');
  });

  it('creates a global status and shows the created toast', async () => {
    renderPage([...pageMocks(), createOfficialStatusMock()]);
    fireEvent.click(await screen.findByTestId('status-new'));

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Diwali sale is live' } });
    await pickImage();

    await waitFor(() => expect(screen.getByTestId('form-actions-row-submit')).toBeEnabled());
    fireEvent.click(screen.getByTestId('form-actions-row-submit'));

    expect(await screen.findByText('Status created')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('previews a picked video and disables Cancel while the create request is in flight', async () => {
    renderPage([...pageMocks(), createOfficialStatusMock()]);
    fireEvent.click(await screen.findByTestId('status-new'));

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New pods every Friday' } });
    fireEvent.click(screen.getByTestId('status-media-pick'));
    fireEvent.click(await screen.findByText('pick-video'));
    expect(screen.getByTestId('status-media-video')).toBeInTheDocument();
    expect(screen.getByText('Video')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByTestId('form-actions-row-submit')).toBeEnabled());
    fireEvent.click(screen.getByTestId('form-actions-row-submit'));
    expect(screen.getByTestId('status-form-cancel')).toBeDisabled();

    expect(await screen.findByText('Status created')).toBeInTheDocument();
  });

  it('reveals the city select for a LOCATION scope, flags a missing pick, and accepts one', async () => {
    renderPage([locationsForStatusMock(STATUS_LOCATIONS)]);
    fireEvent.click(await screen.findByTestId('status-new'));

    fireEvent.click(screen.getByTestId('status-scope-location'));
    expect(await screen.findByText('Pick at least one city')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByLabelText('Cities'));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Mumbai'));

    await waitFor(() => expect(screen.queryByText('Pick at least one city')).not.toBeInTheDocument());
  });

  it('reveals the date field for a Custom expiry and requires a future date', async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId('status-new'));

    fireEvent.click(screen.getByTestId('status-expiry-custom'));
    expect(await screen.findByText('Pick the date and time it expires')).toBeInTheDocument();

    const dateInput = screen.getByLabelText('Expires at');
    fireEvent.change(dateInput, { target: { value: new Date(Date.now() - 60_000).toISOString() } });
    expect(await screen.findByText('The expiry has to be in the future')).toBeInTheDocument();

    fireEvent.change(dateInput, { target: { value: new Date(Date.now() + 3_600_000).toISOString() } });
    await waitFor(() =>
      expect(screen.queryByText('The expiry has to be in the future')).not.toBeInTheDocument(),
    );
  });

  it('creates a LOCATION status expiring on a picked custom date', async () => {
    renderPage([locationsForStatusMock(STATUS_LOCATIONS), createOfficialStatusMock()]);
    fireEvent.click(await screen.findByTestId('status-new'));

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Pune weekend meetup' } });
    await pickImage();

    fireEvent.click(screen.getByTestId('status-scope-location'));
    fireEvent.mouseDown(screen.getByLabelText('Cities'));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Mumbai'));

    fireEvent.click(screen.getByTestId('status-expiry-custom'));
    fireEvent.change(screen.getByLabelText('Expires at'), {
      target: { value: new Date(Date.now() + 3_600_000).toISOString() },
    });

    await waitFor(() => expect(screen.getByTestId('form-actions-row-submit')).toBeEnabled());
    fireEvent.click(screen.getByTestId('form-actions-row-submit'));

    expect(await screen.findByText('Status created')).toBeInTheDocument();
  });

  it('surfaces a create error inside the dialog instead of closing it', async () => {
    renderPage([...pageMocks(), createOfficialStatusMock({}, { failWith: 'Media host not allowed' })]);
    fireEvent.click(await screen.findByTestId('status-new'));

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Diwali sale is live' } });
    await pickImage();

    await waitFor(() => expect(screen.getByTestId('form-actions-row-submit')).toBeEnabled());
    fireEvent.click(screen.getByTestId('form-actions-row-submit'));

    expect(await screen.findByText('Media host not allowed')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('backs out of creating without making anything', async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId('status-new'));
    fireEvent.click(screen.getByTestId('status-form-cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens the edit dialog pre-filled from an existing row and saves the change', async () => {
    __setTableRows([makeOfficialStatusRow({ title: 'Old title' })]);
    renderPage([...pageMocks(), updateOfficialStatusMock()]);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit status')).toBeInTheDocument();
    expect(screen.getByTestId('form-actions-row-submit')).toHaveTextContent('Save changes');
    expect(screen.getByLabelText('Title')).toHaveValue('Old title');

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New title' } });
    fireEvent.click(screen.getByTestId('form-actions-row-submit'));

    expect(await screen.findByText('Status updated')).toBeInTheDocument();
  });

  it('deletes a status after confirming, with the right warning copy, and toasts', async () => {
    __setTableRows([makeOfficialStatusRow()]);
    renderPage([...pageMocks(), deleteOfficialStatusMock()]);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(dialogsMock.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Delete status',
        message: 'Delete “Diwali sale is live”? It leaves the status rail immediately.',
        destructive: true,
        confirmLabel: 'Delete',
      }),
    );
    expect(await screen.findByText('Deleted')).toBeInTheDocument();
  });

  it('does nothing when the delete confirmation is declined', async () => {
    dialogsMock.confirm = vi.fn().mockResolvedValue(false);
    __setTableRows([makeOfficialStatusRow()]);
    renderPage([...pageMocks(), deleteOfficialStatusMock()]);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(dialogsMock.confirm).toHaveBeenCalled());
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
    expect(dialogsMock.notifyError).not.toHaveBeenCalled();
  });

  it('reports a delete failure through notifyError', async () => {
    __setTableRows([makeOfficialStatusRow()]);
    renderPage([...pageMocks(), deleteOfficialStatusMock({ failWith: 'still referenced' })]);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(dialogsMock.notifyError).toHaveBeenCalledWith('still referenced'));
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
  });
});
