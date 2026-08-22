/**
 * Restores the live database from a backup archive.
 *
 * This is the one operation here that destroys data: every collection the
 * archive carries is DROPPED and rewritten from it, so anything written since
 * the archive was taken is gone. It runs in the background like the backup
 * walk, reports the same way, and refuses to start while either a backup or
 * another restore is still moving.
 *
 * The awkward part, and the reason this file exists rather than another branch
 * in dbBackup.service: a restore overwrites the very collections that record
 * its own progress. The archive holds a snapshot of `dbbackups` taken before
 * this restore existed, so restoring it would delete the row being written to
 * while it is being written to — the progress would vanish mid-run, and every
 * backup taken since would be erased from the table while its archive sat on
 * disk unreferenced. Those three bookkeeping collections are therefore skipped,
 * and the skip is reported rather than silent.
 */
import { GraphQLError } from 'graphql';
import { mongo } from 'mongoose';
import { logs } from '@observability/log';
import type { AuthUser } from '@context';
import { readArchive } from './dbBackup.archive';
import {
  DbBackupModel,
  DbBackupSettingsModel,
  DbRestoreModel,
  type DbBackupDoc,
  type DbRestoreDoc,
} from './dbBackup.model';
import { liveDb } from './dbBackup.service';
import { backupPath } from './dbBackup.store';

const HEARTBEAT_STALE_MS = 120_000;
const INTERRUPTED_ERROR =
  'The server restarted while this restore was running, so the database is part-way through it. Restore again from the same backup.';

/** Documents per insert. The driver splits oversized batches itself. */
const INSERT_BATCH_SIZE = 500;

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

/**
 * The collections a restore never touches, read off the models rather than
 * spelled out, so renaming one cannot leave this list quietly wrong.
 */
const SKIPPED_COLLECTIONS: string[] = [
  DbBackupModel.collection.collectionName,
  DbBackupSettingsModel.collection.collectionName,
  DbRestoreModel.collection.collectionName,
];

const iso = (value: Date | null | undefined): string | null => (value ? value.toISOString() : null);

export interface PublicRestoreCollection {
  name: string;
  documents: number;
  error: string | null;
}

