/**
 * Takes a full backup of the server's own database into one archive on disk.
 *
 * The walk runs in the BACKGROUND (the mutation returns as soon as the row
 * exists), so closing the browser cannot interrupt it, and every step is
 * written to Mongo so any client — or the same client after a restart — reads
 * the same progress. That is the dataClone shape next door, for the same
 * reasons.
 *
 * Unlike a clone, a backup copies EVERYTHING. A clone leaves credentials and
 * tokens behind so staging can never act as production; a backup exists to
 * restore production, and a restore missing the credentials collection is not a
 * restore. The archive is treated accordingly: it never leaves the VPS without
 * a signed link, and it is never served statically.
 */
import { GraphQLError } from 'graphql';
import mongoose, { mongo } from 'mongoose';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import type { AuthUser } from '@context';
import { createArchiveWriter, type ArchiveWriter } from './dbBackup.archive';
import {
  DbBackupModel,
  DbBackupSettingsModel,
  type DbBackupDoc,
  type DbBackupSettingsDoc,
} from './dbBackup.model';
import { isDue, nextRunAt, parseTimeOfDay, type BackupSchedule } from './dbBackup.schedule';
import {
  backupPath,
  backupSize,
  deleteBackupFile,
  ensureBackupsDir,
  newBackupName,
} from './dbBackup.store';
import { signDownloadToken } from './dbBackup.token';

/**
 * A RUNNING row whose heartbeat is older than this had its process killed
 * (deploy, restart, crash) — nothing else can stop the walk from ticking.
 */
const HEARTBEAT_STALE_MS = 120_000;
const INTERRUPTED_ERROR =
  'The server restarted while this backup was running, so it stopped part-way. Run it again.';

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

const DB_BACKUP_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['file_name', 'database', 'started_by', 'error'],
  // Every column the table renders sortable must be listed here — resolveSort
  // silently ignores anything else, so a gap makes the header arrow lie.
  sortFields: {
    started_at: 'started_at',
    finished_at: 'finished_at',
    status: 'status',
    trigger: 'trigger',
    size_bytes: 'size_bytes',
    documents_total: 'documents_total',
    file_name: 'file_name',
    started_by: 'started_by',
  },
  filterFields: {
    status: { type: 'enum' },
    trigger: { type: 'enum' },
    started_at: { type: 'date' },
  },
  defaultSort: { started_at: -1 },
};

export interface PublicBackupCollection {
  name: string;
  documents: number;
  bytes: number;
}

