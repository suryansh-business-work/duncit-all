/**
 * Bringing an archive IN — the mirror of the signed download next door.
 *
 * A backup is only worth anything where it can be restored, and the archive
 * that matters is usually not on the server that needs it: production's nightly
 * sitting on a laptop, a copy pulled before a migration, an archive from the
 * environment being reproduced. Downloading one has always worked; this is the
 * way back.
 *
 * Three steps, the same shape a CI artifact takes and for the same reason: a
 * browser cannot put its session header on a raw file POST. So an authenticated
 * mutation claims a name and hands out a single-use pass, the bytes go to
 * /upload, and a second mutation turns what landed into a backup.
 *
 * The read-through is the part that is NOT optional. A restore DROPS each
 * collection before it rewrites it, so an archive that dies half way through
 * leaves the database half replaced with nothing to undo it. A file that
 * arrived over HTTP from someone's machine has never been read by this server —
 * reading it end to end before it can be restored is the whole difference
 * between a backup and a file somebody dragged in. Until that read finishes the
 * row stays RUNNING, and restoreDbBackup only accepts a SUCCEEDED one.
 */
import { GraphQLError } from 'graphql';
import { mongo } from 'mongoose';
import { getUrlConfigs } from '@config/url-configs';
import { logs } from '@observability/log';
import type { AuthUser } from '@context';
import { UPLOAD_MAX_BYTES } from '@modules/platform/upload/uploadLimits';
import { issueUploadTicket } from '@modules/platform/upload/uploadTicket';
import { ARCHIVE_VERSION, readArchive, type ArchiveHeader } from './dbBackup.archive';
import { DbBackupModel, type DbBackupDoc } from './dbBackup.model';
import { sweepRunningBackups, toPublicBackup, type PublicBackup } from './dbBackup.service';
import {
  BACKUP_EXTENSION,
  backupPath,
  backupSize,
  deleteBackupFile,
  ensureBackupsDir,
  newUploadName,
} from './dbBackup.store';

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

/**
 * Recorded on the pass for the log rather than used as a path: this store
 * writes one named file, so it is the ticket's destination that decides where
 * the bytes land.
 */
const TICKET_FOLDER = '/db-backups';

/**
 * How often the read-through says it is still alive.
 *
 * A collection boundary is the natural place to report progress, but an archive
 * can hold one collection with four million rows in it — and a row that has not
 * ticked for two minutes is treated as an abandoned process and swept. Without
 * this, the sweep would delete the archive out from under the reader.
 */
const HEARTBEAT_EVERY_DOCS = 20_000;

interface CollectionTally {
  name: string;
  documents: number;
  bytes: number;
}

const touch = (id: string, fields: Record<string, unknown> = {}): Promise<unknown> =>
  DbBackupModel.updateOne({ _id: id }, { $set: { heartbeat_at: new Date(), ...fields } }).exec();

/**
 * Fail the row AND remove the file.
 *
 * Unlike a failed backup — where there is nothing to keep — an unreadable
 * upload is a real file sitting in the backups directory, and the one thing
 * nobody must be able to do with it is restore from it. It goes.
 */
async function failUpload(id: string, fileName: string | null, err: unknown): Promise<void> {
  logs.server.error('dbBackup', 'verifyUpload', { error: err, backupId: id });
  if (fileName) await deleteBackupFile(fileName);
  await DbBackupModel.updateOne(
    { _id: id },
    {
      $set: {
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'That archive could not be read.',
        file_name: null,
        current_collection: null,
        finished_at: new Date(),
        heartbeat_at: new Date(),
      },
    },
  ).exec();
}

/** What a readable archive has to have. Anything else is not restorable. */
function assertReadable(
  header: ArchiveHeader | null,
  collections: CollectionTally[],
): asserts header is ArchiveHeader {
  if (!header) {
    throw new Error('This is not a Duncit backup archive: it carries no header.');
  }
  if (header.version > ARCHIVE_VERSION) {
    throw new Error(
      `This archive was written by a newer version of Duncit (format ${header.version}); this server reads up to ${ARCHIVE_VERSION}.`,
    );
  }
  if (collections.length === 0) {
    throw new Error('This archive holds no collections, so there is nothing to restore from it.');
  }
}

/**
 * Read the whole archive, counting what is in it. Never rejects — every failure
 * lands on the row, exactly like the backup walk it mirrors.
 *
 * The counts are not decoration: they are what the restore dialog shows before
 * an operator replaces a database with this file, and gathering them is free
 * once every frame has to be decoded anyway.
 */
