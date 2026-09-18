/**
 * Tech > Database > Info: which MongoDB this API is connected to, how big it
 * is, and what its connection has been through since the process started.
 *
 * The connection string is only ever returned masked (Data Clone's `maskUri`),
 * and driver messages are scrubbed of it — the password stays on the server.
 * Changing the database is a GitHub secret + a deploy, never this page: the
 * deploy rewrites server.env from the secret, so anything edited here or on
 * the host would be undone by the next push.
 */
import { performance } from 'node:perf_hooks';
import mongoose, { mongo } from 'mongoose';
import { MONGO_MAX_POOL_SIZE, MONGO_MAX_TIME_MS, MONGO_MIN_POOL_SIZE } from '@config/db';
import { dbConnectionEvents } from '@config/dbConnectionLog';
import { getStatusEnvironment } from '@observability/statusServices';
import { githubRepoConfig, workflowRunsUrl } from '@utils/github-actions';
import {
  applyTableQueryInMemory,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';
import { maskUri, scrubUri } from '../dataClone/dataCloneConnection.service';

type DbEnvironment = 'production' | 'staging' | 'localhost';

/** Where each environment's MONGO_URI comes from — mirrors .github/workflows/deploy.yml. */
const DEPLOY_SOURCE: Record<DbEnvironment, { secret: string; branch: string } | null> = {
  production: { secret: 'MONGO_URI', branch: 'main' },
  staging: { secret: 'STAGING_MONGO_URI', branch: 'staging' },
  localhost: null,
};

/** One $collStats per collection; batched so ~250 of them never drain the pool. */
const COLLECTION_BATCH = 10;

export interface TechDatabaseCollection {
  name: string;
  documents: number;
  dataBytes: number;
  storageBytes: number;
  indexBytes: number;
  indexes: number;
  avgDocumentBytes: number;
}

const COLLECTION_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['name'],
  sortFields: {
    name: 'name',
    documents: 'documents',
    dataBytes: 'dataBytes',
    storageBytes: 'storageBytes',
    indexBytes: 'indexBytes',
    indexes: 'indexes',
    avgDocumentBytes: 'avgDocumentBytes',
  },
  filterFields: {
    name: { type: 'string' },
    documents: { type: 'number' },
    dataBytes: { type: 'number' },
    storageBytes: { type: 'number' },
    indexBytes: { type: 'number' },
    indexes: { type: 'number' },
  },
  defaultSort: { storageBytes: -1 },
};

function environmentOf(): DbEnvironment {
  return process.env.NODE_ENV === 'production' ? getStatusEnvironment() : 'localhost';
}

/** Atlas answers on *.mongodb.net, directly or through its SRV record. */
function providerOf(hosts: string[]): 'ATLAS' | 'SELF_HOSTED' {
  return hosts.some((host) => host.split(':')[0].endsWith('.mongodb.net')) ? 'ATLAS' : 'SELF_HOSTED';
}

function hostsOf(options: mongo.MongoOptions): string[] {
  return options.srvHost ? [options.srvHost] : options.hosts.map(String);
}

async function deployLinks(branch: string | undefined) {
  const cfg = await githubRepoConfig();
  if (!cfg || !branch) return { secretsUrl: null, deployRunsUrl: null };
  return {
    secretsUrl: `https://github.com/${cfg.owner}/${cfg.repo}/settings/secrets/actions`,
    deployRunsUrl: workflowRunsUrl(cfg, 'deploy.yml', branch),
  };
}

async function connectionOf(uri: string) {
  const conn = mongoose.connection;
  const options = conn.getClient().options;
  const hosts = hostsOf(options);
  const environment = environmentOf();
  const source = DEPLOY_SOURCE[environment];
  return {
    provider: providerOf(hosts),
    maskedUri: maskUri(uri),
    username: options.credentials?.username ?? null,
    authSource: options.credentials?.source ?? null,
    hosts,
    replicaSet: options.replicaSet ?? null,
    tls: options.tls,
    databaseName: conn.name,
    databaseNamePinned: Boolean(process.env.MONGO_DB_NAME),
    environment,
    secretName: source?.secret ?? null,
    deployBranch: source?.branch ?? null,
    ...(await deployLinks(source?.branch)),
    state: mongoose.ConnectionStates[conn.readyState],
    minPoolSize: MONGO_MIN_POOL_SIZE,
    maxPoolSize: MONGO_MAX_POOL_SIZE,
    maxTimeMs: MONGO_MAX_TIME_MS,
  };
}

