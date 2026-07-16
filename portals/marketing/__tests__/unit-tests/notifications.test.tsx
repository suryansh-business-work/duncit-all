import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import {
  createNotificationMock,
  deleteNotificationMock,
  locationsMock,
  makeNotificationRow,
  makeUser,
  usersMock,
} from '../mocks';
import { __setTableRows, fetchRowsFrom } from './table-mock';

// ---------------------------------------------------------------------------
// Module mocks — shared table, media picker + toast/confirm host. GraphQL flows
// through the real Apollo `MockedProvider`.
// ---------------------------------------------------------------------------
vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/media-picker', () => ({
  default: ({ open, onPicked }: { open: boolean; onPicked: (url: string) => void }) =>
    open ? (
      <button type="button" onClick={() => onPicked('https://cdn/x.png')}>
        pick
      </button>
    ) : null,
}));
const dialogsMock = vi.hoisted(() => ({
  confirm: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock('@duncit/dialogs', () => ({
  useConfirm: () => dialogsMock.confirm,
  notifyError: dialogsMock.notifyError,
  notifySuccess: dialogsMock.notifySuccess,
  NotifyHost: () => null,
}));

import NotificationsTable from '../../src/pages/notifications-page/NotificationsTable';
import NotificationFormDialog from '../../src/pages/notifications-page/NotificationFormDialog';
import NotificationsPage from '../../src/pages/notifications-page/NotificationsPage';
import { blankForm, type NotifForm } from '../../src/pages/notifications-page/helpers';
import type { NotificationRow } from '../../src/pages/notifications-page/queries';

const rowBase = makeNotificationRow();
const locName = (id?: string | null) => (id === 'l1' ? 'Mumbai' : '—');
const locationOptions = [{ value: 'l1', label: 'Mumbai' }];

beforeEach(() => {
  __setTableRows([]);
  dialogsMock.confirm = vi.fn().mockResolvedValue(true);
});
afterEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
describe('NotificationsTable', () => {
  it('renders scope, title, delivered and failed cells across every scope', async () => {
    const rows = [
      makeNotificationRow({ id: 'g', scope: 'GLOBAL', link_url: '/pods/1', silent: true }),
      makeNotificationRow({ id: 'l', scope: 'LOCATION', location_id: 'l1' }),
      makeNotificationRow({ id: 'z', scope: 'ZONE', location_id: 'l1', zone_name: 'North' }),
      makeNotificationRow({ id: 'u', scope: 'USER', target_user_ids: ['a', 'b'], failed_count: 3 }),
      makeNotificationRow({ id: 'u0', scope: 'USER', target_user_ids: undefined as unknown as string[] }),
      makeNotificationRow({ id: 'x', scope: 'UNKNOWN' as NotificationRow['scope'] }),
    ];
    renderWithProviders(
      <NotificationsTable
        fetchRows={fetchRowsFrom(rows)}
        refetchRef={{ current: null }}
        locName={locName}
        locationOptions={locationOptions}
        toolbarActions={<span>toolbar</span>}
        onDelete={vi.fn()}
      />,
    );
    expect(await screen.findByText('toolbar')).toBeInTheDocument();
    expect(screen.getAllByText(/Location · Mumbai/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Zone · Mumbai \/ North/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Users · 2/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Users · 0/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Yes').length).toBeGreaterThan(0);
    expect(screen.getByText(/\/pods\/1/)).toBeInTheDocument();
  });

  it('invokes onDelete from the action button', async () => {
    const onDelete = vi.fn();
    renderWithProviders(
      <NotificationsTable
        fetchRows={fetchRowsFrom([rowBase])}
        refetchRef={{ current: null }}
        locName={locName}
        locationOptions={locationOptions}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(rowBase);
  });
});

// ===========================================================================
describe('NotificationFormDialog', () => {
  const baseProps = {
    open: true,
    onClose: vi.fn(),
    busy: false,
    opError: null as string | null,
    onSubmit: vi.fn(),
    locations: [{ id: 'l1', location_name: 'Mumbai', location_zones: [{ zone_name: 'North' }] }],
    users: [{ user_id: 'u1', full_name: 'Alice' }],
  };

  it('submits a valid GLOBAL notification', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<NotificationFormDialog {...baseProps} form={blankForm} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Weekend' } });
    fireEvent.change(screen.getByLabelText(/Body/), { target: { value: 'Discover pods' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].scope).toBe('GLOBAL');
    expect(onSubmit.mock.calls[0][0].silent).toBe(true);
  });

  it('reveals the location select for LOCATION scope', () => {
    const form: NotifForm = { ...blankForm, scope: 'LOCATION' };
    renderWithProviders(<NotificationFormDialog {...baseProps} form={form} />);
    expect(screen.getByLabelText('Location')).toBeInTheDocument();
  });

  it('reveals location + zone selects for ZONE scope and picks a location', () => {
    const form: NotifForm = { ...blankForm, scope: 'ZONE' };
    renderWithProviders(<NotificationFormDialog {...baseProps} form={form} />);
    expect(screen.getByRole('combobox', { name: 'Location' })).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Location' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Mumbai'));
    expect(screen.getByRole('combobox', { name: 'Zone' })).toBeInTheDocument();
  });

  it('reveals the users select for USER scope and selects a user', () => {
    const form: NotifForm = { ...blankForm, scope: 'USER' };
    const users = [
      { user_id: 'u1', full_name: 'Alice' },
      { user_id: 'u2', email: 'bob@example.com' },
      { user_id: 'u3', phone_number: '9998887776' },
    ];
    renderWithProviders(<NotificationFormDialog {...baseProps} form={form} users={users} />);
    const usersField = screen.getByLabelText('Users');
    expect(usersField).toBeInTheDocument();
    fireEvent.mouseDown(usersField);
    const listbox = within(screen.getByRole('listbox'));
    expect(listbox.getByText('bob@example.com')).toBeInTheDocument();
    expect(listbox.getByText('9998887776')).toBeInTheDocument();
    fireEvent.click(listbox.getByText('Alice'));
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
  });

  it('shows the location-required error when a ZONE form is submitted without a location', async () => {
    const form: NotifForm = { ...blankForm, scope: 'ZONE' };
    renderWithProviders(<NotificationFormDialog {...baseProps} form={form} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Weekend' } });
    fireEvent.change(screen.getByLabelText(/Body/), { target: { value: 'Discover pods' } });
    fireEvent.submit(document.querySelector('form') as HTMLFormElement);
    expect(await screen.findByText('Pick a location')).toBeInTheDocument();
  });

  it('shows the users-required error when a USER form is submitted with no users', async () => {
    const form: NotifForm = { ...blankForm, scope: 'USER' };
    renderWithProviders(<NotificationFormDialog {...baseProps} form={form} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Weekend' } });
    fireEvent.change(screen.getByLabelText(/Body/), { target: { value: 'Discover pods' } });
    fireEvent.submit(document.querySelector('form') as HTMLFormElement);
    expect(await screen.findByText('Pick at least one user')).toBeInTheDocument();
  });

  it('shows the operation error and switches audience clearing dependent fields', () => {
    const form: NotifForm = { ...blankForm, scope: 'ZONE', location_id: 'l1', zone_name: 'North' };
    renderWithProviders(<NotificationFormDialog {...baseProps} form={form} opError="Boom" />);
    expect(screen.getByText('Boom')).toBeInTheDocument();
    const audience = screen.getByLabelText('Audience');
    fireEvent.mouseDown(audience);
    const listbox = within(screen.getByRole('listbox'));
    fireEvent.click(listbox.getByText('All users (Global)'));
    expect(screen.queryByLabelText('Location')).not.toBeInTheDocument();
  });

  it('disables actions and blocks close while busy', () => {
    renderWithProviders(<NotificationFormDialog {...baseProps} form={blankForm} busy />);
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('calls onClose from Cancel', () => {
    const onClose = vi.fn();
    renderWithProviders(<NotificationFormDialog {...baseProps} form={blankForm} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});

// ===========================================================================
describe('NotificationsPage', () => {
  const refDataMocks = () => [locationsMock(), usersMock([makeUser()])];

  beforeEach(() => {
    __setTableRows([makeNotificationRow({ location_id: 'l1' })]);
  });

  it('creates a notification and shows the delivery toast', async () => {
    renderWithProviders(<NotificationsPage />, {
      mocks: [...refDataMocks(), createNotificationMock({ delivered: 5, failed: 2 })],
    });
    fireEvent.click(await screen.findByRole('button', { name: /New Notification/ }));
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Launch' } });
    fireEvent.change(screen.getByLabelText(/Body/), { target: { value: 'We are live' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));
    await waitFor(() =>
      expect(screen.getByText('Sent · delivered 5 · failed 2')).toBeInTheDocument(),
    );
  });

  it('surfaces a create error inside the dialog', async () => {
    renderWithProviders(<NotificationsPage />, {
      mocks: [...refDataMocks(), createNotificationMock({ throwMessage: 'Send failed' })],
    });
    fireEvent.click(await screen.findByRole('button', { name: /New Notification/ }));
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Launch' } });
    fireEvent.change(screen.getByLabelText(/Body/), { target: { value: 'We are live' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));
    await waitFor(() => expect(screen.getByText('Send failed')).toBeInTheDocument());
  });

  it('deletes after confirmation and toasts', async () => {
    renderWithProviders(<NotificationsPage />, {
      mocks: [...refDataMocks(), deleteNotificationMock()],
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Deleted')).toBeInTheDocument();
  });

  it('does nothing when the delete confirmation is declined', async () => {
    dialogsMock.confirm = vi.fn().mockResolvedValue(false);
    renderWithProviders(<NotificationsPage />, {
      mocks: [...refDataMocks(), deleteNotificationMock()],
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(dialogsMock.confirm).toHaveBeenCalled());
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
  });

  it('reports a delete failure through notifyError', async () => {
    renderWithProviders(<NotificationsPage />, {
      mocks: [...refDataMocks(), deleteNotificationMock({ throwMessage: 'nope' })],
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(dialogsMock.notifyError).toHaveBeenCalledWith('nope'));
  });

  it('defaults the delivery counts to zero when the mutation returns no counts', async () => {
    renderWithProviders(<NotificationsPage />, {
      mocks: [...refDataMocks(), createNotificationMock({ empty: true })],
    });
    fireEvent.click(await screen.findByRole('button', { name: /New Notification/ }));
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Launch' } });
    fireEvent.change(screen.getByLabelText(/Body/), { target: { value: 'We are live' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));
    await waitFor(() =>
      expect(screen.getByText('Sent · delivered 0 · failed 0')).toBeInTheDocument(),
    );
  });

  it('closes the create dialog from Cancel', async () => {
    renderWithProviders(<NotificationsPage />, { mocks: refDataMocks() });
    fireEvent.click(await screen.findByRole('button', { name: /New Notification/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('auto-hides the delivery toast after the timeout', async () => {
    vi.useFakeTimers();
    try {
      renderWithProviders(<NotificationsPage />, {
        mocks: [...refDataMocks(), deleteNotificationMock()],
      });
      // flush the table load + reference-data queries so the Delete row renders
      await vi.runAllTimersAsync();
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      // confirm -> delete -> toast, then the Snackbar autoHide fires onClose
      await vi.runAllTimersAsync();
      expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('NotificationsPage without reference data', () => {
  it('falls back to empty locations, users and options', async () => {
    __setTableRows([rowBase]);
    renderWithProviders(<NotificationsPage />, { mocks: [locationsMock([]), usersMock([])] });
    // location column resolves to the em-dash when no locations are loaded
    expect(await screen.findAllByText('—')).not.toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /New Notification/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
