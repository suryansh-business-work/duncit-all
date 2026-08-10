/**
 * Clones the production database into staging, collection by collection.
 *
 * The copy runs in the BACKGROUND on the server (the mutation returns as soon
 * as the job document exists), so closing the browser cannot interrupt it, and
 * every step is written to Mongo so any client — or the same client after a
 * server restart — reads the same progress.
 *
 * Both connection strings come from the environment and the target can never
 * resolve to the source database; see ./dataClone.config.
 */
import { GraphQLError } from 'graphql';
import { mongo } from 'mongoose';
import { logs } from '@observability/log';
import type { AuthUser } from '@context';
import {
  describeCloneEndpoints,
  EXCLUDED_COLLECTIONS,
  resolveCloneEndpoints,
  type CloneEndpoints,
} from './dataClone.config';
import { DataCloneJobModel, type DataCloneJobDoc } from './dataClone.model';

/** Documents per insert. The driver splits oversized batches itself. */
const COPY_BATCH_SIZE = 500;
/**
 * A RUNNING job whose heartbeat is older than this had its process killed
 * (deploy, restart, crash) — nothing else can stop the loop from ticking.
 */
const HEARTBEAT_STALE_MS = 120_000;
const INTERRUPTED_ERROR =
  'The server restarted while this clone was running, so it stopped part-way. Start it again.';

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

