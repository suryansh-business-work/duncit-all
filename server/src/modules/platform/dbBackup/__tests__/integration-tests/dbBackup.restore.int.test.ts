/**
 * dbRestoreService: the guards before a restore starts, the background walk
 * that drops and rewrites collections, the bookkeeping collections it never
 * touches, and the repair of a restore whose process died — against a real
 * database. The archive reader and the backup-walk check are mocked; the
 * collections a restore writes are real and dropped after each test.
 */
jest.mock('../../dbBackup.archive', () => ({ readArchive: jest.fn() }));
jest.mock('../../dbBackup.service', () => ({ liveDb: jest.fn(), walkInFlight: jest.fn() }));

import mongoose, { Types } from 'mongoose';
import { logs } from '@observability/log';
import type { AuthUser } from '@context';
import { readArchive, type ArchiveEntry } from '../../dbBackup.archive';
import { liveDb, walkInFlight } from '../../dbBackup.service';
import { DbBackupModel, DbBackupSettingsModel, DbRestoreModel } from '../../dbBackup.model';
import { dbRestoreService, type PublicRestore } from '../../dbBackup.restore';

const ITEMS = 'zz_restore_test_items';
const EMPTY = 'zz_restore_test_empty';
const user: AuthUser = { id: '64b0000000000000000000aa', email: 'ops@example.com', roles: ['TECH_MANAGER'] };

const db = () => mongoose.connection.db as NonNullable<typeof mongoose.connection.db>;

/** readArchive yields these entries, optionally failing after them. */
function archiveOf(entries: ArchiveEntry[], failWith?: unknown) {
  (readArchive as jest.Mock).mockImplementation(async function* () {
    for (const entry of entries) yield entry;
    if (failWith !== undefined) throw failWith;
  });
}

const collection = (name: string, indexes: Array<Record<string, unknown>> = []): ArchiveEntry =>
  ({ kind: 'collection', name, indexes }) as ArchiveEntry;
const docEntry = (doc: Record<string, unknown>): ArchiveEntry => ({ kind: 'document', doc });

const createBackup = (overrides: Record<string, unknown> = {}) =>
  DbBackupModel.create({ status: 'SUCCEEDED', file_name: 'duncit-2026-09-01.dbk.gz', ...overrides });

/** Poll the row until the background walk has finished with it. */
async function settled(id: string): Promise<PublicRestore> {
  for (let i = 0; i < 400; i += 1) {
    const job = await dbRestoreService.restoreJob(id);
    if (job && job.status !== 'RUNNING') return job;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('restore never finished');
}

const dropTestCollections = async () => {
  for (const name of [ITEMS, EMPTY]) {
    const found = await db().listCollections({ name }, { nameOnly: true }).toArray();
    if (found.length > 0) await db().collection(name).drop();
  }
};

beforeEach(async () => {
  (liveDb as jest.Mock).mockImplementation(() => db());
  (walkInFlight as jest.Mock).mockResolvedValue(false);
  jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined);
  jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
  await dropTestCollections();
});

afterEach(async () => {
  jest.restoreAllMocks();
  await dropTestCollections();
});

describe('skippedCollections', () => {
  it('names the three bookkeeping collections and hands out a copy', () => {
    const skipped = dbRestoreService.skippedCollections();
    expect(skipped).toEqual([
      DbBackupModel.collection.collectionName,
      DbBackupSettingsModel.collection.collectionName,
      DbRestoreModel.collection.collectionName,
    ]);
    skipped.pop();
    expect(dbRestoreService.skippedCollections()).toHaveLength(3);
  });
});

