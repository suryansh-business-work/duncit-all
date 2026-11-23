import mongoose, { type Connection } from 'mongoose';
import { logs } from '@observability/log';
import { INTEL_LIMITS } from '../../intel.constants';
import type { ResolvedEntry } from '../intel.credentials';
import type { ConnectorDriver, SyncContext, TestResult } from '../intel.driver';
import type { IIntelConnector } from '../intelConnector.model';
import { assertNoForbidden, assertWriteShape, describeShape, fromExtendedJson, previewUpdate, redact, sanitizePipeline, UnsafeQueryError, type WriteOperation } from './mongo.safety';

/**
 * MongoDB connections for Intel. Each Tech portal MONGODB entry gets one small
 * pool, opened on first use and closed after 10 idle minutes. Reads are capped
 * (rows, time) and redacted; writes only ever run from an approved request
 * (intelApproval.service) — nothing here decides whether a write may happen.
 */

const IDLE_MS = 10 * 60_000;
const QUERY_MS = 10_000;
const pools = new Map<string, { conn: Connection; uri: string; used: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, pool] of pools) {
    if (now - pool.used > IDLE_MS) {
      pools.delete(key);
      pool.conn.close().catch((error) => logs.server.debug('intel', 'mongo.close', { error }));
    }
  }
}, 60_000).unref();

async function connectionFor(entry: ResolvedEntry): Promise<Connection> {
  const uri = entry.config.uri ?? '';
  if (!uri) throw new Error(`The Tech portal entry "${entry.name}" has no connection URI.`);
  const cached = pools.get(entry.id);
  if (cached?.uri === uri && cached.conn.readyState === 1) {
    cached.used = Date.now();
    return cached.conn;
  }
  if (cached) await cached.conn.close().catch(() => undefined);
  const conn = await mongoose.createConnection(uri, { maxPoolSize: 4, serverSelectionTimeoutMS: 8000, socketTimeoutMS: 30_000, appName: 'duncit-intel' }).asPromise();
  pools.set(entry.id, { conn, uri, used: Date.now() });
  return conn;
}

export const databaseName = (connector: IIntelConnector, entry: ResolvedEntry): string =>
  String(connector.config.database || entry.config.database || '');

async function dbFor(connector: IIntelConnector, entry: ResolvedEntry) {
  const conn = await connectionFor(entry);
  const name = databaseName(connector, entry);
  const db = name ? conn.useDb(name, { useCache: true }).db : conn.db;
  if (!db) throw new Error('No database selected for this connection.');
  return db;
}

export const permittedCollections = (connector: IIntelConnector): string[] => (connector.config.collections as string[] | undefined) ?? [];
const accessMode = (connector: IIntelConnector) => String(connector.config.access_mode ?? 'READ_ONLY');
export const canRead = (connector: IIntelConnector) => accessMode(connector) !== 'WRITE_ONLY';
export const canWrite = (connector: IIntelConnector) => accessMode(connector) !== 'READ_ONLY';

function assertPermitted(connector: IIntelConnector, collection: string) {
  if (!permittedCollections(connector).includes(collection)) throw new UnsafeQueryError(`Collection "${collection}" is not permitted on ${connector.name}.`);
}

export async function listCollections(connector: IIntelConnector, entry: ResolvedEntry): Promise<string[]> {
  const db = await dbFor(connector, entry);
  const rows = await db.listCollections({}, { nameOnly: true }).toArray();
  return rows.map((r) => r.name).filter((n) => !n.startsWith('system.')).sort((a, b) => a.localeCompare(b));
}

export interface ReadRequest {
  collection: string;
  operation: 'find' | 'aggregate' | 'count';
  filter?: unknown;
  projection?: unknown;
  sort?: unknown;
  limit?: number;
  pipeline?: unknown;
}

export async function readQuery(connector: IIntelConnector, entry: ResolvedEntry, req: ReadRequest): Promise<{ rows: unknown[]; count?: number }> {
  if (!canRead(connector)) throw new UnsafeQueryError(`${connector.name} is write-only.`);
  assertPermitted(connector, req.collection);
  const db = await dbFor(connector, entry);
  const coll = db.collection(req.collection);
  const limit = Math.min(Math.max(req.limit ?? 20, 1), INTEL_LIMITS.maxQueryRows);
  if (req.operation === 'aggregate') {
    const pipeline = sanitizePipeline(fromExtendedJson(req.pipeline ?? []), permittedCollections(connector), limit);
    const rows = await coll.aggregate(pipeline, { maxTimeMS: QUERY_MS, allowDiskUse: false }).toArray();
    return { rows: rows.map((r) => redact(r)) };
  }
  assertNoForbidden(req.filter);
  const filter = fromExtendedJson<Record<string, unknown>>(req.filter ?? {});
  if (req.operation === 'count') return { rows: [], count: await coll.countDocuments(filter, { maxTimeMS: QUERY_MS }) };
  const rows = await coll
    .find(filter, { projection: (req.projection as Record<string, number>) ?? undefined, maxTimeMS: QUERY_MS })
    .sort((req.sort as Record<string, 1 | -1>) ?? { _id: -1 })
    .limit(limit)
    .toArray();
  return { rows: rows.map((r) => redact(r)) };
}

