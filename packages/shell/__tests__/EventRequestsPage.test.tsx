/**
 * Event Requests — what members asked a host or venue for when nothing was
 * coming up. ONE page for the partner (scope `owner`) and staff (scope
 * `console`). What matters: each scope reads its own server fields, the four
 * count tiles reconcile from one read, the target column shows only where
 * there is more than one target, and closing a request by hand refreshes both
 * the table and the totals — or says it failed, and logs why.
 */
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DuncitColumn, TableQueryState } from '@duncit/table';
import type { EventRequestCounts, EventRequestRow } from '../src/event-requests/queries';

interface CapturedTable {
  ariaLabel: string;
  tableId: string;
  columns: DuncitColumn<EventRequestRow>[];
  fetchRows: (q: TableQueryState) => Promise<{ rows: EventRequestRow[]; total: number }>;
  getRowId: (row: EventRequestRow) => string;
  emptyText: string;
  defaultSort: { field: string; dir: string };
  searchPlaceholder: string;
  refetchRef: { current: (() => void) | null };
}

const h = vi.hoisted(() => ({
  client: { query: vi.fn() },
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  update: vi.fn(),
  refetchCounts: vi.fn(),
  refetchTable: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  seen: { table: null as unknown, wireRefetch: true },
}));

vi.mock('@apollo/client/react', () => ({
  useApolloClient: () => h.client,
  useQuery: h.useQuery,
  useMutation: h.useMutation,
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (value: Date) => `at ${value.toISOString()}` }),
}));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess: h.notifySuccess,
  notifyError: h.notifyError,
}));
vi.mock('@duncit/logs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/logs')>()),
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: h.warn, error: h.error }),
}));
vi.mock('@duncit/table', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/table')>()),
  DuncitTable: (props: CapturedTable) => {
    h.seen.table = props;
    if (h.seen.wireRefetch) props.refetchRef.current = h.refetchTable;
    return <div data-testid="duncit-table" />;
  },
}));

const { EventRequestsPage } = await import('../src/event-requests/EventRequestsPage');
const { EventRequestCountTiles } = await import('../src/event-requests/EventRequestCountTiles');
const queries = await import('../src/event-requests/queries');

const QUERY: TableQueryState = { search: '', page: 1, pageSize: 25, sortBy: null, sortDir: 'desc', filters: [] };
const COUNTS: EventRequestCounts = { open: 3, fulfilled: 1, dismissed: 2, total: 6 };

const row = (over: Partial<EventRequestRow> = {}): EventRequestRow => ({
  id: 'req-1',
  target_name: 'Blue Door Cafe',
  requester_name: 'Asha Rao',
  note: 'A quiz night?',
  status: 'OPEN',
  closed_at: null,
  created_at: '2026-10-01T09:30:00.000Z',
  ...over,
});

interface CountsState {
  data: Record<string, EventRequestCounts> | undefined;
  loading: boolean;
  error: Error | undefined;
}
const counts: CountsState = { data: undefined, loading: false, error: undefined };

const table = () => h.seen.table as CapturedTable;
const column = (field: string) => {
  const found = table().columns.find((c) => c.field === field);
  if (!found) throw new Error(`no ${field} column`);
  return found;
};
const renderCell = (field: string, r: EventRequestRow) => {
  const renderer = column(field).cellRenderer as (r: EventRequestRow) => ReactNode;
  return render(<div data-testid={`cell-${field}-${r.id}`}>{renderer(r)}</div>);
};
const valueOf = (field: string, r: EventRequestRow) =>
  (column(field).valueGetter as (r: EventRequestRow) => unknown)(r);

const flush = () =>
  act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });

beforeEach(() => {
  h.seen.table = null;
  h.seen.wireRefetch = true;
  counts.data = { myReceivedEventRequestCounts: COUNTS, eventRequestCounts: COUNTS };
  counts.loading = false;
  counts.error = undefined;
  h.client.query.mockReset();
  h.update.mockReset().mockResolvedValue({ data: {} });
  h.refetchCounts.mockReset().mockResolvedValue({});
  h.refetchTable.mockReset();
  h.notifySuccess.mockReset();
  h.notifyError.mockReset();
  h.warn.mockReset();
  h.error.mockReset();
  h.useQuery.mockReset().mockImplementation(() => ({ ...counts, refetch: h.refetchCounts }));
  h.useMutation.mockReset().mockImplementation(() => [h.update, { loading: false }]);
});