export interface PublicCloneCollection {
  name: string;
  status: string;
  sourceCount: number;
  copiedCount: number;
  bytes: number;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface PublicCloneJob {
  id: string;
  status: string;
  sourceDatabase: string;
  targetDatabase: string;
  currentCollection: string | null;
  collectionsTotal: number;
  collectionsDone: number;
  documentsCopied: number;
  bytesCopied: number;
  collections: PublicCloneCollection[];
  excluded: string[];
  error: string | null;
  startedBy: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

const FINISHED_COLLECTION_STATUSES = new Set(['DONE', 'FAILED']);

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

/** Totals are derived from the per-collection rows so they can never drift. */
function toPublic(doc: DataCloneJobDoc): PublicCloneJob {
  const collections = doc.collections ?? [];
  return {
    id: String(doc._id),
    status: doc.status,
    sourceDatabase: doc.source_database,
    targetDatabase: doc.target_database,
    currentCollection: doc.current_collection ?? null,
    collectionsTotal: collections.length,
    collectionsDone: collections.filter((c) => FINISHED_COLLECTION_STATUSES.has(c.status)).length,
    documentsCopied: collections.reduce((sum, c) => sum + c.copied_count, 0),
    bytesCopied: collections.reduce((sum, c) => sum + c.bytes, 0),
    collections: collections.map((c) => ({
      name: c.name,
      status: c.status,
      sourceCount: c.source_count,
      copiedCount: c.copied_count,
      bytes: c.bytes,
      error: c.error ?? null,
      startedAt: iso(c.started_at),
      finishedAt: iso(c.finished_at),
    })),
    excluded: doc.excluded ?? [],
    error: doc.error ?? null,
    startedBy: doc.started_by ?? null,
    startedAt: iso(doc.started_at),
    finishedAt: iso(doc.finished_at),
  };
}

/** Collections worth copying: real collections, not views, not excluded. */
async function cloneableCollections(db: mongo.Db): Promise<string[]> {
  const infos = await db.listCollections({ type: 'collection' }, { nameOnly: true }).toArray();
  const excluded = new Set(EXCLUDED_COLLECTIONS);
  return infos
    .map((info) => info.name)
    .filter((name) => !name.startsWith('system.') && !excluded.has(name))
    .sort((a, b) => a.localeCompare(b));
}

function setCollectionFields(
  jobId: string,
  name: string,
  fields: Record<string, unknown>,
  jobFields: Record<string, unknown> = {},
): Promise<unknown> {
  const $set: Record<string, unknown> = { heartbeat_at: new Date(), ...jobFields };
  for (const [key, value] of Object.entries(fields)) {
    $set[`collections.$.${key}`] = value;
  }
  return DataCloneJobModel.updateOne({ _id: jobId, 'collections.name': name }, { $set }).exec();
}

/** Index definitions minus the server-generated fields Mongo rejects on create. */
function toIndexSpec(index: mongo.Document): mongo.IndexDescription {
  const spec: Record<string, unknown> = { ...index };
  delete spec.v;
  delete spec.ns;
  delete spec.background;
  return spec as unknown as mongo.IndexDescription;
}

async function copyIndexes(source: mongo.Collection, target: mongo.Collection): Promise<void> {
  const specs = (await source.indexes()).filter((i) => i.name !== '_id_').map(toIndexSpec);
  if (specs.length > 0) await target.createIndexes(specs);
}

async function dropTargetCollection(db: mongo.Db, name: string): Promise<void> {
  const existing = await db.listCollections({ name }, { nameOnly: true }).toArray();
  if (existing.length > 0) await db.collection(name).drop();
}

/** Stream one collection across in batches, reporting after every batch. */
async function copyDocuments(
  jobId: string,
  source: mongo.Collection,
  target: mongo.Collection,
  name: string,
): Promise<{ copied: number; bytes: number }> {
  let batch: mongo.Document[] = [];
  let copied = 0;
  let bytes = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    await target.insertMany(batch, { ordered: false });
    copied += batch.length;
    batch = [];
    await setCollectionFields(jobId, name, { copied_count: copied, bytes });
  };

  for await (const doc of source.find({})) {
    batch.push(doc);
    bytes += mongo.BSON.calculateObjectSize(doc);
    if (batch.length >= COPY_BATCH_SIZE) await flush();
  }
  await flush();
  return { copied, bytes };
}

/**
 * Copy exactly one collection. Returns false when it failed — the caller keeps
 * going, so one bad collection never costs the whole clone.
 */
async function copyCollection(
  jobId: string,
  sourceDb: mongo.Db,
  targetDb: mongo.Db,
  name: string,
): Promise<boolean> {
  await setCollectionFields(
    jobId,
    name,
    { status: 'COPYING', started_at: new Date() },
    { current_collection: name },
  );
  try {
    const source = sourceDb.collection(name);
    const sourceCount = await source.countDocuments();
    await setCollectionFields(jobId, name, { source_count: sourceCount });
    await dropTargetCollection(targetDb, name);
    const target = targetDb.collection(name);
    const { copied, bytes } = await copyDocuments(jobId, source, target, name);
    await copyIndexes(source, target);
    await setCollectionFields(jobId, name, {
      status: 'DONE',
      copied_count: copied,
      bytes,
      finished_at: new Date(),
    });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Copy failed';
    logs.server.error('dataClone', 'copyCollection', { error: err, jobId, collection: name });
    await setCollectionFields(jobId, name, {
      status: 'FAILED',
      error: message,
      finished_at: new Date(),
    });
    return false;
  }
}

async function finishJob(jobId: string, failed: number): Promise<void> {
  const ok = failed === 0;
  await DataCloneJobModel.updateOne(
    { _id: jobId },
    {
      $set: {
        status: ok ? 'SUCCEEDED' : 'FAILED',
        error: ok ? null : `${failed} collection(s) failed — see the list below.`,
        current_collection: null,
        finished_at: new Date(),
        heartbeat_at: new Date(),
      },
    },
  ).exec();
}

async function failJob(jobId: string, err: unknown): Promise<void> {
  logs.server.error('dataClone', 'runClone', { error: err, jobId });
  await DataCloneJobModel.updateOne(
    { _id: jobId },
    {
      $set: {
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Clone failed',
        current_collection: null,
        finished_at: new Date(),
        heartbeat_at: new Date(),
      },
    },
  ).exec();
}

/** The background walk. Never rejects — every failure lands on the job doc. */
async function runClone(jobId: string, endpoints: CloneEndpoints): Promise<void> {
  const sourceClient = new mongo.MongoClient(endpoints.sourceUri);
  const targetClient = new mongo.MongoClient(endpoints.targetUri);
  try {
    await sourceClient.connect();
    await targetClient.connect();
    const sourceDb = sourceClient.db(endpoints.sourceDb);
    const targetDb = targetClient.db(endpoints.targetDb);
    const names = await cloneableCollections(sourceDb);
    await DataCloneJobModel.updateOne(
      { _id: jobId },
      { $set: { collections: names.map((name) => ({ name })), heartbeat_at: new Date() } },
    ).exec();

    let failed = 0;
    for (const name of names) {
      const ok = await copyCollection(jobId, sourceDb, targetDb, name);
      if (!ok) failed += 1;
    }
    await finishJob(jobId, failed);
  } catch (err) {
    await failJob(jobId, err);
  } finally {
    await Promise.allSettled([sourceClient.close(), targetClient.close()]);
  }
}

/**
 * One job as a plain object. `.lean()` matters here: the read path patches a
 * stale job by value, and a hydrated document would not spread.
 */
function findJob(id?: string | null): Promise<DataCloneJobDoc | null> {
  if (id) return DataCloneJobModel.findById(id).lean<DataCloneJobDoc>().exec();
  return DataCloneJobModel.findOne().sort({ started_at: -1 }).lean<DataCloneJobDoc>().exec();
}

/** Flip an abandoned RUNNING job to FAILED so the UI stops waiting on it. */
async function repairIfStale(doc: DataCloneJobDoc): Promise<DataCloneJobDoc> {
  if (doc.status !== 'RUNNING') return doc;
  const beat = doc.heartbeat_at ?? doc.started_at;
  if (Date.now() - new Date(beat).getTime() <= HEARTBEAT_STALE_MS) return doc;
  const repaired = {
    status: 'FAILED' as const,
    error: INTERRUPTED_ERROR,
    current_collection: null,
    finished_at: new Date(),
  };
  await DataCloneJobModel.updateOne({ _id: doc._id }, { $set: repaired }).exec();
  return { ...doc, ...repaired };
}

export const dataCloneService = {
  /** What a clone would read and write, and why it cannot run if it cannot. */
  targets() {
    return describeCloneEndpoints();
  },

  /** One job by id, or the most recent one. */
  async job(id?: string | null): Promise<PublicCloneJob | null> {
    const doc = await findJob(id);
    if (!doc) return null;
    return toPublic(await repairIfStale(doc));
  },

  /**
   * Start a clone and return immediately — the walk continues server-side.
   * Refuses while another job is still running so two walks cannot fight over
   * the same target collections.
   */
  async start(user: AuthUser): Promise<PublicCloneJob> {
    const endpoints = resolveCloneEndpoints();
    const latest = await findJob();
    if (latest && (await repairIfStale(latest)).status === 'RUNNING') {
      throw badInput('A clone is already running — wait for it to finish.');
    }
    logs.server.warn('dataClone', 'start', {
      userId: user.id,
      source: endpoints.sourceDb,
      target: endpoints.targetDb,
    });
    const doc = await DataCloneJobModel.create({
      status: 'RUNNING',
      source_database: endpoints.sourceDb,
      target_database: endpoints.targetDb,
      excluded: [...EXCLUDED_COLLECTIONS],
      started_by: user.email ?? user.id,
    });
    runClone(String(doc._id), endpoints).catch((err) =>
      logs.server.error('dataClone', 'start', { error: err, jobId: String(doc._id) }),
    );
    return toPublic(doc);
  },
};