export interface WriteRequest {
  collection: string;
  operation: WriteOperation;
  filter?: unknown;
  payload?: unknown;
}

/** What an approver sees: how many documents match, a few of them, and the result of the change where it can be computed. */
export async function previewWrite(connector: IIntelConnector, entry: ResolvedEntry, req: WriteRequest) {
  if (!canWrite(connector)) throw new UnsafeQueryError(`${connector.name} is read-only.`);
  assertPermitted(connector, req.collection);
  assertWriteShape(req.operation, req.filter, req.payload);
  if (req.operation === 'insertOne') return { matched: 0, before: [], after: [redact(req.payload)] };
  const db = await dbFor(connector, entry);
  const coll = db.collection(req.collection);
  const filter = fromExtendedJson<Record<string, unknown>>(req.filter);
  const matched = await coll.countDocuments(filter, { maxTimeMS: QUERY_MS });
  const docs = await coll.find(filter, { maxTimeMS: QUERY_MS }).limit(INTEL_LIMITS.approvalPreviewDocs).toArray();
  const update = req.operation.startsWith('update') ? fromExtendedJson<Record<string, unknown>>(req.payload) : null;
  const after = req.operation.startsWith('delete') ? [] : docs.map((d) => (update ? redact(previewUpdate(d as Record<string, unknown>, update)) : null));
  return { matched, before: docs.map((d) => redact(d)), after };
}

/** Runs an approved write. Called ONLY by the approval service after its compare-and-set. */
export async function executeWrite(connector: IIntelConnector, entry: ResolvedEntry, req: WriteRequest) {
  if (!canWrite(connector)) throw new UnsafeQueryError(`${connector.name} is read-only.`);
  assertPermitted(connector, req.collection);
  assertWriteShape(req.operation, req.filter, req.payload);
  const coll = (await dbFor(connector, entry)).collection(req.collection);
  const filter = fromExtendedJson<Record<string, unknown>>(req.filter ?? {});
  const payload = fromExtendedJson<Record<string, unknown>>(req.payload ?? {});
  switch (req.operation) {
    case 'insertOne': {
      const r = await coll.insertOne(payload);
      return { inserted: 1, id: String(r.insertedId) };
    }
    case 'updateOne':
    case 'updateMany': {
      const r = req.operation === 'updateOne' ? await coll.updateOne(filter, payload) : await coll.updateMany(filter, payload);
      return { matched: r.matchedCount, modified: r.modifiedCount };
    }
    default: {
      const r = req.operation === 'deleteOne' ? await coll.deleteOne(filter) : await coll.deleteMany(filter);
      return { deleted: r.deletedCount };
    }
  }
}

export const mongoDriver: ConnectorDriver = {
  async test(connector, entry): Promise<TestResult> {
    try {
      const names = await listCollections(connector, entry);
      const permitted = permittedCollections(connector);
      const missing = permitted.filter((p) => !names.includes(p));
      return {
        ok: missing.length === 0,
        message: missing.length ? `Connected, but ${missing.length} permitted collection(s) do not exist.` : `Connected to ${databaseName(connector, entry) || 'the default database'}.`,
        details: [`${names.length} collection(s) found`, ...missing.map((m) => `Missing: ${m}`)],
      };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Connection failed', details: [] };
    }
  },

  /** Indexes each permitted collection's shape (fields, types, size) so the model knows what it can query live. */
  async sync(ctx: SyncContext) {
    const db = await dbFor(ctx.connector, ctx.entry);
    for (const name of permittedCollections(ctx.connector)) {
      const coll = db.collection(name);
      const [count, samples] = await Promise.all([coll.estimatedDocumentCount(), coll.aggregate([{ $sample: { size: 20 } }], { maxTimeMS: QUERY_MS }).toArray()]);
      const fields = describeShape(samples as Record<string, unknown>[]);
      const text = [
        `MongoDB collection "${name}" in ${ctx.connector.environment.toLowerCase()} database ${databaseName(ctx.connector, ctx.entry) || '(default)'} on connection "${ctx.connector.name}".`,
        `About ${count} documents. Query it live with mongo_query (connector ${String(ctx.connector._id)}).`,
        'Fields:',
        ...fields.map((f) => `- ${f.path}: ${f.types.join(' | ')}`),
      ].join('\n');
      const go = await ctx.emit({ external_id: `collection:${name}`, title: `${ctx.connector.name} · ${name} (schema)`, text, metadata: { collection: name, count } });
      if (!go) return;
      ctx.log(`Indexed schema of ${name} (${fields.length} fields)`);
    }
  },
};
