import { oplogOf, replicaOf } from '../../tech.database.replica';

const URI = 'mongodb://user:pw@host1:27017/duncit';
const T0 = new Date('2026-03-01T10:00:00Z');
const T1 = new Date('2026-03-01T09:59:50Z');

const dbOf = (status: unknown, config: unknown) =>
  ({
    admin: () => ({
      replSetGetStatus: status instanceof Error ? jest.fn().mockRejectedValue(status) : jest.fn().mockResolvedValue(status),
      command: config instanceof Error ? jest.fn().mockRejectedValue(config) : jest.fn().mockResolvedValue(config),
    }),
  }) as never;

describe('replicaOf', () => {
  const status = {
    set: 'rs0',
    term: 7,
    heartbeatIntervalMillis: 2000,
    members: [
      { name: 'a:27017', stateStr: 'PRIMARY', health: 1, self: true, uptime: 500, optimeDate: T0, lastHeartbeatRecv: T0, pingMs: 0, syncSourceHost: '' },
      { name: 'b:27017', stateStr: 'SECONDARY', health: 1, uptime: 400, optimeDate: T1, lastHeartbeatRecv: T0, pingMs: 3, syncSourceHost: 'a:27017' },
      { name: 'c:27017', stateStr: 'SECONDARY', health: 0 },
    ],
  };
  const config = { config: { version: 4, members: [{ host: 'a:27017', priority: 2, votes: 1 }, { host: 'b:27017', priority: 1, votes: 1 }] } };

  it('joins each member with its priority and votes, and measures each secondary’s lag behind the primary', async () => {
    const out = await replicaOf(dbOf(status, config), URI);
    expect(out.replicaError).toBeNull();
    expect(out.replica).toMatchObject({ set: 'rs0', term: 7, myState: 'PRIMARY', primary: 'a:27017', heartbeatIntervalMs: 2000, configVersion: 4 });
    expect(out.replica?.members[0]).toEqual({
      name: 'a:27017', stateStr: 'PRIMARY', healthy: true, self: true, uptimeSeconds: 500, optimeAt: T0.toISOString(), lagSeconds: null,
      lastHeartbeatAt: T0.toISOString(), pingMs: 0, syncSourceHost: null, priority: 2, votes: 1,
    });
    expect(out.replica?.members[1]).toMatchObject({ lagSeconds: 10, syncSourceHost: 'a:27017', pingMs: 3, priority: 1, healthy: true, self: false });
  });

  it('copes with a member that reports almost nothing, and one the config does not list', async () => {
    const out = await replicaOf(dbOf(status, config), URI);
    expect(out.replica?.members[2]).toEqual({
      name: 'c:27017', stateStr: 'SECONDARY', healthy: false, self: false, uptimeSeconds: 0, optimeAt: null, lagSeconds: null,
      lastHeartbeatAt: null, pingMs: null, syncSourceHost: null, priority: null, votes: null,
    });
  });

  it('never reports a negative lag when a secondary is ahead of what the primary last applied', async () => {
    const ahead = { ...status, members: [status.members[0], { ...status.members[1], optimeDate: new Date(T0.getTime() + 5000) }] };
    expect((await replicaOf(dbOf(ahead, config), URI)).replica?.members[1].lagSeconds).toBe(0);
  });

  it('has no lag when there is no primary to measure against', async () => {
    const none = { set: 'rs0', members: [{ name: 'b:27017', stateStr: 'SECONDARY', health: 1, optimeDate: T1 }] };
    const out = await replicaOf(dbOf(none, {}), URI);
    expect(out.replica).toMatchObject({ primary: null, myState: null, term: null, heartbeatIntervalMs: null, configVersion: null });
    expect(out.replica?.members[0].lagSeconds).toBeNull();
  });

  it('answers an empty member list when the status carries none', async () => {
    const out = await replicaOf(dbOf({ set: 'rs0' }, { config: {} }), URI);
    expect(out.replica?.members).toEqual([]);
  });

  it('answers null with the server’s refusal, with the credentials scrubbed out of it, when the role is missing', async () => {
    const out = await replicaOf(dbOf(new Error(`not authorized on admin for ${URI}`), config), URI);
    expect(out.replica).toBeNull();
    expect(out.replicaError).toContain('not authorized on admin');
    expect(out.replicaError).not.toContain('pw');
    const second = await replicaOf(dbOf(status, new Error('config refused')), URI);
    expect(second).toEqual({ replica: null, replicaError: 'config refused' });
  });
});

describe('oplogOf', () => {
  const clientOf = (stats: unknown, first: unknown, last: unknown, fail?: Error) => {
    const cursor = (value: unknown) => ({ sort: () => ({ limit: () => ({ next: () => Promise.resolve(value) }) }) });
    let calls = 0;
    return {
      db: () => ({
        collection: () => ({
          aggregate: () => ({ next: () => (fail ? Promise.reject(fail) : Promise.resolve(stats)) }),
          find: () => cursor(calls++ === 0 ? first : last),
        }),
      }),
    } as never;
  };

  it('reports the entries kept, their size and how far back the history reaches', async () => {
    const out = await oplogOf(clientOf({ storageStats: { count: 1000, size: 5000, maxSize: 90000 } }, { wall: T1 }, { wall: T0 }), URI);
    expect(out).toEqual({
      oplog: { entries: 1000, dataBytes: 5000, maxBytes: 90000, firstAt: T1.toISOString(), lastAt: T0.toISOString(), windowSeconds: 10 },
      oplogError: null,
    });
  });

  it('reports zeros and an unknown window for an empty or unreadable oplog', async () => {
    const out = await oplogOf(clientOf(null, null, null), URI);
    expect(out.oplog).toEqual({ entries: 0, dataBytes: 0, maxBytes: null, firstAt: null, lastAt: null, windowSeconds: null });
    const half = await oplogOf(clientOf({}, { wall: T1 }, {}), URI);
    expect(half.oplog).toMatchObject({ firstAt: T1.toISOString(), lastAt: null, windowSeconds: null });
  });

  it('answers null with the refusal, scrubbed, when the account cannot read the local database', async () => {
    const out = await oplogOf(clientOf(null, null, null, new Error(`not authorized for ${URI}`)), URI);
    expect(out.oplog).toBeNull();
    expect(out.oplogError).toContain('not authorized');
    expect(out.oplogError).not.toContain('pw');
  });
});
