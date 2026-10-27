import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ReplicaMembers from '../../src/pages/database/info/ReplicaMembers';
import ServerCard from '../../src/pages/database/info/ServerCard';
import type { ReplicaMember } from '../../src/pages/database/info/queries';
import { makeDatabaseServer } from '../mocks/database.mock';

const member = (over: Partial<ReplicaMember> = {}): ReplicaMember => ({
  name: 'mongo-a:27017',
  stateStr: 'PRIMARY',
  healthy: true,
  self: true,
  uptimeSeconds: 3600,
  optimeAt: '2026-09-18T11:59:58.000Z',
  lagSeconds: null,
  lastHeartbeatAt: null,
  pingMs: null,
  syncSourceHost: null,
  priority: 1,
  votes: 1,
  ...over,
});

const valueOf = (tile: HTMLElement, label: string) => within(tile).getByText(label).nextElementSibling?.textContent;

describe('ReplicaMembers', () => {
  it('shows a secondary with its lag, ping, sync source, priority and votes', () => {
    render(
      <ReplicaMembers
        members={[
          member({
            name: 'mongo-b:27017',
            stateStr: 'SECONDARY',
            self: false,
            lagSeconds: 2,
            pingMs: 7,
            syncSourceHost: 'mongo-a:27017',
            priority: 0,
            votes: 0,
          }),
        ]}
      />,
    );

    const tile = screen.getByTestId('db-info-member-mongo-b:27017');
    expect(within(tile).getByText('SECONDARY').closest('.MuiChip-root')).toHaveClass('MuiChip-colorInfo');
    expect(within(tile).queryByText('this connection')).not.toBeInTheDocument();
    expect(valueOf(tile, 'Syncing from')).toBe('mongo-a:27017');
    expect(valueOf(tile, 'Priority')).toBe('0');
    expect(valueOf(tile, 'Votes')).toBe('0');
    expect(valueOf(tile, 'Behind primary')).toMatch(/2/);
    expect(valueOf(tile, 'Ping')).toMatch(/7/);
  });

  it('shows dashes for what a member does not report, and marks the member this connection is on', () => {
    render(<ReplicaMembers members={[member({ priority: null, votes: null })]} />);

    const tile = screen.getByTestId('db-info-member-mongo-a:27017');
    expect(within(tile).getByText('PRIMARY').closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
    expect(valueOf(tile, 'Priority')).toBe('—');
    expect(valueOf(tile, 'Votes')).toBe('—');
    expect(valueOf(tile, 'Behind primary')).toBe('—');
    expect(valueOf(tile, 'Ping')).toBe('—');
    expect(valueOf(tile, 'Syncing from')).toBe('—');
  });

  it('flags an unhealthy member, and gives a state it does not know no colour', () => {
    render(<ReplicaMembers members={[member({ name: 'mongo-c:27017', stateStr: 'MAINTENANCE', healthy: false, self: false })]} />);

    const tile = screen.getByTestId('db-info-member-mongo-c:27017');
    expect(within(tile).getByText('MAINTENANCE').closest('.MuiChip-root')).toHaveClass('MuiChip-colorDefault');
    expect(valueOf(tile, 'Health')).toBe('Unreachable');
  });
});

describe('ServerCard', () => {
  it('shows a standalone server that is not a replica set member and has no primary', () => {
    render(
      <ServerCard
        server={makeDatabaseServer({ setName: null, isWritablePrimary: false, primary: null, members: [], lastWriteAt: null })}
      />,
    );

    expect(screen.getByText('Primary').nextElementSibling?.textContent).toBe('—');
    expect(screen.getByText('Members').nextElementSibling?.textContent).toBe('—');
  });

  it('reads counters the server withheld as zero, and a missing storage engine as a dash', () => {
    render(
      <ServerCard
        server={makeDatabaseServer({
          uptimeSeconds: null,
          connectionsCurrent: null,
          connectionsAvailable: null,
          connectionsTotalCreated: null,
          storageEngine: null,
          opInsert: null,
          opQuery: null,
          opUpdate: null,
          opDelete: null,
          opCommand: null,
          memResidentBytes: null,
          networkBytesIn: null,
          networkBytesOut: null,
          networkRequests: null,
          cacheBytes: null,
          cacheMaxBytes: null,
        })}
      />,
    );

    expect(screen.getByText('Storage engine').nextElementSibling?.textContent).toBe('—');
    expect(screen.getByText('Operations since start').nextElementSibling?.textContent).toContain('0');
    expect(screen.getByText('Network').nextElementSibling?.textContent).toContain('0');
  });

  it('leaves out the load rows when the database user may not run serverStatus', () => {
    render(<ServerCard server={makeDatabaseServer({ statusError: 'not authorized on admin' })} />);

    expect(screen.queryByText('Storage engine')).not.toBeInTheDocument();
    expect(screen.getByText('Version')).toBeInTheDocument();
  });
});
