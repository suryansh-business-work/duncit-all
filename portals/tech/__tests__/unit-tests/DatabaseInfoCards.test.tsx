import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { DatabaseEntry, DatabaseOplog, DatabaseReplica } from '../../src/pages/database/info/queries';
import { makeDatabaseInfo, makeDatabaseStorage } from '../mocks/database.mock';

const q = vi.hoisted(() => ({
  state: { data: undefined as unknown, loading: false, error: undefined as Error | undefined, refetch: vi.fn() },
  calls: [] as Array<{ variables?: { name?: string | null; tail?: number }; skip?: boolean }>,
}));

vi.mock('@apollo/client/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client/react')>();
  return {
    ...actual,
    useQuery: (_doc: unknown, opts: (typeof q.calls)[number]) => {
      q.calls.push(opts);
      return q.state;
    },
  };
});

import DatabasesCard from '../../src/pages/database/info/DatabasesCard';
import MongoLogsCard from '../../src/pages/database/info/MongoLogsCard';
import ReplicaCard from '../../src/pages/database/info/ReplicaCard';

const base = makeDatabaseInfo();

beforeEach(() => {
  q.state = { data: undefined, loading: false, error: undefined, refetch: vi.fn() };
  q.calls = [];
});

describe('DatabasesCard', () => {
  const entry = (over: Partial<DatabaseEntry> = {}): DatabaseEntry => ({
    name: 'prod-db',
    isLive: false,
    sizeOnDisk: 1024,
    empty: false,
    storage: makeDatabaseStorage(),
    statsError: null,
    ...over,
  });

  it('marks the live database and shows its document counts', () => {
    render(<DatabasesCard databases={[entry({ isLive: true })]} error={null} />);
    const tile = screen.getByTestId('db-info-database-prod-db');
    expect(within(tile).getByText('1,500')).toBeInTheDocument();
    expect(within(tile).getByText('231')).toBeInTheDocument();
  });

  it('shows an empty-state when the account sees no databases', () => {
    render(<DatabasesCard databases={[]} error={null} />);
    expect(screen.queryByTestId('db-info-databases')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the refusal and no empty-state text when the listing was denied', () => {
    render(<DatabasesCard databases={[]} error="not authorized" />);
    expect(screen.getByRole('alert')).toHaveTextContent('not authorized');
  });

  it('falls back to on-disk size only when stats are missing and explains why', () => {
    render(
      <DatabasesCard
        databases={[entry({ name: 'staging', storage: null, empty: true, statsError: 'no dbStats grant' })]}
        error={null}
      />,
    );
    const tile = screen.getByTestId('db-info-database-staging');
    expect(tile).not.toHaveTextContent('1,500');
    expect(within(tile).getByRole('alert')).toHaveTextContent('no dbStats grant');
  });
});

describe('ReplicaCard', () => {
  const replica = (over: Partial<DatabaseReplica> = {}): DatabaseReplica => ({ ...(base.replica as DatabaseReplica), ...over });
  const oplog = (over: Partial<DatabaseOplog> = {}): DatabaseOplog => ({ ...(base.oplog as DatabaseOplog), ...over });

  it('renders the replica set, its members and the oplog window', () => {
    render(<ReplicaCard replica={replica()} replicaError={null} oplog={oplog()} oplogError={null} username="u" />);
    expect(screen.getByText('rs0')).toBeInTheDocument();
    expect(screen.getByTestId('db-info-members')).toBeInTheDocument();
    expect(screen.getByText('48,000')).toBeInTheDocument();
    expect(screen.queryByTestId('db-info-grant-command')).toBeNull();
  });

  it('shows dashes for every value the server could not report', () => {
    render(
      <ReplicaCard
        replica={replica({ term: null, myState: null, primary: null, heartbeatIntervalMs: null, configVersion: null })}
        replicaError={null}
        oplog={oplog({ maxBytes: null, firstAt: null, lastAt: null, windowSeconds: null })}
        oplogError={null}
        username={null}
      />,
    );
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(6);
  });

  it('shows the grant hint with the connection user when the replica read was denied', () => {
    render(
      <ReplicaCard replica={null} replicaError="not authorized on admin" oplog={null} oplogError={null} username="duncit_prod" />,
    );
    expect(screen.getByTestId('db-info-grant-command')).toHaveTextContent(
      'db.grantRolesToUser("duncit_prod", [{ role: "clusterMonitor", db: "admin" }])',
    );
    expect(screen.getByRole('alert')).toHaveTextContent('not authorized on admin');
  });

  it('falls back to the oplog error and an empty user name in the grant', () => {
    render(<ReplicaCard replica={null} replicaError={null} oplog={null} oplogError="oplog denied" username={null} />);
    expect(screen.getByRole('alert')).toHaveTextContent('oplog denied');
    expect(screen.getByTestId('db-info-grant-command')).toHaveTextContent('db.grantRolesToUser("", ');
  });
});

describe('MongoLogsCard', () => {
  const LOGS = [
    '{"c":"NETWORK","msg":"connection accepted"}',
    '{"c":"REPL","msg":"member is primary"}',
    '{"c":"ELECTION","msg":"won"}',
    '',
  ].join('\n');

  it('explains there is nothing to read without a container and does not query', () => {
    render(<MongoLogsCard container={null} />);
    expect(screen.queryByTestId('db-info-logs-refresh')).toBeNull();
    expect(q.calls.at(-1)?.skip).toBe(true);
  });

  it('shows the tail of the container log and its line counts', () => {
    q.state = { ...q.state, data: { techContainerLogs: LOGS } };
    render(<MongoLogsCard container="duncit-mongo" />);
    expect(q.calls.at(-1)?.variables).toEqual({ name: 'duncit-mongo', tail: 200 });
    expect(screen.getByText(/connection accepted/)).toBeInTheDocument();
    expect(screen.getByText(/member is primary/)).toBeInTheDocument();
  });

  it('narrows to replication lines when the switch is on', () => {
    q.state = { ...q.state, data: { techContainerLogs: LOGS } };
    render(<MongoLogsCard container="duncit-mongo" />);
    fireEvent.click(screen.getByTestId('db-info-logs-replication-only'));
    expect(screen.queryByText(/connection accepted/)).toBeNull();
    expect(screen.getByText(/member is primary/)).toBeInTheDocument();
    expect(screen.getByText(/won/)).toBeInTheDocument();
  });

  it('re-queries with the chosen tail size', () => {
    q.state = { ...q.state, data: { techContainerLogs: LOGS } };
    render(<MongoLogsCard container="duncit-mongo" />);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: '500' }));
    expect(q.calls.at(-1)?.variables?.tail).toBe(500);
  });

  it('shows the empty message when the replication filter hides everything', () => {
    q.state = { ...q.state, data: { techContainerLogs: '{"c":"NETWORK"}' } };
    render(<MongoLogsCard container="duncit-mongo" />);
    fireEvent.click(screen.getByTestId('db-info-logs-replication-only'));
    expect(screen.queryByText(/NETWORK/)).toBeNull();
  });

  it('disables refresh while loading, with no data yet', () => {
    q.state = { ...q.state, loading: true };
    render(<MongoLogsCard container="duncit-mongo" />);
    expect(screen.getByTestId('db-info-logs-refresh')).toBeDisabled();
  });

  it('refetches on refresh and shows a read failure', () => {
    q.state = { ...q.state, data: { techContainerLogs: LOGS }, error: new Error('docker socket unavailable') };
    render(<MongoLogsCard container="duncit-mongo" />);
    expect(screen.getByRole('alert')).toHaveTextContent('docker socket unavailable');
    fireEvent.click(screen.getByTestId('db-info-logs-refresh'));
    expect(q.state.refetch).toHaveBeenCalledTimes(1);
  });
});
