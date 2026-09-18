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
  ...over,
});

export const makeDatabaseServer = (over: Partial<DatabaseServer> = {}): DatabaseServer => ({
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
