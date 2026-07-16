import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const tableMock = vi.hoisted(() => ({ rows: [] as any[] }));
vi.mock('@duncit/table', () => ({
  useApolloTableFetch: () => vi.fn(),
  dateColumn: (opts: any = {}) => ({ field: opts.field ?? 'created_at', headerName: opts.headerName ?? 'Date', ...opts }),
  DuncitTable: ({ columns, toolbarActions, refetchRef, onRowClick }: any) => {
    if (refetchRef) refetchRef.current = vi.fn();
    return (
      <div data-testid="duncit-table">
        <div>{toolbarActions}</div>
        {tableMock.rows.map((row, ri) => (
          <div key={ri} data-testid="table-row">
            {columns.map((c: any, ci: number) => (
              <span key={ci} data-testid={`cell-${c.field ?? ci}`}>
                {c.valueGetter ? String(c.valueGetter(row)) : ''}
                {c.cellRenderer ? c.cellRenderer(row) : null}
              </span>
            ))}
            {onRowClick ? (
              <button type="button" onClick={() => onRowClick(row)}>{`rowclick-${ri}`}</button>
            ) : null}
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock('@duncit/media-picker', () => ({
  default: ({ open, onPicked }: any) =>
    open ? <button type="button" onClick={() => onPicked('https://cdn/x.png')}>pick</button> : null,
}));

const dialogsMock = vi.hoisted(() => ({
  confirmResult: true,
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

const apolloMock = vi.hoisted(() => ({
  queryData: {} as Record<string, any>,
  mutations: {} as Record<string, any>,
}));
const opName = (doc: any) =>
  doc?.definitions?.find((d: any) => d.kind === 'OperationDefinition')?.name?.value ?? '';
vi.mock('@apollo/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client')>();
  return {
    ...actual,
    useApolloClient: () => ({}),
    useQuery: (doc: any) => ({ data: apolloMock.queryData[opName(doc)], loading: false, error: undefined }),
    useMutation: (doc: any) => {
      const name = opName(doc);
      apolloMock.mutations[name] ??= vi.fn().mockResolvedValue({ data: {} });
      return [apolloMock.mutations[name], { loading: false }];
    },
  };
});

import NotificationsTable from '../../src/pages/notifications-page/NotificationsTable';
import NotificationFormDialog from '../../src/pages/notifications-page/NotificationFormDialog';
import NotificationsPage from '../../src/pages/notifications-page/NotificationsPage';
import { blankForm, type NotifForm } from '../../src/pages/notifications-page/helpers';
import type { NotificationRow } from '../../src/pages/notifications-page/queries';

const rowBase: NotificationRow = {
  id: 'n1',
  title: 'Hello',
  body: 'Body text',
  image_url: null,
  link_url: null,
  scope: 'GLOBAL',
  silent: false,
  location_id: null,
  zone_name: null,
  target_user_ids: [],
  delivered_count: 10,
  failed_count: 0,
  created_at: '2026-01-01T00:00:00.000Z',
};

const locName = (id?: string | null) => (id === 'l1' ? 'Mumbai' : '—');
const locationOptions = [{ value: 'l1', label: 'Mumbai' }];

beforeEach(() => {
  tableMock.rows = [];
  apolloMock.queryData = {};
  apolloMock.mutations = {};
  dialogsMock.confirmResult = true;
  dialogsMock.confirm = vi.fn().mockImplementation(() => Promise.resolve(dialogsMock.confirmResult));
});
afterEach(() => vi.clearAllMocks());

// ===========================================================================
describe('NotificationsTable', () => {
  it('renders scope, title, delivered and failed cells across every scope', () => {
    tableMock.rows = [
      { ...rowBase, id: 'g', scope: 'GLOBAL', link_url: '/pods/1' },
      { ...rowBase, id: 'l', scope: 'LOCATION', location_id: 'l1' },
      { ...rowBase, id: 'z', scope: 'ZONE', location_id: 'l1', zone_name: 'North' },
      { ...rowBase, id: 'u', scope: 'USER', target_user_ids: ['a', 'b'], failed_count: 3 },
      { ...rowBase, id: 'x', scope: 'UNKNOWN' as any },
    ];
    const refetchRef = { current: null };
    render(
      <NotificationsTable
        fetchRows={vi.fn() as any}
        refetchRef={refetchRef as any}
        locName={locName}
        locationOptions={locationOptions}
        toolbarActions={<span>toolbar</span>}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('toolbar')).toBeInTheDocument();
    expect(screen.getAllByText(/Location · Mumbai/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Zone · Mumbai \/ North/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Users · 2/).length).toBeGreaterThan(0);
    // link_url arrow shown for the GLOBAL row
    expect(screen.getByText(/\/pods\/1/)).toBeInTheDocument();
  });

  it('invokes onDelete from the action button', () => {
    const onDelete = vi.fn();
    tableMock.rows = [rowBase];
    render(
      <NotificationsTable
        fetchRows={vi.fn() as any}
        refetchRef={{ current: null } as any}
        locName={locName}
        locationOptions={locationOptions}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
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
    render(<NotificationFormDialog {...baseProps} form={blankForm} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Weekend' } });
    fireEvent.change(screen.getByLabelText(/Body/), { target: { value: 'Discover pods' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].scope).toBe('GLOBAL');
  });

  it('reveals the location select for LOCATION scope', () => {
    const form: NotifForm = { ...blankForm, scope: 'LOCATION' };
    render(<NotificationFormDialog {...baseProps} form={form} />);
    expect(screen.getByLabelText('Location')).toBeInTheDocument();
  });

  it('reveals location + zone selects for ZONE scope', () => {
    const form: NotifForm = { ...blankForm, scope: 'ZONE', location_id: 'l1' };
    render(<NotificationFormDialog {...baseProps} form={form} />);
    expect(screen.getByRole('combobox', { name: 'Location' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Zone' })).toBeInTheDocument();
  });

  it('reveals the users select for USER scope', () => {
    const form: NotifForm = { ...blankForm, scope: 'USER' };
    render(<NotificationFormDialog {...baseProps} form={form} />);
    expect(screen.getByLabelText('Users')).toBeInTheDocument();
  });

  it('shows the operation error and switches audience clearing dependent fields', () => {
    const form: NotifForm = { ...blankForm, scope: 'ZONE', location_id: 'l1', zone_name: 'North' };
    render(<NotificationFormDialog {...baseProps} form={form} opError="Boom" />);
    expect(screen.getByText('Boom')).toBeInTheDocument();
    // change audience back to GLOBAL -> location/zone selects disappear
    const audience = screen.getByLabelText('Audience');
    fireEvent.mouseDown(audience);
    const listbox = within(screen.getByRole('listbox'));
    fireEvent.click(listbox.getByText('All users (Global)'));
    expect(screen.queryByLabelText('Location')).not.toBeInTheDocument();
  });

  it('disables actions and blocks close while busy', () => {
    render(<NotificationFormDialog {...baseProps} form={blankForm} busy />);
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('calls onClose from Cancel', () => {
    const onClose = vi.fn();
    render(<NotificationFormDialog {...baseProps} form={blankForm} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});

// ===========================================================================
describe('NotificationsPage', () => {
  beforeEach(() => {
    apolloMock.queryData = {
      LocationsForNotif: { locations: [{ id: 'l1', location_name: 'Mumbai', location_zones: [] }] },
      UsersForNotif: { users: [{ user_id: 'u1', full_name: 'Alice' }] },
    };
    tableMock.rows = [rowBase];
  });

  it('creates a notification and shows the delivery toast', async () => {
    apolloMock.mutations.CreateNotification = vi
      .fn()
      .mockResolvedValue({ data: { createNotification: { delivered_count: 5, failed_count: 2 } } });
    render(<NotificationsPage />);
    fireEvent.click(screen.getByRole('button', { name: /New Notification/ }));
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Launch' } });
    fireEvent.change(screen.getByLabelText(/Body/), { target: { value: 'We are live' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));
    await waitFor(() =>
      expect(screen.getByText('Sent · delivered 5 · failed 2')).toBeInTheDocument(),
    );
    expect(apolloMock.mutations.CreateNotification).toHaveBeenCalled();
  });

  it('surfaces a create error inside the dialog', async () => {
    apolloMock.mutations.CreateNotification = vi.fn().mockRejectedValue(new Error('Send failed'));
    render(<NotificationsPage />);
    fireEvent.click(screen.getByRole('button', { name: /New Notification/ }));
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Launch' } });
    fireEvent.change(screen.getByLabelText(/Body/), { target: { value: 'We are live' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Now' }));
    await waitFor(() => expect(screen.getByText('Send failed')).toBeInTheDocument());
  });

  it('deletes after confirmation and toasts', async () => {
    apolloMock.mutations.DeleteNotification = vi.fn().mockResolvedValue({ data: {} });
    render(<NotificationsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(apolloMock.mutations.DeleteNotification).toHaveBeenCalledWith({ variables: { id: 'n1' } }));
    expect(await screen.findByText('Deleted')).toBeInTheDocument();
  });

  it('does nothing when the delete confirmation is declined', async () => {
    dialogsMock.confirmResult = false;
    dialogsMock.confirm = vi.fn().mockResolvedValue(false);
    apolloMock.mutations.DeleteNotification = vi.fn().mockResolvedValue({ data: {} });
    render(<NotificationsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(dialogsMock.confirm).toHaveBeenCalled());
    expect(apolloMock.mutations.DeleteNotification).not.toHaveBeenCalled();
  });

  it('reports a delete failure through notifyError', async () => {
    apolloMock.mutations.DeleteNotification = vi.fn().mockRejectedValue(new Error('nope'));
    render(<NotificationsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(dialogsMock.notifyError).toHaveBeenCalledWith('nope'));
  });
});