async function runVerify(id: string, fileName: string): Promise<void> {
  const target = backupPath(fileName);
  if (!target) {
    await failUpload(id, fileName, new Error('That archive is not in the backups directory.'));
    return;
  }
  const collections: CollectionTally[] = [];
  let header: ArchiveHeader | null = null;
  let current: CollectionTally | null = null;
  let documents = 0;
  try {
    for await (const entry of readArchive(target)) {
      if (entry.kind === 'header') {
        header = entry.header;
      } else if (entry.kind === 'collection') {
        current = { name: entry.name, documents: 0, bytes: 0 };
        collections.push(current);
        await touch(id, { current_collection: entry.name });
      } else {
        if (!current) throw new Error('This archive has a document before any collection.');
        current.documents += 1;
        current.bytes += mongo.BSON.calculateObjectSize(entry.doc);
        documents += 1;
        if (documents % HEARTBEAT_EVERY_DOCS === 0) await touch(id);
      }
    }
    assertReadable(header, collections);
    await DbBackupModel.updateOne(
      { _id: id },
      {
        $set: {
          status: 'SUCCEEDED',
          // The archive's OWN name for its database, not this server's. An
          // archive from somewhere else is the ordinary case here, and the
          // restore dialog has to be able to say so.
          database: header.database,
          archive_taken_at: header.created_at,
          size_bytes: (await backupSize(fileName)) ?? 0,
          raw_bytes: collections.reduce((sum, entry) => sum + entry.bytes, 0),
          documents_total: documents,
          collections,
          current_collection: null,
          finished_at: new Date(),
          heartbeat_at: new Date(),
        },
      },
    ).exec();
  } catch (err) {
    await failUpload(id, fileName, err);
  }
}

export interface BackupUploadPass {
  uploadUrl: string;
  ticket: string;
  backupId: string;
}

export const dbBackupUploadService = {
  /** The ceiling one upload can be, so the picker can refuse before it starts. */
  maxBytes: () => UPLOAD_MAX_BYTES,

  /**
   * Claim a name, open the row, and hand back a single-use pass for /upload.
   *
   * The row exists BEFORE the bytes do, on purpose: an upload abandoned part
   * way through leaves a real file in the backups directory, and a row pointing
   * at it is what lets the stale sweep clear both. Without one the file would be
   * invisible and permanent.
   */
  async auth(user: AuthUser, fileName: string): Promise<BackupUploadPass> {
    const picked = fileName.trim();
    if (!picked.toLowerCase().endsWith(BACKUP_EXTENSION)) {
      throw badInput(
        `Choose a ${BACKUP_EXTENSION} file — that is what this server writes its backups as.`,
      );
    }
    // An operator retrying is the likeliest next event after a failed upload, so
    // this is the natural moment to clear one that was abandoned.
    await sweepRunningBackups();
    await ensureBackupsDir();
    const destination = newUploadName(picked, new Date());
    const doc = await DbBackupModel.create({
      status: 'RUNNING',
      trigger: 'UPLOADED',
      file_name: destination,
      started_by: user.email ?? user.id,
    });
    const { serverUrl } = await getUrlConfigs();
    return {
      uploadUrl: `${serverUrl.replace(/\/$/, '')}/upload`,
      ticket: issueUploadTicket(user.id, TICKET_FOLDER, 'db-backups', '', destination),
      backupId: String(doc._id),
    };
  },

  /**
   * The upload landed: start reading it. Returns at once, like every other walk
   * on this page — a multi-gigabyte archive takes minutes to read and the
   * browser must not have to stay open for it.
   */
  async complete(id: string): Promise<PublicBackup> {
    const doc = await DbBackupModel.findById(id).lean<DbBackupDoc>().exec();
    if (!doc || doc.trigger !== 'UPLOADED') throw badInput('That upload no longer exists.');
    if (doc.status !== 'RUNNING') throw badInput('That archive has already been checked.');
    const fileName = doc.file_name ?? null;
    const size = fileName ? await backupSize(fileName) : null;
    if (!fileName || !size) {
      await failUpload(id, fileName, new Error('No archive arrived — the upload did not finish.'));
      throw badInput('No archive arrived. Start the upload again.');
    }
    runVerify(id, fileName).catch((err) =>
      logs.server.error('dbBackup', 'completeUpload', { error: err, backupId: id }),
    );
    return toPublicBackup({ ...doc, size_bytes: size });
  },
};
