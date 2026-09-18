import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';

jest.mock('@utils/github-actions', () => ({
  ...jest.requireActual('@utils/github-actions'),
  githubRepoConfig: jest.fn(),
}));

import { githubRepoConfig } from '@utils/github-actions';
import { recordDbEvent } from '@config/dbConnectionLog';
import { databaseCollectionsTable, databaseInfo } from '../../tech.database';

// Minted per run so no credential ever sits in the source (S2068).
const password = randomBytes(6).toString('hex');
const uri = `mongodb://duncit_prod:${password}@duncit-mongo:27017/?replicaSet=rs0`;
const masked = 'mongodb://duncit_prod:••••@duncit-mongo:27017';

const host = (address: string) => ({ toString: () => address });
const selfHosted = {
  hosts: [host('duncit-mongo:27017')],
  replicaSet: 'rs0',
  tls: false,
  credentials: { username: 'duncit_prod', source: 'admin' },
};
const atlas = {
  hosts: [host('cluster0.ab12c.mongodb.net')],
  srvHost: 'cluster0.ab12c.mongodb.net',
  tls: true,
};

const collStats: Record<string, unknown[]> = {
  users: [
    {
      storageStats: {
        count: 1200,
        size: 600_000,
        storageSize: 300_000,
        totalIndexSize: 150_000,
        nindexes: 5,
        avgObjSize: 500,
      },
    },
  ],
  // A collection whose stats carry no storageStats, and one that answers nothing.
  pods: [{}],
};

const admin = { ping: jest.fn(), buildInfo: jest.fn(), command: jest.fn(), serverStatus: jest.fn() };
const db = {
  admin: () => admin,
  stats: jest.fn(),
  listCollections: jest.fn(),
  collection: jest.fn((name: string) => ({
    aggregate: () => ({ toArray: async () => collStats[name] ?? [] }),
  })),
};

const conn = mongoose.connection;

function setConnection({ readyState = 1, withDb = true, options = selfHosted as object } = {}) {
  Object.defineProperty(conn, 'readyState', { value: readyState, configurable: true });
  Object.defineProperty(conn, 'db', { value: withDb ? db : undefined, configurable: true, writable: true });
  Object.defineProperty(conn, 'name', { value: 'test', configurable: true, writable: true });
  jest.spyOn(conn, 'getClient').mockReturnValue({ options } as unknown as ReturnType<typeof conn.getClient>);
}

const env = { ...process.env };

beforeEach(() => {
  process.env = { ...env, MONGO_URI: uri };
  delete process.env.MONGO_DB_NAME;
  delete process.env.APP_ENV;
  jest.mocked(githubRepoConfig).mockResolvedValue(null);
  admin.ping.mockResolvedValue({ ok: 1 });
  admin.buildInfo.mockResolvedValue({ version: '8.0.12' });
  admin.command.mockResolvedValue({ setName: 'rs0', isWritablePrimary: true, hosts: ['duncit-mongo:27017'] });
  admin.serverStatus.mockResolvedValue({
    uptime: 3600,
    connections: { current: 42, available: 838_818, totalCreated: 120 },
    storageEngine: { name: 'wiredTiger' },
  });
  db.stats.mockResolvedValue({
    collections: 3,
    views: 1,
    objects: 1500,
    avgObjSize: 512,
    dataSize: 768_000,
    storageSize: 400_000,
    indexes: 9,
    indexSize: 200_000,
    totalSize: 600_000,
    fsUsedSize: 40e9,
    fsTotalSize: 100e9,
  });
  db.listCollections.mockReturnValue({
    toArray: async () => [{ name: 'users' }, { name: 'pods' }, { name: 'events' }, { name: 'system.views' }],
  });
  setConnection();
});

afterAll(() => {
  process.env = env;
});