describe('start — guards', () => {
  it('refuses a backup that no longer exists', async () => {
    await expect(dbRestoreService.start(new Types.ObjectId().toHexString(), user)).rejects.toMatchObject({
      message: 'That backup no longer exists.',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('refuses a backup whose archive is gone', async () => {
    const backup = await createBackup({ file_name: null });
    await expect(dbRestoreService.start(String(backup._id), user)).rejects.toMatchObject({
      message: 'That backup has no archive left to restore from.',
    });
  });

  it.each(['RUNNING', 'FAILED'])('refuses a %s backup', async (status) => {
    const backup = await createBackup({ status });
    await expect(dbRestoreService.start(String(backup._id), user)).rejects.toMatchObject({
      message: 'Only a finished backup can be restored.',
    });
  });

  it('refuses an archive name that escapes the backups directory', async () => {
    const backup = await createBackup({ file_name: '../../etc/passwd' });
    await expect(dbRestoreService.start(String(backup._id), user)).rejects.toMatchObject({
      message: 'That backup archive is not in the backups directory.',
    });
  });

  it('refuses while another restore is running', async () => {
    const backup = await createBackup();
    await DbRestoreModel.create({ status: 'RUNNING', backup_id: backup._id, backup_file: 'a.dbk.gz', heartbeat_at: new Date() });
    await expect(dbRestoreService.start(String(backup._id), user)).rejects.toMatchObject({
      message: 'A restore is already running.',
    });
    expect(readArchive).not.toHaveBeenCalled();
  });

  it('refuses while a backup is running', async () => {
    (walkInFlight as jest.Mock).mockResolvedValue(true);
    const backup = await createBackup();
    await expect(dbRestoreService.start(String(backup._id), user)).rejects.toMatchObject({
      message: 'A backup is running — wait for it to finish.',
    });
    expect(await DbRestoreModel.countDocuments()).toBe(0);
  });

  it('repairs an abandoned restore on the way past instead of letting it block', async () => {
    const backup = await createBackup();
    const stale = await DbRestoreModel.create({
      status: 'RUNNING',
      backup_id: backup._id,
      backup_file: 'a.dbk.gz',
      heartbeat_at: new Date(Date.now() - 121_000),
    });
    archiveOf([]);

    const job = await dbRestoreService.start(String(backup._id), user);
    await settled(job.id);

    const repaired = await DbRestoreModel.findById(stale._id).lean();
    expect(repaired).toMatchObject({ status: 'FAILED', current_collection: null });
    expect(repaired?.error).toMatch(/^The server restarted while this restore was running/);
  });
});

describe('start — the walk', () => {
  it('drops and rewrites each archived collection, skips the bookkeeping ones and reports what landed', async () => {
    await db().collection(ITEMS).insertOne({ code: 'stale-row' });
    const backup = await createBackup({ archive_taken_at: new Date('2026-08-01T00:00:00Z') });
    const items = Array.from({ length: 501 }, (_, i) => docEntry({ code: `item-${i}` }));
    archiveOf([
      { kind: 'header', header: { version: 1, database: 'duncit', created_at: new Date('2026-08-01T00:00:00Z') } },
      collection(ITEMS, [{ key: { code: 1 }, name: 'code_1', unique: true }]),
      ...items,
      collection(DbBackupModel.collection.collectionName),
      docEntry({ status: 'SUCCEEDED', file_name: 'from-the-archive.dbk.gz' }),
      collection(EMPTY),
    ]);

    const job = await dbRestoreService.start(String(backup._id), user);
    expect(job).toMatchObject({
      status: 'RUNNING',
      backupId: String(backup._id),
      backupFile: 'duncit-2026-09-01.dbk.gz',
      backupTakenAt: '2026-08-01T00:00:00.000Z',
      startedBy: 'ops@example.com',
      skipped: dbRestoreService.skippedCollections(),
      collections: [],
      collectionsTotal: 0,
      documentsRestored: 0,
    });
    expect(logs.server.warn).toHaveBeenCalledWith('dbBackup', 'startRestore', {
      userId: user.id,
      backupId: String(backup._id),
      file: 'duncit-2026-09-01.dbk.gz',
    });

    const done = await settled(job.id);
    expect(done).toMatchObject({
      status: 'SUCCEEDED',
      currentCollection: null,
      documentsRestored: 501,
      error: null,
      collections: [
        { name: ITEMS, documents: 501, error: null },
        { name: EMPTY, documents: 0, error: null },
      ],
      collectionsTotal: 2,
    });
    expect(done.finishedAt).not.toBeNull();

    expect(await db().collection(ITEMS).countDocuments()).toBe(501);
    expect(await db().collection(ITEMS).findOne({ code: 'stale-row' })).toBeNull();
    const indexNames = (await db().collection(ITEMS).indexes()).map((ix) => ix.name);
    expect(indexNames).toContain('code_1');
    // The bookkeeping collection kept its live row and never received the archived one.
    expect(await DbBackupModel.countDocuments()).toBe(1);
    expect(await DbBackupModel.exists({ file_name: 'from-the-archive.dbk.gz' })).toBeNull();
  });

  it('credits the user id and dates the data from the backup start when no archive date is known', async () => {
    const started = new Date('2026-09-01T03:00:00Z');
    const backup = await createBackup({ started_at: started, archive_taken_at: null });
    archiveOf([]);
    const job = await dbRestoreService.start(String(backup._id), { id: 'u-9', roles: ['SUPER_ADMIN'] });
    expect(job.startedBy).toBe('u-9');
    expect(job.backupTakenAt).toBe(started.toISOString());
    await expect(settled(job.id)).resolves.toMatchObject({ status: 'SUCCEEDED', documentsRestored: 0, collections: [] });
  });

  it('marks the restore FAILED with the reason when the archive breaks mid-walk', async () => {
    const backup = await createBackup();
    archiveOf([collection(ITEMS), docEntry({ code: 'a' }), docEntry({ code: 'b' })], new Error('Archive frame is truncated'));

    const job = await dbRestoreService.start(String(backup._id), user);
    const done = await settled(job.id);
    expect(done).toMatchObject({ status: 'FAILED', error: 'Archive frame is truncated', currentCollection: null });
    expect(done.finishedAt).not.toBeNull();
    expect(logs.server.error).toHaveBeenCalledWith('dbBackup', 'runRestore', expect.objectContaining({ restoreId: job.id }));
  });

  it('records a generic reason when the failure is not an Error', async () => {
    const backup = await createBackup();
    archiveOf([], 'disk gone');
    const job = await dbRestoreService.start(String(backup._id), user);
    await expect(settled(job.id)).resolves.toMatchObject({ status: 'FAILED', error: 'Restore failed' });
  });

  it('fails the walk when a document breaks a unique index the archive declared', async () => {
    const backup = await createBackup();
    archiveOf([
      collection(ITEMS, [{ key: { code: 1 }, name: 'code_1', unique: true }]),
      docEntry({ code: 'same' }),
      docEntry({ code: 'same' }),
    ]);
    const job = await dbRestoreService.start(String(backup._id), user);
    const done = await settled(job.id);
    expect(done.status).toBe('FAILED');
    expect(done.error).toMatch(/duplicate key/i);
  });

  it('logs a walk that could not even reach the database', async () => {
    (liveDb as jest.Mock).mockImplementation(() => {
      throw new Error('The server is not connected to a database.');
    });
    const backup = await createBackup();
    const job = await dbRestoreService.start(String(backup._id), user);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(logs.server.error).toHaveBeenCalledWith('dbBackup', 'startRestore', expect.objectContaining({ restoreId: job.id }));
    expect(readArchive).not.toHaveBeenCalled();
  });
});

describe('restoreJob', () => {
  it('is null when there is no restore to show', async () => {
    await expect(dbRestoreService.restoreJob()).resolves.toBeNull();
    await expect(dbRestoreService.restoreJob(new Types.ObjectId().toHexString())).resolves.toBeNull();
  });

  it('reads the most recent restore when no id is given', async () => {
    const backupId = new Types.ObjectId();
    await DbRestoreModel.create({ status: 'SUCCEEDED', backup_id: backupId, backup_file: 'old.dbk.gz', started_at: new Date('2026-08-01T00:00:00Z') });
    await DbRestoreModel.create({ status: 'FAILED', backup_id: backupId, backup_file: 'new.dbk.gz', started_at: new Date('2026-09-01T00:00:00Z') });
    await expect(dbRestoreService.restoreJob()).resolves.toMatchObject({ backupFile: 'new.dbk.gz', status: 'FAILED' });
    await expect(dbRestoreService.restoreJob(null)).resolves.toMatchObject({ backupFile: 'new.dbk.gz' });
  });

  it('shapes every field, keeping a collection error', async () => {
    const backupId = new Types.ObjectId();
    const doc = await DbRestoreModel.create({
      status: 'FAILED',
      backup_id: backupId,
      backup_file: 'a.dbk.gz',
      backup_taken_at: new Date('2026-08-01T00:00:00Z'),
      collections: [{ name: 'pods', documents: 3, error: 'E11000' }, { name: 'users', documents: 2 }],
      documents_restored: 5,
      skipped: ['dbbackups'],
      error: 'boom',
      started_by: 'ops@example.com',
      started_at: new Date('2026-09-01T00:00:00Z'),
      finished_at: new Date('2026-09-01T00:05:00Z'),
    });
    await expect(dbRestoreService.restoreJob(String(doc._id))).resolves.toEqual({
      id: String(doc._id),
      status: 'FAILED',
      backupId: String(backupId),
      backupFile: 'a.dbk.gz',
      backupTakenAt: '2026-08-01T00:00:00.000Z',
      collections: [
        { name: 'pods', documents: 3, error: 'E11000' },
        { name: 'users', documents: 2, error: null },
      ],
      collectionsTotal: 2,
      currentCollection: null,
      documentsRestored: 5,
      skipped: ['dbbackups'],
      error: 'boom',
      startedBy: 'ops@example.com',
      startedAt: '2026-09-01T00:00:00.000Z',
      finishedAt: '2026-09-01T00:05:00.000Z',
    });
  });

  it('defaults every field a bare row lacks', async () => {
    const _id = new Types.ObjectId();
    const backupId = new Types.ObjectId();
    await DbRestoreModel.collection.insertOne({ _id, status: 'SUCCEEDED', backup_id: backupId, backup_file: 'b.dbk.gz' });
    await expect(dbRestoreService.restoreJob(String(_id))).resolves.toEqual({
      id: String(_id),
      status: 'SUCCEEDED',
      backupId: String(backupId),
      backupFile: 'b.dbk.gz',
      backupTakenAt: null,
      collections: [],
      collectionsTotal: 0,
      currentCollection: null,
      documentsRestored: 0,
      skipped: [],
      error: null,
      startedBy: null,
      startedAt: null,
      finishedAt: null,
    });
  });

  it('leaves a running restore with a fresh heartbeat alone', async () => {
    const doc = await DbRestoreModel.create({ status: 'RUNNING', backup_id: new Types.ObjectId(), backup_file: 'a.dbk.gz', current_collection: 'pods', heartbeat_at: new Date() });
    await expect(dbRestoreService.restoreJob(String(doc._id))).resolves.toMatchObject({ status: 'RUNNING', currentCollection: 'pods' });
  });

  it('flips a restore whose heartbeat went stale to FAILED, falling back to its start time', async () => {
    const doc = await DbRestoreModel.create({
      status: 'RUNNING',
      backup_id: new Types.ObjectId(),
      backup_file: 'a.dbk.gz',
      current_collection: 'pods',
      started_at: new Date(Date.now() - 10 * 60_000),
      heartbeat_at: null,
    });
    const job = await dbRestoreService.restoreJob(String(doc._id));
    expect(job).toMatchObject({ status: 'FAILED', currentCollection: null });
    expect(job?.error).toMatch(/^The server restarted while this restore was running/);
    expect(job?.finishedAt).not.toBeNull();
    expect((await DbRestoreModel.findById(doc._id).lean())?.status).toBe('FAILED');
  });
});
