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
  audienceListsFeedMock,
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
import { toCreateNotificationInput } from '../../src/pages/notifications-page/notification';
import {
  AUDIENCE_LISTS_FOR_NOTIF,
  type NotificationRow,
} from '../../src/pages/notifications-page/queries';

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

describe('toCreateNotificationInput', () => {
  it('sends the list id only for the saved-list audience', () => {
    const listed = toCreateNotificationInput({
      ...blankForm,
      title: 'Hello there',
      body: 'A body long enough',
      scope: 'AUDIENCE_LIST',
      audience_list_id: 'a1',
    });
    expect(listed.audience_list_id).toBe('a1');

    // A leftover id from switching audience must not be sent.
    const global = toCreateNotificationInput({
      ...blankForm,
      title: 'Hello there',
      body: 'A body long enough',
      audience_list_id: 'a1',
    });
    expect(global.audience_list_id).toBeNull();
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
    audienceLists: [
      { id: 'a1', name: 'Pune regulars', member_count: 1284 },
      { id: 'a2', name: 'Dormant', member_count: 0 },
    ],
    totalUsers: 4200,
  };

  // Nobody should send blind: every audience that knows its own size says so.
  describe('reach', () => {
    it('reports the whole platform for a global send', async () => {
      renderWithProviders(<NotificationFormDialog {...baseProps} form={blankForm} />);
      expect(await screen.findByTestId('notif-reach')).toHaveTextContent('reaches 4,200 people');
    });

    it('reports the picked list, and warns when it reaches nobody', async () => {
      const form = { ...blankForm, scope: 'AUDIENCE_LIST' as const, audience_list_id: 'a1' };
      const { unmount } = renderWithProviders(<NotificationFormDialog {...baseProps} form={form} />);
      expect(await screen.findByTestId('notif-reach')).toHaveTextContent('reaches 1,284 people');
      unmount();

      renderWithProviders(
        <NotificationFormDialog {...baseProps} form={{ ...form, audience_list_id: 'a2' }} />,
      );
      expect(await screen.findByTestId('notif-reach')).toHaveTextContent('reaches nobody');
    });

    it('says one person, not one people', async () => {
      const form = { ...blankForm, scope: 'USER' as const, target_user_ids: ['u1'] };
      renderWithProviders(<NotificationFormDialog {...baseProps} form={form} />);
      expect(await screen.findByTestId('notif-reach')).toHaveTextContent('reaches 1 person');
    });

    it('shows no count for an audience that has none — a location', async () => {
      const form = { ...blankForm, scope: 'LOCATION' as const, location_id: 'l1' };
      renderWithProviders(<NotificationFormDialog {...baseProps} form={form} />);
      expect(screen.queryByTestId('notif-reach')).not.toBeInTheDocument();
    });

    it('shows no count for a list that no longer exists', async () => {
      const form = { ...blankForm, scope: 'AUDIENCE_LIST' as const, audience_list_id: 'gone' };
      renderWithProviders(<NotificationFormDialog {...baseProps} form={form} />);
      expect(screen.queryByTestId('notif-reach')).not.toBeInTheDocument();
    });
  });

  describe('the saved-list audience', () => {
    it('offers each list with its live size, and submits the pick', async () => {
      const onSubmit = vi.fn();
      const form = { ...blankForm, scope: 'AUDIENCE_LIST' as const };
      renderWithProviders(<NotificationFormDialog {...baseProps} form={form} onSubmit={onSubmit} />);
      fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Weekend' } });
      fireEvent.change(screen.getByLabelText(/Body/), { target: { value: 'Discover pods' } });

      fireEvent.mouseDown(screen.getByLabelText('Audience list'));
      fireEvent.click(await screen.findByText('Pune regulars · 1,284'));
      fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0][0].audience_list_id).toBe('a1');
    });

    it('refuses to send without a list picked', async () => {
      const onSubmit = vi.fn();
      const form = { ...blankForm, scope: 'AUDIENCE_LIST' as const };
      renderWithProviders(<NotificationFormDialog {...baseProps} form={form} onSubmit={onSubmit} />);
      fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Weekend' } });
      fireEvent.change(screen.getByLabelText(/Body/), { target: { value: 'Discover pods' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));
      expect(await screen.findByText('Pick an audience list')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('points at Target Audience when there are no lists yet', async () => {
      const form = { ...blankForm, scope: 'AUDIENCE_LIST' as const };
      renderWithProviders(
        <NotificationFormDialog {...baseProps} form={form} audienceLists={[]} />,
      );
      fireEvent.mouseDown(screen.getByLabelText('Audience list'));
      expect(await screen.findByText(/create one under Target Audience/)).toBeInTheDocument();
    });
  });

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
  const refDataMocks = () => [
    locationsMock(),
    usersMock([makeUser()]),
    audienceListsFeedMock(AUDIENCE_LISTS_FOR_NOTIF),
  ];

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