describe('EventRequestsPage — what each scope reads', () => {
  it('reads the partner’s own requests in the owner scope', async () => {
    render(<EventRequestsPage targetType="VENUE" scope="owner" />);

    expect(screen.getByTestId('event-requests-page-owner-venue')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Event Requests' })).toBeInTheDocument();
    expect(screen.getByText(/Members who asked for an event at your venues/)).toBeInTheDocument();
    expect(h.useQuery).toHaveBeenCalledWith(queries.MY_RECEIVED_EVENT_REQUEST_COUNTS, {
      variables: { target_type: 'VENUE' },
      fetchPolicy: 'cache-and-network',
    });
    expect(h.useMutation).toHaveBeenCalledWith(queries.UPDATE_EVENT_REQUEST_STATUS);

    const rows = [row()];
    h.client.query.mockResolvedValue({ data: { myReceivedEventRequestsTable: { rows, total: 1 } } });
    await expect(table().fetchRows(QUERY)).resolves.toEqual({ rows, total: 1 });
    expect(h.client.query).toHaveBeenCalledWith({
      query: queries.MY_RECEIVED_EVENT_REQUESTS_TABLE,
      variables: expect.objectContaining({ target_type: 'VENUE' }),
      fetchPolicy: 'network-only',
    });
  });

  it('reads every request of the kind in the console scope', async () => {
    render(<EventRequestsPage targetType="HOST" scope="console" />);

    expect(screen.getByTestId('event-requests-page-console-host')).toBeInTheDocument();
    expect(screen.getByText(/Every event request members sent to a host/)).toBeInTheDocument();
    expect(h.useQuery).toHaveBeenCalledWith(queries.EVENT_REQUEST_COUNTS, {
      variables: { target_type: 'HOST' },
      fetchPolicy: 'cache-and-network',
    });

    h.client.query.mockResolvedValue({ data: { eventRequestsTable: { rows: [], total: 0 } } });
    await expect(table().fetchRows(QUERY)).resolves.toEqual({ rows: [], total: 0 });
    expect(h.client.query).toHaveBeenCalledWith(
      expect.objectContaining({ query: queries.EVENT_REQUESTS_TABLE, variables: expect.objectContaining({ target_type: 'HOST' }) }),
    );
  });

  it('subtitles the owner’s host list and the console’s venue list with their own copy', () => {
    const { unmount } = render(<EventRequestsPage targetType="HOST" scope="owner" />);
    expect(screen.getByText(/Members who asked you to host an event/)).toBeInTheDocument();
    unmount();

    render(<EventRequestsPage targetType="VENUE" scope="console" />);
    expect(screen.getByText(/Every event request members sent to a venue/)).toBeInTheDocument();
  });

  it('configures the shared table newest-first, keyed by the request id', () => {
    render(<EventRequestsPage targetType="VENUE" scope="console" />);

    expect(table()).toMatchObject({
      ariaLabel: 'Event Requests',
      tableId: 'event-requests-console-venue',
      emptyText: 'No event requests yet.',
      defaultSort: { field: 'created_at', dir: 'desc' },
      searchPlaceholder: 'Search by name or note',
    });
    expect(table().getRowId(row({ id: 'req-9' }))).toBe('req-9');
  });
});

describe('EventRequestsPage — the target column', () => {
  const headers = () => table().columns.map((c) => c.headerName);

  it('names the venue on the owner’s venue list (a partner may own several)', () => {
    render(<EventRequestsPage targetType="VENUE" scope="owner" />);
    expect(headers()).toEqual(['Venue', 'Requested by', 'Note', 'Status', 'Requested', 'Closed', 'Actions']);
  });

  it('leaves it out of the owner’s host list, whose one target is themself', () => {
    render(<EventRequestsPage targetType="HOST" scope="owner" />);
    expect(headers()).toEqual(['Requested by', 'Note', 'Status', 'Requested', 'Closed', 'Actions']);
  });

  it('names the host on the console’s host list', () => {
    render(<EventRequestsPage targetType="HOST" scope="console" />);
    expect(headers()[0]).toBe('Host');
  });
});

describe('EventRequestsPage — the count tiles', () => {
  it('shows the four totals from the scope’s counts field', () => {
    counts.data = { myReceivedEventRequestCounts: { open: 4, fulfilled: 5, dismissed: 7, total: 16 } };
    render(<EventRequestsPage targetType="VENUE" scope="owner" />);

    expect(within(screen.getByTestId('event-requests-tile-open')).getByText('4')).toBeInTheDocument();
    expect(within(screen.getByTestId('event-requests-tile-fulfilled')).getByText('5')).toBeInTheDocument();
    expect(within(screen.getByTestId('event-requests-tile-dismissed')).getByText('7')).toBeInTheDocument();
    expect(within(screen.getByTestId('event-requests-tile-total')).getByText('16')).toBeInTheDocument();
  });

  it('holds skeletons while the first read is in flight', () => {
    counts.data = undefined;
    counts.loading = true;
    render(<EventRequestsPage targetType="VENUE" scope="owner" />);

    expect(screen.queryByTestId('event-requests-tile-open')).not.toBeInTheDocument();
    expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'true');
  });

  it('warns instead of showing zeros when the totals could not be read', () => {
    counts.data = undefined;
    counts.error = new Error('offline');
    render(<EventRequestsPage targetType="VENUE" scope="owner" />);

    expect(screen.getByText("We couldn't load the totals. Please try again.")).toBeInTheDocument();
    expect(screen.queryByTestId('event-requests-tile-total')).not.toBeInTheDocument();
  });
});