async function pingMs(db: mongo.Db): Promise<number> {
  const started = performance.now();
  await db.admin().ping();
  return Math.round((performance.now() - started) * 10) / 10;
}

async function storageOf(db: mongo.Db) {
  const s: mongo.Document = await db.stats();
  return {
    collections: s.collections,
    views: s.views ?? 0,
    documents: s.objects,
    avgDocumentBytes: s.avgObjSize ?? 0,
    dataBytes: s.dataSize,
    storageBytes: s.storageSize,
    indexes: s.indexes,
    indexBytes: s.indexSize,
    totalBytes: s.totalSize ?? s.storageSize + s.indexSize,
    // The filesystem mongod keeps its data on. Atlas' shared tiers omit it.
    fsUsedBytes: s.fsUsedSize ?? null,
    fsTotalBytes: s.fsTotalSize ?? null,
  };
}

/**
 * serverStatus needs the clusterMonitor role, which the app's own database user
 * is not normally given — so its fields come back empty with the refusal as
 * the reason, while the rest of the page still answers.
 */
async function serverOf(db: mongo.Db, uri: string) {
  const admin = db.admin();
  const [build, hello] = await Promise.all([admin.buildInfo(), admin.command({ hello: 1 })]);
  const base = {
    version: build.version,
    setName: hello.setName ?? null,
    isWritablePrimary: hello.isWritablePrimary ?? null,
    members: hello.hosts ?? [],
  };
  try {
    const status = await admin.serverStatus();
    return {
      ...base,
      uptimeSeconds: status.uptime,
      connectionsCurrent: status.connections?.current ?? null,
      connectionsAvailable: status.connections?.available ?? null,
      connectionsTotalCreated: status.connections?.totalCreated ?? null,
      storageEngine: status.storageEngine?.name ?? null,
      statusError: null,
    };
  } catch (err) {
    return {
      ...base,
      uptimeSeconds: null,
      connectionsCurrent: null,
      connectionsAvailable: null,
      connectionsTotalCreated: null,
      storageEngine: null,
      statusError: scrubUri((err as Error).message, uri),
    };
  }
}

async function collectionOf(db: mongo.Db, name: string): Promise<TechDatabaseCollection> {
  const [stats] = await db.collection(name).aggregate([{ $collStats: { storageStats: {} } }]).toArray();
  const s: mongo.Document = stats?.storageStats ?? {};
  return {
    name,
    documents: s.count ?? 0,
    dataBytes: s.size ?? 0,
    storageBytes: s.storageSize ?? 0,
    indexBytes: s.totalIndexSize ?? 0,
    indexes: s.nindexes ?? 0,
    avgDocumentBytes: s.avgObjSize ?? 0,
  };
}

async function collectionsOf(db: mongo.Db): Promise<TechDatabaseCollection[]> {
  const listed = await db.listCollections({ type: 'collection' }, { nameOnly: true }).toArray();
  const names = listed.map((c) => c.name).filter((name) => !name.startsWith('system.'));
  const rows: TechDatabaseCollection[] = [];
  for (let i = 0; i < names.length; i += COLLECTION_BATCH) {
    const batch = await Promise.all(names.slice(i, i + COLLECTION_BATCH).map((name) => collectionOf(db, name)));
    rows.push(...batch);
  }
  return rows;
}

export async function databaseInfo() {
  const uri = process.env.MONGO_URI ?? '';
  const { db } = mongoose.connection;
  const connection = await connectionOf(uri);
  const events = dbConnectionEvents().map((e) => ({
    ...e,
    message: e.message && scrubUri(e.message, uri),
  }));
  const empty = { server: null, storage: null, pingMs: null, statsError: null };
  const collectedAt = new Date().toISOString();
  // Not connected: say so through `state` rather than wait on a driver timeout.
  if (!db || mongoose.connection.readyState !== mongoose.ConnectionStates.connected) {
    return { connection, ...empty, events, collectedAt };
  }
  try {
    const [server, storage, ping] = await Promise.all([serverOf(db, uri), storageOf(db), pingMs(db)]);
    return { connection, server, storage, pingMs: ping, statsError: null, events, collectedAt };
  } catch (err) {
    return { connection, ...empty, statsError: scrubUri((err as Error).message, uri), events, collectedAt };
  }
}

export async function databaseCollectionsTable(input?: TableQueryInput | null) {
  const { db } = mongoose.connection;
  const rows = db ? await collectionsOf(db) : [];
  return applyTableQueryInMemory(
    rows as Array<TechDatabaseCollection & Record<string, unknown>>,
    input,
    COLLECTION_TABLE_CONFIG,
  );
}