describe('databaseInfo', () => {
  it('describes a self-hosted database on a local server with the password masked', async () => {
    const info = await databaseInfo();

    expect(info.connection).toMatchObject({
      provider: 'SELF_HOSTED',
      maskedUri: masked,
      username: 'duncit_prod',
      authSource: 'admin',
      hosts: ['duncit-mongo:27017'],
      replicaSet: 'rs0',
      tls: false,
      databaseName: 'test',
      databaseNamePinned: false,
      environment: 'localhost',
      secretName: null,
      deployBranch: null,
      secretsUrl: null,
      deployRunsUrl: null,
      state: 'connected',
    });
    expect(info.server).toEqual({
      version: '8.0.12',
      setName: 'rs0',
      isWritablePrimary: true,
      members: ['duncit-mongo:27017'],
      uptimeSeconds: 3600,
      connectionsCurrent: 42,
      connectionsAvailable: 838_818,
      connectionsTotalCreated: 120,
      storageEngine: 'wiredTiger',
      statusError: null,
    });
    expect(info.storage).toEqual({
      collections: 3,
      views: 1,
      documents: 1500,
      avgDocumentBytes: 512,
      dataBytes: 768_000,
      storageBytes: 400_000,
      indexes: 9,
      indexBytes: 200_000,
      totalBytes: 600_000,
      fsUsedBytes: 40e9,
      fsTotalBytes: 100e9,
    });
    expect(info.pingMs).toEqual(expect.any(Number));
    expect(info.statsError).toBeNull();
    expect(JSON.stringify(info)).not.toContain(password);
  });

  it('names the deploy secret, branch and GitHub links for production and staging', async () => {
    process.env.NODE_ENV = 'production';
    jest.mocked(githubRepoConfig).mockResolvedValue({
      token: '',
      owner: 'suryansh-business-work',
      repo: 'duncit-all',
    });

    const production = (await databaseInfo()).connection;
    expect(production).toMatchObject({
      environment: 'production',
      secretName: 'MONGO_URI',
      deployBranch: 'main',
      secretsUrl: 'https://github.com/suryansh-business-work/duncit-all/settings/secrets/actions',
    });
    expect(production.deployRunsUrl).toContain('/actions/workflows/deploy.yml?query=branch%3Amain');

    process.env.APP_ENV = 'staging';
    const staging = (await databaseInfo()).connection;
    expect(staging).toMatchObject({ environment: 'staging', secretName: 'STAGING_MONGO_URI', deployBranch: 'staging' });
    expect(staging.deployRunsUrl).toContain('query=branch%3Astaging');
  });

  it('recognises Atlas through its SRV host and fills what the server leaves out', async () => {
    process.env.MONGO_DB_NAME = 'duncit-staging';
    setConnection({ options: atlas });
    admin.command.mockResolvedValue({});
    admin.serverStatus.mockResolvedValue({ uptime: 10 });
    db.stats.mockResolvedValue({ collections: 0, objects: 0, dataSize: 0, storageSize: 100, indexes: 0, indexSize: 50 });

    const info = await databaseInfo();

    expect(info.connection).toMatchObject({
      provider: 'ATLAS',
      hosts: ['cluster0.ab12c.mongodb.net'],
      username: null,
      authSource: null,
      replicaSet: null,
      tls: true,
      databaseNamePinned: true,
    });
    expect(info.server).toMatchObject({
      setName: null,
      isWritablePrimary: null,
      members: [],
      connectionsCurrent: null,
      connectionsAvailable: null,
      connectionsTotalCreated: null,
      storageEngine: null,
    });
    expect(info.storage).toMatchObject({ views: 0, avgDocumentBytes: 0, totalBytes: 150, fsUsedBytes: null, fsTotalBytes: null });
  });

  it('keeps the page answering when serverStatus is refused, scrubbing the reason', async () => {
    admin.serverStatus.mockRejectedValue(new Error(`not authorized on admin to execute serverStatus via ${uri}`));

    const { server } = await databaseInfo();

    expect(server).toMatchObject({
      version: '8.0.12',
      uptimeSeconds: null,
      connectionsCurrent: null,
      connectionsAvailable: null,
      connectionsTotalCreated: null,
      storageEngine: null,
    });
    expect(server?.statusError).toContain('not authorized');
    expect(server?.statusError).toContain(masked);
    expect(server?.statusError).not.toContain(password);
  });

  it('reports a stats failure without the connection string', async () => {
    db.stats.mockRejectedValue(new Error(`connection to ${uri} timed out`));

    const info = await databaseInfo();

    expect(info).toMatchObject({ server: null, storage: null, pingMs: null });
    expect(info.statsError).toContain('timed out');
    expect(info.statsError).not.toContain(password);
  });

  it('does not query a database it is not connected to', async () => {
    setConnection({ readyState: 0 });
    const disconnected = await databaseInfo();
    expect(disconnected).toMatchObject({ server: null, storage: null, pingMs: null, statsError: null });
    expect(disconnected.connection.state).toBe('disconnected');

    setConnection({ withDb: false });
    expect(await databaseInfo()).toMatchObject({ server: null, storage: null, statsError: null });
    expect(db.stats).not.toHaveBeenCalled();
  });

  it('returns the connection log newest first, scrubbed of the connection string', async () => {
    recordDbEvent('CONNECT_FAILED', `bad auth for ${uri}`, 1);
    recordDbEvent('CONNECTED', null, 2);

    const [connected, failed] = (await databaseInfo()).events;

    expect(connected).toMatchObject({ kind: 'CONNECTED', message: null, attempt: 2 });
    expect(failed.kind).toBe('CONNECT_FAILED');
    expect(failed.message).toContain('bad auth for');
    expect(failed.message).not.toContain(password);
  });

  it('shows an empty connection string when MONGO_URI is unset', async () => {
    delete process.env.MONGO_URI;
    expect((await databaseInfo()).connection.maskedUri).toBe('');
  });
});

describe('databaseCollectionsTable', () => {
  it('sizes every non-system collection, largest on disk first', async () => {
    const page = await databaseCollectionsTable();

    expect(page.total).toBe(3);
    expect(page.rows[0]).toEqual({
      name: 'users',
      documents: 1200,
      dataBytes: 600_000,
      storageBytes: 300_000,
      indexBytes: 150_000,
      indexes: 5,
      avgDocumentBytes: 500,
    });
    expect(page.rows.find((row) => row.name === 'pods')).toMatchObject({ documents: 0, storageBytes: 0, indexes: 0 });
    expect(db.collection).not.toHaveBeenCalledWith('system.views');
  });

  it('applies the table query', async () => {
    const page = await databaseCollectionsTable({ search: 'pod' });
    expect(page.rows.map((row) => row.name)).toEqual(['pods']);
  });

  it('is empty without a database handle', async () => {
    setConnection({ withDb: false });
    expect(await databaseCollectionsTable()).toMatchObject({ rows: [], total: 0 });
  });
});