describe('EventRequestCountTiles', () => {
  it('keeps the last totals on screen during a refetch', () => {
    render(<EventRequestCountTiles counts={COUNTS} loading failed={false} />);

    expect(within(screen.getByTestId('event-requests-tile-total')).getByText('6')).toBeInTheDocument();
    expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'true');
  });

  it('reads no totals at all as zeros once nothing is loading', () => {
    render(<EventRequestCountTiles counts={null} loading={false} failed={false} />);

    for (const id of ['open', 'fulfilled', 'dismissed', 'total']) {
      expect(within(screen.getByTestId(`event-requests-tile-${id}`)).getByText('0')).toBeInTheDocument();
    }
  });
});

describe('EventRequestsPage — the cells', () => {
  beforeEach(() => {
    render(<EventRequestsPage targetType="VENUE" scope="console" />);
  });

  it('labels each status, and offers the three statuses as the filter', () => {
    // The tiles above carry the same words, so read inside the cell only.
    const cell = renderCell('status', row({ id: 'a', status: 'FULFILLED' }));
    expect(within(cell.getByTestId('cell-status-a')).getByText('Fulfilled')).toBeInTheDocument();
    expect(valueOf('status', row({ status: 'DISMISSED' }))).toBe('Dismissed');
    const status = column('status');
    expect(status.type === 'enum' ? status.options : []).toEqual([
      { value: 'OPEN', label: 'Open' },
      { value: 'FULFILLED', label: 'Fulfilled' },
      { value: 'DISMISSED', label: 'Dismissed' },
    ]);
  });

  it('formats the dates with the admin-configured format, and an open request as never closed', () => {
    expect(valueOf('created_at', row())).toBe('at 2026-10-01T09:30:00.000Z');
    expect(valueOf('closed_at', row({ closed_at: '2026-10-03T10:00:00.000Z' }))).toBe('at 2026-10-03T10:00:00.000Z');
    expect(valueOf('closed_at', row())).not.toContain('at ');
  });

  it('keeps the note out of sorting and filtering', () => {
    expect(column('note')).toMatchObject({ sortable: false, filterable: false });
  });

  it('offers the two closing actions only on an open request', () => {
    renderCell('actions', row({ id: 'open-1' }));
    expect(screen.getByTestId('event-request-fulfil-open-1')).toHaveTextContent('Mark fulfilled');
    expect(screen.getByTestId('event-request-dismiss-open-1')).toHaveTextContent('Dismiss');

    const closed = renderCell('actions', row({ id: 'done-1', status: 'FULFILLED' }));
    expect(closed.getByTestId('cell-actions-done-1')).toBeEmptyDOMElement();
  });
});

