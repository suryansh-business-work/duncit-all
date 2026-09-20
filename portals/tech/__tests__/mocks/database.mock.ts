import type {
  DatabaseCollection,
  DatabaseConnection,
  DatabaseInfo,
  DatabaseServer,
  DatabaseStorage,
} from '../../src/pages/database/info/queries';

/**
 * Database > Info mocks, typed against the page's own projection of
 * `TechDatabaseInfo` in `database/info/queries.ts`. The default is production's
 * self-hosted database as the page shows it: password already masked.
 */
export const makeDatabaseConnection = (over: Partial<DatabaseConnection> = {}): DatabaseConnection => ({
  provider: 'SELF_HOSTED',
  maskedUri: 'mongodb://duncit_prod:••••@duncit-mongo:27017',
  username: 'duncit_prod',
  authSource: 'admin',
  hosts: ['duncit-mongo:27017'],
  replicaSet: 'rs0',
  tls: false,
  databaseName: 'test',
  databaseNamePinned: true,
  environment: 'production',
  secretName: 'MONGO_URI',
  deployBranch: 'main',
  secretsUrl: 'https://github.com/suryansh-business-work/duncit-all/settings/secrets/actions',
  deployRunsUrl: 'https://github.com/suryansh-business-work/duncit-all/actions/workflows/deploy.yml?query=branch%3Amain',
  state: 'connected',
  minPoolSize: 10,
  maxPoolSize: 100,
  maxTimeMs: 30_000,
  logsContainer: 'duncit-mongo',
  ...over,
});

export const makeDatabaseServer = (over: Partial<DatabaseServer> = {}): DatabaseServer => ({
  version: '8.0.12',
  setName: 'rs0',
  isWritablePrimary: true,
  members: ['duncit-mongo:27017'],
  primary: 'duncit-mongo:27017',
  me: 'duncit-mongo:27017',
  lastWriteAt: '2026-09-18T11:59:58.000Z',
  uptimeSeconds: 3600,
  connectionsCurrent: 42,
  connectionsAvailable: 838_818,
  connectionsTotalCreated: 120,
  storageEngine: 'wiredTiger',
  opInsert: 12_400,
  opQuery: 980_000,
  opUpdate: 45_000,
  opDelete: 310,
  opCommand: 1_200_000,
  memResidentBytes: 512 * 1024 ** 2,
  networkBytesIn: 2.1 * 1024 ** 3,
  networkBytesOut: 9.4 * 1024 ** 3,
  networkRequests: 2_150_000,
  cacheBytes: 310 * 1024 ** 2,
  cacheMaxBytes: 512 * 1024 ** 2,
  statusError: null,
  ...over,
});

export const makeDatabaseStorage = (over: Partial<DatabaseStorage> = {}): DatabaseStorage => ({
  collections: 231,
  views: 0,
  documents: 1500,
  avgDocumentBytes: 512,
  dataBytes: 768_000,
  storageBytes: 400_000,
  indexes: 612,
  indexBytes: 200_000,
  totalBytes: 600_000,
  fsUsedBytes: 40 * 1024 ** 3,
  fsTotalBytes: 100 * 1024 ** 3,
  ...over,
});

export const makeDatabaseInfo = (over: Partial<DatabaseInfo> = {}): DatabaseInfo => ({
  connection: makeDatabaseConnection(),
  server: makeDatabaseServer(),
  storage: makeDatabaseStorage(),
  pingMs: 0.4,
  statsError: null,
  databases: [
    { name: 'test', isLive: true, sizeOnDisk: 600_000, empty: false, storage: makeDatabaseStorage(), statsError: null },
    {
      name: 'duncit-staging',
      isLive: false,
      sizeOnDisk: 420_000,
      empty: false,
      storage: makeDatabaseStorage({ collections: 228, documents: 1100 }),
      statsError: null,
    },
  ],
  databasesError: null,
  replica: {
    set: 'rs0',
    term: 3,
    myState: 'PRIMARY',
    primary: 'duncit-mongo:27017',
    heartbeatIntervalMs: 2000,
    configVersion: 1,
    members: [
      {
        name: 'duncit-mongo:27017',
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
      },
    ],
  },
  replicaError: null,
  oplog: {
    entries: 48_000,
    dataBytes: 96 * 1024 ** 2,
    maxBytes: 990 * 1024 ** 2,
    firstAt: '2026-09-17T12:00:00.000Z',
    lastAt: '2026-09-18T11:59:58.000Z',
    windowSeconds: 86_398,
  },
  oplogError: null,
  events: [
    { at: '2026-09-18T10:52:03.000Z', kind: 'CONNECTED', message: null, attempt: 2 },
    { at: '2026-09-18T10:51:30.000Z', kind: 'CONNECT_FAILED', message: 'Authentication failed.', attempt: 1 },
  ],
  collectedAt: '2026-09-18T12:00:00.000Z',
  ...over,
});

export const makeDatabaseCollection = (over: Partial<DatabaseCollection> = {}): DatabaseCollection => ({
  name: 'pods',
  documents: 1200,
  dataBytes: 768_000,
  storageBytes: 300_000,
  indexBytes: 150_000,
  indexes: 5,
  avgDocumentBytes: 640,
  ...over,
});
