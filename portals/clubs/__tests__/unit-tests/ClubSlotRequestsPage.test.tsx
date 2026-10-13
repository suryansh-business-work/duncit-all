import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useEffect, useState, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import ClubSlotRequestsPage from '../../src/pages/club-slot-requests-page';
import ClubSlotRequestsTable from '../../src/pages/club-slot-requests-page/ClubSlotRequestsTable';
import type { ClubSlotRequestRow } from '../../src/pages/club-slot-requests-page/queries';

const m = vi.hoisted(() => ({
  rows: [] as unknown[],
  loads: 0,
  fetchArgs: [] as unknown[][],
  resolve: vi.fn(),
}));

interface MockColumn {
  field: string;
  headerName: string;
  cellRenderer?: (row: unknown) => ReactNode;
  valueGetter?: (row: unknown) => unknown;
  options?: { value: string; label: string }[];
  formatDate?: (value: Date) => string;
}

// A stand-in for the grid: renders every column's cell for every fetched row so
// the page's own renderers and getters run for real.
vi.mock('@duncit/table', () => ({
  useApolloTableFetch: (...args: unknown[]) => {
    m.fetchArgs.push(args);
    return async () => ({ rows: m.rows, total: m.rows.length });
  },
  dateColumn: (options: { field: string; headerName: string; formatDate: (value: Date) => string }): MockColumn => ({
    field: options.field,
    headerName: options.headerName,
    valueGetter: (row) => options.formatDate(new Date((row as Record<string, string>)[options.field])),
  }),
  DuncitTable: ({
    columns,
    fetchRows,
    getRowId,
    emptyText,
    refetchRef,
  }: {
    columns: MockColumn[];
    fetchRows: () => Promise<{ rows: unknown[] }>;
    getRowId: (row: unknown) => string;
    emptyText: string;
    refetchRef: { current: (() => void) | null };
  }) => {
    const [rows, setRows] = useState<unknown[]>([]);
    const load = () => {
      m.loads += 1;
      fetchRows().then((res) => setRows(res.rows));
    };
    useEffect(() => {
      refetchRef.current = load;
      load();
      // Mount-only, like the real table's first fetch.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
      <div data-testid="table">
        <div data-testid="headers">{columns.map((c) => c.headerName).join('|')}</div>
        {rows.length === 0 && <div>{emptyText}</div>}
        {rows.map((row) => (
          <div key={getRowId(row)} data-testid="row">
            {columns.map((c) => (
              <span key={c.field} data-testid={`cell-${c.field}`}>
                {c.valueGetter ? String(c.valueGetter(row)) : null}
                {c.cellRenderer ? c.cellRenderer(row) : null}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  },
}));
vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useApolloClient: () => ({ client: true }),
  useMutation: () => [m.resolve],
}));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@duncit/app-settings', async (io) => ({
  ...(await io<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date) => `DT:${d.toISOString().slice(0, 10)}` }),
}));

const request = (over: Partial<ClubSlotRequestRow> = {}): ClubSlotRequestRow => ({
  id: 'r1',
  club_id: 'club-1',
  club_name: 'Riverside Club',
  host_name: 'Asha',
  host_contact: 'asha@example.com',
  notified: 3,
  status: 'OPEN',
  created_at: '2026-10-05T09:00:00.000Z',
  ...over,
});

beforeEach(() => {
  m.rows = [];
  m.loads = 0;
  m.fetchArgs = [];
  m.resolve = vi.fn().mockResolvedValue({});
  vi.mocked(notifySuccess).mockClear();
  vi.mocked(notifyError).mockClear();
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <ClubSlotRequestsPage />
    </MemoryRouter>,
  );

describe('ClubSlotRequestsTable', () => {
  const renderTable = (onResolve = vi.fn()) => {
    render(
      <MemoryRouter>
        <ClubSlotRequestsTable
          fetchRows={async () => ({ rows: m.rows as ClubSlotRequestRow[], total: m.rows.length })}
          refetchRef={{ current: null }}
          formatDateTime={(d) => `FMT:${d.toISOString().slice(0, 10)}`}
          onResolve={onResolve}
        />
      </MemoryRouter>,
    );
    return onResolve;
  };

  it('shows the empty message with no requests', async () => {
    renderTable();
    expect(await screen.findByText('No requests yet.')).toBeInTheDocument();
  });

  it('lists an open request with a club link, status chip and a resolve action', async () => {
    m.rows = [request()];
    const onResolve = renderTable();
    const row = await screen.findByTestId('row');
    expect(within(row).getByRole('link', { name: 'Riverside Club' })).toHaveAttribute('href', '/clubs/club-1');
    expect(within(row).getByTestId('cell-status')).toHaveTextContent('Open');
    expect(within(row).getByTestId('cell-created_at')).toHaveTextContent('FMT:2026-10-05');
    fireEvent.click(within(row).getByRole('button', { name: 'Mark resolved' }));
    expect(onResolve).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }));
  });

  it('shows a resolved request without an action', async () => {
    m.rows = [request({ status: 'RESOLVED' })];
    renderTable();
    const row = await screen.findByTestId('row');
    expect(within(row).getByTestId('cell-status')).toHaveTextContent('Resolved');
    expect(within(row).queryByRole('button', { name: 'Mark resolved' })).not.toBeInTheDocument();
  });
});

describe('ClubSlotRequestsPage', () => {
  it('asks the server for the slot-request table', async () => {
    renderPage();
    await waitFor(() => expect(m.loads).toBe(1));
    expect(m.fetchArgs[0][2]).toBe('clubSlotRequestsTable');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('resolves a request, confirms and reloads the table', async () => {
    m.rows = [request()];
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Mark resolved' }));
    await waitFor(() => expect(m.resolve).toHaveBeenCalledWith({ variables: { id: 'r1' } }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(m.loads).toBe(2));
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('tells the operator when resolving fails and does not reload', async () => {
    m.resolve = vi.fn().mockRejectedValue(new Error('Server said no'));
    m.rows = [request()];
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Mark resolved' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledTimes(1));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(m.loads).toBe(1);
  });
});