describe('EventRequestsPage — closing a request by hand', () => {
  beforeEach(() => {
    render(<EventRequestsPage targetType="VENUE" scope="owner" />);
  });

  it('marks it fulfilled, says so and refreshes the table and the totals', async () => {
    renderCell('actions', row({ id: 'req-7' }));
    fireEvent.click(screen.getByTestId('event-request-fulfil-req-7'));
    await flush();

    expect(h.update).toHaveBeenCalledWith({ variables: { id: 'req-7', status: 'FULFILLED' } });
    expect(h.notifySuccess).toHaveBeenCalledWith('Request updated.');
    expect(h.refetchTable).toHaveBeenCalledTimes(1);
    expect(h.refetchCounts).toHaveBeenCalledTimes(1);
    expect(h.notifyError).not.toHaveBeenCalled();
  });

  it('dismisses it', async () => {
    renderCell('actions', row({ id: 'req-8' }));
    fireEvent.click(screen.getByTestId('event-request-dismiss-req-8'));
    await flush();

    expect(h.update).toHaveBeenCalledWith({ variables: { id: 'req-8', status: 'DISMISSED' } });
  });

  it('disables that row’s buttons while its update is in flight, and frees them after', async () => {
    let finish: (value: unknown) => void = () => undefined;
    h.update.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const first = renderCell('actions', row({ id: 'req-1' }));
    fireEvent.click(within(first.container).getByTestId('event-request-fulfil-req-1'));
    await flush();

    const busy = renderCell('actions', row({ id: 'req-1' }));
    expect(within(busy.container).getByTestId('event-request-fulfil-req-1')).toBeDisabled();
    expect(within(busy.container).getByTestId('event-request-dismiss-req-1')).toBeDisabled();
    // Another row stays usable.
    const other = renderCell('actions', row({ id: 'req-2' }));
    expect(within(other.container).getByTestId('event-request-fulfil-req-2')).toBeEnabled();

    await act(async () => {
      finish({ data: {} });
    });
    await flush();
    const freed = renderCell('actions', row({ id: 'req-1' }));
    expect(within(freed.container).getByTestId('event-request-fulfil-req-1')).toBeEnabled();
  });

  it('says it failed, logs why with the request, and refreshes nothing', async () => {
    const failure = new Error('FORBIDDEN');
    h.update.mockRejectedValue(failure);
    renderCell('actions', row({ id: 'req-3' }));
    fireEvent.click(screen.getByTestId('event-request-dismiss-req-3'));
    await flush();

    expect(h.notifyError).toHaveBeenCalledWith('Could not update the request. Please try again.');
    expect(h.error).toHaveBeenCalledWith('EventRequestsPage', 'update', {
      error: failure,
      request_id: 'req-3',
      status: 'DISMISSED',
    });
    expect(h.notifySuccess).not.toHaveBeenCalled();
    expect(h.refetchTable).not.toHaveBeenCalled();
    expect(h.refetchCounts).not.toHaveBeenCalled();
  });

  it('still refreshes the totals when the table has not handed over its refetch yet', async () => {
    // The page mounted in beforeEach already wired it; take it back, and keep re-renders from re-wiring it.
    h.seen.wireRefetch = false;
    (h.seen.table as CapturedTable).refetchRef.current = null;
    renderCell('actions', row({ id: 'req-5' }));
    fireEvent.click(screen.getByTestId('event-request-fulfil-req-5'));
    await flush();

    expect(h.notifySuccess).toHaveBeenCalledWith('Request updated.');
    expect(h.refetchTable).not.toHaveBeenCalled();
    expect(h.refetchCounts).toHaveBeenCalledTimes(1);
  });

  it('frees the row even when reporting the failure itself throws', async () => {
    h.update.mockRejectedValue(new Error('FORBIDDEN'));
    h.notifyError.mockImplementation(() => {
      throw new Error('no notify host');
    });
    renderCell('actions', row({ id: 'req-6' }));
    fireEvent.click(screen.getByTestId('event-request-fulfil-req-6'));
    await flush();

    const again = renderCell('actions', row({ id: 'req-6' }));
    expect(within(again.container).getByTestId('event-request-fulfil-req-6')).toBeEnabled();
  });

  it('keeps the update and only logs when the totals then fail to refresh', async () => {
    const failure = new Error('offline');
    h.refetchCounts.mockRejectedValue(failure);
    renderCell('actions', row({ id: 'req-4' }));
    fireEvent.click(screen.getByTestId('event-request-fulfil-req-4'));
    await flush();

    expect(h.notifySuccess).toHaveBeenCalledWith('Request updated.');
    expect(h.warn).toHaveBeenCalledWith('EventRequestsPage', 'counts', { error: failure });
    expect(h.notifyError).not.toHaveBeenCalled();
  });
});

describe('the scope reads', () => {
  it('pairs each scope with its own table and counts fields', () => {
    expect(queries.SCOPE_READS.owner).toEqual({
      table: queries.MY_RECEIVED_EVENT_REQUESTS_TABLE,
      tableField: 'myReceivedEventRequestsTable',
      counts: queries.MY_RECEIVED_EVENT_REQUEST_COUNTS,
      countsField: 'myReceivedEventRequestCounts',
    });
    expect(queries.SCOPE_READS.console).toEqual({
      table: queries.EVENT_REQUESTS_TABLE,
      tableField: 'eventRequestsTable',
      counts: queries.EVENT_REQUEST_COUNTS,
      countsField: 'eventRequestCounts',
    });
  });
});