export interface PublicBackup {
  id: string;
  status: string;
  trigger: string;
  database: string;
  fileName: string | null;
  /** False once the archive is gone — the row stays, the download does not. */
  hasFile: boolean;
  sizeBytes: number;
  rawBytes: number;
  documentsTotal: number;
  collectionsTotal: number;
  collections: PublicBackupCollection[];
  currentCollection: string | null;
  error: string | null;
  startedBy: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

const iso = (value: Date | null | undefined): string | null => (value ? value.toISOString() : null);

function toPublic(doc: DbBackupDoc): PublicBackup {
  const collections = doc.collections ?? [];
  return {
    id: String(doc._id),
    status: doc.status,
    trigger: doc.trigger,
    database: doc.database,
    fileName: doc.file_name ?? null,
    hasFile: !!doc.file_name,
    sizeBytes: doc.size_bytes ?? 0,
    rawBytes: doc.raw_bytes ?? 0,
    documentsTotal: doc.documents_total ?? 0,
    collectionsTotal: collections.length,
    collections: collections.map((c) => ({ name: c.name, documents: c.documents, bytes: c.bytes })),
    currentCollection: doc.current_collection ?? null,
    error: doc.error ?? null,
    startedBy: doc.started_by ?? null,
    startedAt: iso(doc.started_at),
    finishedAt: iso(doc.finished_at),
  };
}

/** The live database this server is connected to. */
export function liveDb(): mongo.Db {
  const db = mongoose.connection.db;
  if (!db) throw badInput('The server is not connected to a database.');
  return db;
}

/** Everything worth archiving: real collections, not views, not Mongo's own. */
async function backupableCollections(db: mongo.Db): Promise<string[]> {
  const infos = await db.listCollections({ type: 'collection' }, { nameOnly: true }).toArray();
  return infos
    .map((info) => info.name)
    .filter((name) => !name.startsWith('system.'))
    .sort((a, b) => a.localeCompare(b));
}

/** Index definitions minus the server-generated fields Mongo rejects on create. */
function toIndexSpec(index: mongo.Document): mongo.Document {
  const spec: Record<string, unknown> = { ...index };
  delete spec.v;
  delete spec.ns;
  delete spec.background;
  return spec;
}

function touch(id: string, fields: Record<string, unknown> = {}): Promise<unknown> {
  return DbBackupModel.updateOne(
    { _id: id },
    { $set: { heartbeat_at: new Date(), ...fields } },
  ).exec();
}

/** Stream one collection into the archive, reporting once it is through. */
async function archiveCollection(
  writer: ArchiveWriter,
  db: mongo.Db,
  name: string,
): Promise<{ documents: number; bytes: number }> {
  const source = db.collection(name);
  const indexes = (await source.indexes()).filter((i) => i.name !== '_id_').map(toIndexSpec);
  await writer.startCollection(name, indexes);
  let documents = 0;
  let bytes = 0;
  for await (const doc of source.find({})) {
    await writer.writeDocument(doc);
    documents += 1;
    bytes += mongo.BSON.calculateObjectSize(doc);
  }
  return { documents, bytes };
}

async function failBackup(id: string, err: unknown): Promise<void> {
  logs.server.error('dbBackup', 'runBackup', { error: err, backupId: id });
  await DbBackupModel.updateOne(
    { _id: id },
    {
      $set: {
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Backup failed',
        current_collection: null,
        file_name: null,
        finished_at: new Date(),
        heartbeat_at: new Date(),
      },
    },
  ).exec();
}

/** Record one finished collection and carry the running total forward. */
function recordCollection(
  id: string,
  name: string,
  documents: number,
  bytes: number,
  documentsTotal: number,
): Promise<unknown> {
  return DbBackupModel.updateOne(
    { _id: id },
    {
      $push: { collections: { name, documents, bytes } },
      $set: { documents_total: documentsTotal, heartbeat_at: new Date() },
    },
  ).exec();
}

/** The background walk. Never rejects — every failure lands on the row. */
async function runBackup(id: string, fileName: string, startedAt: Date): Promise<void> {
  const target = backupPath(fileName);
  if (!target) {
    await failBackup(id, new Error(`Refusing to write outside the backups directory: ${fileName}`));
    return;
  }
  const db = liveDb();
  const writer = createArchiveWriter(target, db.databaseName, startedAt);
  try {
    const names = await backupableCollections(db);
    if (names.length === 0) throw new Error(`Nothing to back up: ${db.databaseName} is empty.`);

    let documentsTotal = 0;
    for (const name of names) {
      await touch(id, { current_collection: name });
      const { documents, bytes } = await archiveCollection(writer, db, name);
      documentsTotal += documents;
      await recordCollection(id, name, documents, bytes, documentsTotal);
    }

    await writer.finish();
    await DbBackupModel.updateOne(
      { _id: id },
      {
        $set: {
          status: 'SUCCEEDED',
          current_collection: null,
          size_bytes: (await backupSize(fileName)) ?? 0,
          raw_bytes: writer.rawBytes(),
          documents_total: documentsTotal,
          finished_at: new Date(),
          heartbeat_at: new Date(),
        },
      },
    ).exec();
  } catch (err) {
    // A half-written archive is worse than none: it looks restorable in the
    // table and is not, so the file goes with the failure.
    await writer.abort();
    await failBackup(id, err);
  }
}

function findBackup(id: string): Promise<DbBackupDoc | null> {
  return DbBackupModel.findById(id).lean<DbBackupDoc>().exec();
}

/** Flip an abandoned RUNNING row to FAILED so the UI stops waiting on it. */
async function repairIfStale(doc: DbBackupDoc): Promise<DbBackupDoc> {
  if (doc.status !== 'RUNNING') return doc;
  const beat = doc.heartbeat_at ?? doc.started_at;
  if (Date.now() - new Date(beat).getTime() <= HEARTBEAT_STALE_MS) return doc;
  const repaired = {
    status: 'FAILED' as const,
    error: INTERRUPTED_ERROR,
    current_collection: null,
    finished_at: new Date(),
  };
  await DbBackupModel.updateOne(
    { _id: doc._id },
    { $set: { ...repaired, file_name: null } },
  ).exec();
  // The archive it was part-way through is unusable; do not leave it on disk.
  if (doc.file_name) await deleteBackupFile(doc.file_name);
  return { ...doc, ...repaired, file_name: null };
}

/** True while any backup is still walking, so a second one cannot start. */
async function backupInFlight(): Promise<boolean> {
  const running = await DbBackupModel.find({ status: 'RUNNING' }).lean<DbBackupDoc[]>().exec();
  const repaired = await Promise.all(running.map(repairIfStale));
  return repaired.some((doc) => doc.status === 'RUNNING');
}

const SETTINGS_KEY = 'db-backup';

const DEFAULT_SETTINGS = {
  enabled: false,
  frequency: 'DAILY',
  time_of_day: '03:00',
  weekday: 0,
  keep_last: 7,
  last_run_at: null,
};

/** The settings singleton, created on first read. */
function settingsDoc(): Promise<DbBackupSettingsDoc> {
  return DbBackupSettingsModel.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: DEFAULT_SETTINGS },
    { new: true, upsert: true },
  )
    .lean<DbBackupSettingsDoc>()
    .exec() as Promise<DbBackupSettingsDoc>;
}

const scheduleOf = (doc: DbBackupSettingsDoc): BackupSchedule => ({
  enabled: doc.enabled,
  frequency: doc.frequency,
  time_of_day: doc.time_of_day,
  weekday: doc.weekday,
});

export interface SaveBackupSettingsInput {
  enabled: boolean;
  frequency: string;
  time_of_day: string;
  weekday: number;
  keep_last: number;
}

