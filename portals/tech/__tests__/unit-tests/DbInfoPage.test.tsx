import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
}));
vi.mock('@apollo/client/react', async (io) => {
  const actual = await io<typeof import('@apollo/client/react')>();
  return { ...actual, useApolloClient: () => ({}), useQuery: () => m.query };
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
    render(<DbInfoPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
  });

  it('says why the read failed', () => {
    m.query = { ...m.query, error: new Error('down') };
    render(<DbInfoPage />);
    expect(screen.getByText('Could not load database info: down')).toBeInTheDocument();
  });

  it('shows the live database read-only, and refreshes the page and the table together', () => {
    withInfo();
    render(<DbInfoPage />);

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

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(m.query.refetch).toHaveBeenCalled();
    expect(m.tableRefetch).toHaveBeenCalled();
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
    render(<DbInfoPage />);

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
    render(<DbInfoPage />);
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
      }),
    );
    render(<DbInfoPage />);

    expect(screen.getByText('Not writable')).toBeInTheDocument();
    expect(screen.getByText(/clusterMonitor role.*not authorized on admin/)).toBeInTheDocument();
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
    render(<DbInfoPage />);

    expect(screen.getByText('Not started')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('topology changed')).toBeInTheDocument();
    expect(screen.getByText('0 open · 0 available · 0 opened since start')).toBeInTheDocument();
    expect(screen.getByText('<1m')).toBeInTheDocument();
  });
});
