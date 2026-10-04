import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { DatabaseCollection, DatabaseInfo } from '../../src/pages/database/info/queries';
import {
  makeDatabaseCollection,
  makeDatabaseConnection,
  makeDatabaseInfo,
  makeDatabaseServer,
  makeDatabaseStorage,
} from '../mocks/database.mock';

type Column = { field: string; headerName?: string; cellRenderer?: (row: DatabaseCollection) => ReactNode };

const m = vi.hoisted(() => ({
  query: { data: undefined as unknown, loading: false, error: undefined as Error | undefined, refetch: vi.fn() },
  rows: [] as DatabaseCollection[],
  tableRefetch: vi.fn(),
  idle: { data: undefined, loading: false, error: undefined, refetch: vi.fn() },
}));
// Only the page's own TechDatabaseInfo read is under test; the self-contained
// cards it mounts (mongod logs, backup store) run their own queries, which stay idle.
vi.mock('@apollo/client/react', async (io) => {
  const actual = await io<typeof import('@apollo/client/react')>();
  return {
    ...actual,
    useApolloClient: () => ({}),
    useQuery: (doc: { definitions: Array<{ name?: { value: string } }> }) =>
      doc.definitions[0]?.name?.value === 'TechDatabaseInfo' ? m.query : m.idle,
  };
});
// The grid itself belongs to @duncit/table; this stand-in runs every column's
// renderer on real rows so the page's own column definitions are exercised.
vi.mock('@duncit/table', () => ({
  useApolloTableFetch: () => vi.fn(),
  DuncitTable: (p: {
    columns: Column[];
    getRowId: (row: DatabaseCollection) => string;
    searchPlaceholder: string;
    refetchRef: { current: (() => void) | null };
  }) => {
    p.refetchRef.current = m.tableRefetch;
    return (
      <div data-testid="collections-table">
        {p.searchPlaceholder}
        {m.rows.map((row) => (
          <div key={p.getRowId(row)}>
            {p.columns.map((c) => (
              <span key={c.field}>
                {c.headerName}={c.cellRenderer ? c.cellRenderer(row) : String(row[c.field as keyof DatabaseCollection])}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  },
}));

import DbInfoPage from '../../src/pages/database/info';

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/database/info']}>
      <Routes>
        <Route path="/database/info" element={<DbInfoPage />} />
        <Route path="/database/backups" element={<p>backups page</p>} />
      </Routes>
    </MemoryRouter>,
  );

const withInfo = (info: DatabaseInfo = makeDatabaseInfo()) => {
  m.query = { data: { techDatabaseInfo: info }, loading: false, error: undefined, refetch: vi.fn() };
};

beforeEach(() => {
  m.query = { data: undefined, loading: false, error: undefined, refetch: vi.fn() };
  m.rows = [makeDatabaseCollection(), makeDatabaseCollection({ name: 'users', documents: 90, storageBytes: 120_000 })];
  m.tableRefetch.mockReset();
});

describe('DbInfoPage', () => {
  it('shows progress while the first read is on its way', () => {
    m.query = { ...m.query, loading: true };
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
  });

  it('says why the read failed', () => {
    m.query = { ...m.query, error: new Error('down') };
    renderPage();
    expect(screen.getByText('Could not load database info: down')).toBeInTheDocument();
  });

  it('shows the live database read-only, and refreshes the page and the table together', () => {
    withInfo();
    renderPage();

    expect(screen.getByRole('heading', { name: 'Database · Info' })).toBeInTheDocument();
    expect(screen.getByTestId('db-info-provider')).toHaveTextContent('Self-hosted (VPS)');
    const uri = screen.getByTestId('db-info-connection-string');
    expect(uri).toHaveValue('mongodb://duncit_prod:••••@duncit-mongo:27017');
    expect(uri).toHaveAttribute('readonly');
    expect(screen.getByText('Production')).toBeInTheDocument();
    expect(screen.getByText('0.4 ms')).toBeInTheDocument();
    expect(screen.getByText('10–100 connections')).toBeInTheDocument();
    expect(screen.getByText('30 s')).toBeInTheDocument();
    expect(screen.getByText('rs0 · Primary (writable)')).toBeInTheDocument();
    expect(screen.getByText('42 open · 838818 available · 120 opened since start')).toBeInTheDocument();
    expect(screen.getByText('VOLUME')).toBeInTheDocument();
    expect(screen.getByText(/Edit MONGO_URI/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open secrets/ })).toHaveAttribute(
      'href',
      makeDatabaseConnection().secretsUrl,
    );
    expect(screen.getByText('attempt 1 · Authentication failed.')).toBeInTheDocument();
    expect(screen.getByText('attempt 2')).toBeInTheDocument();
    const table = screen.getByTestId('collections-table');
    expect(table).toHaveTextContent('Collection=pods');
    expect(table).toHaveTextContent('On disk=293 KB');
    expect(table).toHaveTextContent('Indexes=5');

    // The mongod logs card carries its own Refresh; the page's is the one in the header.
    const [pageRefresh, logsRefresh] = screen.getAllByRole('button', { name: 'Refresh' });
    expect(logsRefresh).toHaveAttribute('data-testid', 'db-info-logs-refresh');
    fireEvent.click(pageRefresh);
    expect(m.query.refetch).toHaveBeenCalled();
    expect(m.tableRefetch).toHaveBeenCalled();
    expect(m.idle.refetch).not.toHaveBeenCalled();
  });

  it('links through to the backups page', () => {
    withInfo();
    renderPage();
    fireEvent.click(screen.getByTestId('db-info-open-backups'));
    expect(screen.getByText('backups page')).toBeInTheDocument();
  });

  it('explains a disconnected local Atlas connection with nothing to measure', () => {
    withInfo(
      makeDatabaseInfo({
        connection: makeDatabaseConnection({
          provider: 'ATLAS',
          environment: 'localhost',
          state: 'disconnected',
          databaseNamePinned: false,
          secretName: null,
          deployBranch: null,
          secretsUrl: null,
          deployRunsUrl: null,
          replicaSet: null,
          username: null,
          authSource: null,
          tls: true,
        }),
        server: null,
        storage: null,
        pingMs: null,
        events: [],
      }),
    );
    renderPage();

    expect(screen.getByTestId('db-info-provider')).toHaveTextContent('MongoDB Atlas');
    expect(screen.getByText('Local')).toBeInTheDocument();
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByText('test — the URI default, MONGO_DB_NAME is not set')).toBeInTheDocument();
    expect(screen.getByText(/not connected to its database right now/)).toBeInTheDocument();
    expect(screen.getByText(/server\/\.env/)).toBeInTheDocument();
    expect(screen.getByText('On')).toBeInTheDocument();
    expect(screen.getByText('Nothing recorded yet.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByTestId('collections-table')).toBeNull();
  });

  it('shows the driver reason when the stats could not be read', () => {
    withInfo(makeDatabaseInfo({ server: null, storage: null, statsError: 'connection timed out' }));
    renderPage();
    expect(screen.getByText('Could not read the database stats: connection timed out')).toBeInTheDocument();
  });

  it('marks what the database user may not read', () => {
    withInfo(
      makeDatabaseInfo({
        server: makeDatabaseServer({
          statusError: 'not authorized on admin',
          isWritablePrimary: false,
          setName: null,
          members: [],
        }),
        storage: makeDatabaseStorage({ fsUsedBytes: null, fsTotalBytes: null }),
        // The same missing clusterMonitor role refuses replSetGetStatus and the oplog too.
        replica: null,
        replicaError: 'not authorized on admin',
        oplog: null,
        oplogError: null,
      }),
    );
    renderPage();

    expect(screen.getByText('Not writable')).toBeInTheDocument();
    expect(screen.getByText(/Uptime, connections and engine need the clusterMonitor role.*not authorized on admin/)).toBeInTheDocument();
    expect(screen.getByText(/Replica-set status and the oplog need the clusterMonitor role.*not authorized on admin/)).toBeInTheDocument();
    expect(screen.queryByText('Uptime')).toBeNull();
    expect(screen.queryByText('VOLUME')).toBeNull();
  });

  it('falls back for an unknown state, an unknown event and missing server counters', () => {
    withInfo(
      makeDatabaseInfo({
        connection: makeDatabaseConnection({ state: 'resyncing' }),
        server: makeDatabaseServer({
          uptimeSeconds: null,
          connectionsCurrent: null,
          connectionsAvailable: null,
          connectionsTotalCreated: null,
          storageEngine: null,
        }),
        events: [{ at: '2026-09-18T11:00:00.000Z', kind: 'HEARTBEAT', message: 'topology changed', attempt: null }],
      }),
    );
    renderPage();

    expect(screen.getByText('Not started')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('topology changed')).toBeInTheDocument();
    expect(screen.getByText('0 open · 0 available · 0 opened since start')).toBeInTheDocument();
    expect(screen.getByText('<1m')).toBeInTheDocument();
  });
});