function toPublicSettings(doc: DbBackupSettingsDoc) {
  return {
    enabled: doc.enabled,
    frequency: doc.frequency,
    timeOfDay: doc.time_of_day,
    weekday: doc.weekday,
    keepLast: doc.keep_last,
    lastRunAt: iso(doc.last_run_at),
    nextRunAt: iso(nextRunAt(scheduleOf(doc), new Date())),
  };
}

/**
 * Drop the oldest SCHEDULED archives past the keep-last window.
 *
 * Only scheduled ones: a manual backup was taken by a person for a reason —
 * before a migration, before a risky deploy — and a nightly run must not sweep
 * it away. The ROW always survives; only the file goes, so the history of what
 * was backed up stays readable.
 */
async function prune(keepLast: number): Promise<number> {
  const stale = await DbBackupModel.find({
    trigger: 'SCHEDULED',
    status: 'SUCCEEDED',
    file_name: { $ne: null },
  })
    .sort({ started_at: -1 })
    .skip(keepLast)
    .lean<DbBackupDoc[]>()
    .exec();
  for (const doc of stale) {
    if (doc.file_name) await deleteBackupFile(doc.file_name);
    await DbBackupModel.updateOne({ _id: doc._id }, { $set: { file_name: null } }).exec();
  }
  return stale.length;
}

/**
 * Start a backup and return immediately — the walk continues server-side.
 * Refuses while another is running so two writers cannot fight over the disk.
 */
async function startBackup(
  trigger: 'SCHEDULED' | 'MANUAL',
  startedBy: string | null,
): Promise<PublicBackup> {
  if (await backupInFlight()) {
    throw badInput('A backup is already running — wait for it to finish.');
  }
  await ensureBackupsDir();
  const db = liveDb();
  const startedAt = new Date();
  const fileName = newBackupName(db.databaseName, startedAt);
  const doc = await DbBackupModel.create({
    status: 'RUNNING',
    trigger,
    database: db.databaseName,
    file_name: fileName,
    started_by: startedBy,
    started_at: startedAt,
  });
  const id = String(doc._id);
  runBackup(id, fileName, startedAt).catch((err) =>
    logs.server.error('dbBackup', 'start', { error: err, backupId: id }),
  );
  return toPublic(doc.toObject() as DbBackupDoc);
}

export const dbBackupService = {
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<DbBackupDoc>(
      DbBackupModel,
      {},
      input,
      DB_BACKUP_TABLE_CONFIG,
    );
    return { rows: docs.map(toPublic), total, page, page_size };
  },

  settings: async () => toPublicSettings(await settingsDoc()),

  async saveSettings(input: SaveBackupSettingsInput) {
    if (!parseTimeOfDay(input.time_of_day)) {
      throw badInput('Give the time as HH:mm, for example 03:00.');
    }
    await DbBackupSettingsModel.updateOne(
      { key: SETTINGS_KEY },
      { $set: { ...input }, $setOnInsert: { key: SETTINGS_KEY } },
      { upsert: true },
    ).exec();
    return toPublicSettings(await settingsDoc());
  },

  /** Start a backup for a signed-in operator. */
  runNow: (user: AuthUser) => startBackup('MANUAL', user.email ?? user.id),

  /**
   * Delete one archive. The row stays and simply loses its download — the
   * record of what was backed up and when is history, not a file pointer.
   */
  async remove(id: string): Promise<PublicBackup> {
    const doc = await findBackup(id);
    if (!doc) throw badInput('That backup no longer exists.');
    if (doc.status === 'RUNNING') throw badInput('That backup is still running.');
    if (doc.file_name) await deleteBackupFile(doc.file_name);
    await DbBackupModel.updateOne({ _id: id }, { $set: { file_name: null } }).exec();
    return toPublic({ ...doc, file_name: null });
  },

  /** A link that downloads one archive, good for the next few minutes. */
  async downloadToken(id: string): Promise<string> {
    const doc = await findBackup(id);
    if (!doc?.file_name) throw badInput('That backup has no archive to download.');
    return signDownloadToken(id);
  },

  /** What the download route resolves a token to: the row, or nothing. */
  fileFor: (id: string) => findBackup(id),

  /**
   * The scheduler's whole decision, kept here so the loop stays a timer.
   * Returns the started run, or null when nothing was owed.
   */
  async runIfDue(now: Date = new Date()): Promise<PublicBackup | null> {
    const doc = await settingsDoc();
    if (!isDue(scheduleOf(doc), doc.last_run_at, now)) return null;
    if (await backupInFlight()) return null;
    // Stamped BEFORE the walk, and whether or not it succeeds: a database that
    // cannot be read will not be readable a minute later either, and retrying
    // every tick would bury the one failure worth reading under a hundred more.
    await DbBackupSettingsModel.updateOne(
      { key: SETTINGS_KEY },
      { $set: { last_run_at: now } },
    ).exec();
    const started = await startBackup('SCHEDULED', null);
    await prune(doc.keep_last);
    return started;
  },
};