export interface PublicRestore {
  id: string;
  status: string;
  backupId: string;
  backupFile: string;
  backupTakenAt: string | null;
  collections: PublicRestoreCollection[];
  collectionsTotal: number;
  currentCollection: string | null;
  documentsRestored: number;
  skipped: string[];
  error: string | null;
  startedBy: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

function toPublic(doc: DbRestoreDoc): PublicRestore {
  const collections = doc.collections ?? [];
  return {
    id: String(doc._id),
    status: doc.status,
    backupId: String(doc.backup_id),
    backupFile: doc.backup_file,
    backupTakenAt: iso(doc.backup_taken_at),
    collections: collections.map((c) => ({
      name: c.name,
      documents: c.documents,
      error: c.error ?? null,
    })),
    collectionsTotal: collections.length,
    currentCollection: doc.current_collection ?? null,
    documentsRestored: doc.documents_restored ?? 0,
    skipped: doc.skipped ?? [],
    error: doc.error ?? null,
    startedBy: doc.started_by ?? null,
    startedAt: iso(doc.started_at),
    finishedAt: iso(doc.finished_at),
  };
}

function touch(id: string, fields: Record<string, unknown> = {}): Promise<unknown> {
  return DbRestoreModel.updateOne(
    { _id: id },
    { $set: { heartbeat_at: new Date(), ...fields } },
  ).exec();
}

/**
 * One collection being rewritten. Holds the open batch so the frame loop stays
 * a loop rather than growing a second set of counters around it.
 */
interface Target {
  name: string;
  collection: mongo.Collection;
  batch: mongo.Document[];
  documents: number;
}

async function flush(target: Target | null): Promise<void> {
  if (!target || target.batch.length === 0) return;
  await target.collection.insertMany(target.batch, { ordered: false });
  target.documents += target.batch.length;
  target.batch = [];
}

/** Close the collection just finished, recording what landed in it. */
async function closeTarget(id: string, target: Target | null, total: number): Promise<number> {
  if (!target) return total;
  await flush(target);
  const documents = target.documents;
  await DbRestoreModel.updateOne(
    { _id: id },
    {
      $push: { collections: { name: target.name, documents } },
      $set: { documents_restored: total + documents, heartbeat_at: new Date() },
    },
  ).exec();
  return total + documents;
}

/** Drop what is there and recreate the archive's indexes on the empty collection. */
async function openTarget(
  db: mongo.Db,
  name: string,
  indexes: mongo.IndexDescription[],
): Promise<Target> {
  const existing = await db.listCollections({ name }, { nameOnly: true }).toArray();
  if (existing.length > 0) await db.collection(name).drop();
  const collection = db.collection(name);
  if (indexes.length > 0) {
    await collection.createIndexes(indexes);
  }
  return { name, collection, batch: [], documents: 0 };
}

async function failRestore(id: string, err: unknown): Promise<void> {
  logs.server.error('dbBackup', 'runRestore', { error: err, restoreId: id });
  await DbRestoreModel.updateOne(
    { _id: id },
    {
      $set: {
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Restore failed',
        current_collection: null,
        finished_at: new Date(),
        heartbeat_at: new Date(),
      },
    },
  ).exec();
}

/** The background walk. Never rejects — every failure lands on the row. */
async function runRestore(id: string, archive: string): Promise<void> {
  const db = liveDb();
  let target: Target | null = null;
  let total = 0;
  try {
    for await (const entry of readArchive(archive)) {
      if (entry.kind === 'collection') {
        total = await closeTarget(id, target, total);
        if (SKIPPED_COLLECTIONS.includes(entry.name)) {
          target = null;
          continue;
        }
        await touch(id, { current_collection: entry.name });
        target = await openTarget(db, entry.name, entry.indexes);
      } else if (entry.kind === 'document' && target) {
        target.batch.push(entry.doc);
        if (target.batch.length >= INSERT_BATCH_SIZE) await flush(target);
      }
    }
    total = await closeTarget(id, target, total);
    await DbRestoreModel.updateOne(
      { _id: id },
      {
        $set: {
          status: 'SUCCEEDED',
          current_collection: null,
          documents_restored: total,
          finished_at: new Date(),
          heartbeat_at: new Date(),
        },
      },
    ).exec();
  } catch (err) {
    await failRestore(id, err);
  }
}

function findRestore(id?: string | null): Promise<DbRestoreDoc | null> {
  if (id) return DbRestoreModel.findById(id).lean<DbRestoreDoc>().exec();
  return DbRestoreModel.findOne().sort({ started_at: -1 }).lean<DbRestoreDoc>().exec();
}

/** Flip an abandoned RUNNING row to FAILED so the UI stops waiting on it. */
async function repairIfStale(doc: DbRestoreDoc): Promise<DbRestoreDoc> {
  if (doc.status !== 'RUNNING') return doc;
  const beat = doc.heartbeat_at ?? doc.started_at;
  if (Date.now() - new Date(beat).getTime() <= HEARTBEAT_STALE_MS) return doc;
  const repaired = {
    status: 'FAILED' as const,
    error: INTERRUPTED_ERROR,
    current_collection: null,
    finished_at: new Date(),
  };
  await DbRestoreModel.updateOne({ _id: doc._id }, { $set: repaired }).exec();
  return { ...doc, ...repaired };
}

async function restoreInFlight(): Promise<boolean> {
  const running = await DbRestoreModel.find({ status: 'RUNNING' }).lean<DbRestoreDoc[]>().exec();
  const repaired = await Promise.all(running.map(repairIfStale));
  return repaired.some((doc) => doc.status === 'RUNNING');
}

export const dbRestoreService = {
  /** One restore by id, or the most recent one. Polled for progress. */
  async restoreJob(id?: string | null): Promise<PublicRestore | null> {
    const doc = await findRestore(id);
    if (!doc) return null;
    return toPublic(await repairIfStale(doc));
  },

  /** The collections a restore will leave alone, so the UI can say so up front. */
  skippedCollections: () => [...SKIPPED_COLLECTIONS],

  /**
   * Start a restore and return immediately — the walk continues server-side.
   *
   * Refuses while a backup is running, because that backup would archive a
   * database half-way through being replaced and the result would look valid.
   */
  async start(backupId: string, user: AuthUser): Promise<PublicRestore> {
    const backup = await DbBackupModel.findById(backupId).lean<DbBackupDoc>().exec();
    if (!backup) throw badInput('That backup no longer exists.');
    if (!backup.file_name) throw badInput('That backup has no archive left to restore from.');
    if (backup.status !== 'SUCCEEDED') {
      throw badInput('Only a finished backup can be restored.');
    }
    const archive = backupPath(backup.file_name);
    if (!archive) throw badInput('That backup archive is not in the backups directory.');
    if (await restoreInFlight()) throw badInput('A restore is already running.');
    const backupRunning = await DbBackupModel.exists({ status: 'RUNNING' });
    if (backupRunning) throw badInput('A backup is running — wait for it to finish.');

    logs.server.warn('dbBackup', 'startRestore', {
      userId: user.id,
      backupId,
      file: backup.file_name,
    });
    const doc = await DbRestoreModel.create({
      status: 'RUNNING',
      backup_id: backup._id,
      backup_file: backup.file_name,
      backup_taken_at: backup.started_at,
      skipped: SKIPPED_COLLECTIONS,
      started_by: user.email ?? user.id,
    });
    const id = String(doc._id);
    runRestore(id, archive).catch((err) =>
      logs.server.error('dbBackup', 'startRestore', { error: err, restoreId: id }),
    );
    return toPublic(doc.toObject() as DbRestoreDoc);
  },
};
