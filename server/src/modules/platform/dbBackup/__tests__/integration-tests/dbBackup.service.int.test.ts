/**
 * dbBackupService against a real database and a real directory: the backup
 * walk writes a real archive, the table repairs rows whose process died, the
 * schedule decides what is owed, and retention only ever prunes scheduled
 * archives. Only the archive writer's failure path and the path guard are
 * forced; everything else runs for real.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BACKUPS = fs.mkdtempSync(path.join(os.tmpdir(), 'db-backups-'));
process.env.DB_BACKUPS_DIR = BACKUPS;

import mongoose from 'mongoose';
import { logs } from '@observability/log';
import * as archive from '../../dbBackup.archive';
import * as store from '../../dbBackup.store';
import { DbBackupModel, DbBackupSettingsModel } from '../../dbBackup.model';
import { dbBackupService, sweepRunningBackups, toPublicBackup, walkInFlight } from '../../dbBackup.service';
import { verifyDownloadToken } from '../../dbBackup.token';

const user = { id: '64b0000000000000000000aa', email: 'ops@example.com', roles: ['TECH_MANAGER'] } as never;
const MIN = 60_000;

const files = () => fs.readdirSync(BACKUPS);
const clearDir = () => files().forEach((f) => fs.rmSync(path.join(BACKUPS, f), { force: true }));
const row = (over: Record<string, unknown> = {}) =>
  DbBackupModel.create({ status: 'SUCCEEDED', trigger: 'MANUAL', file_name: null, ...over });

async function finished(id: string) {
  for (let i = 0; i < 500; i += 1) {
    const doc = await DbBackupModel.findById(id).lean();
    if (doc && doc.status !== 'RUNNING') return doc;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('backup never finished');
}

beforeEach(() => {
  jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
  jest.spyOn(logs.server, 'info').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
  clearDir();
});
afterAll(() => fs.rmSync(BACKUPS, { recursive: true, force: true }));

describe('toPublicBackup', () => {
  it('shapes a finished row and defaults everything a lean row may lack', () => {
    const when = new Date('2026-02-03T04:05:06Z');
    expect(
      toPublicBackup({
        _id: 'b1', status: 'SUCCEEDED', trigger: 'MANUAL', database: 'duncit', file_name: 'a.dbk.gz', size_bytes: 10, raw_bytes: 30, documents_total: 4,
        collections: [{ name: 'users', documents: 4, bytes: 30 }], current_collection: 'users', error: 'e', started_by: 'ops', started_at: when,
        archive_taken_at: when, finished_at: when,
      } as never)
    ).toEqual({
      id: 'b1', status: 'SUCCEEDED', trigger: 'MANUAL', database: 'duncit', fileName: 'a.dbk.gz', hasFile: true, sizeBytes: 10, rawBytes: 30,
      documentsTotal: 4, collectionsTotal: 1, collections: [{ name: 'users', documents: 4, bytes: 30 }], currentCollection: 'users', error: 'e',
      startedBy: 'ops', startedAt: when.toISOString(), archiveTakenAt: when.toISOString(), finishedAt: when.toISOString(),
    });
    expect(toPublicBackup({ _id: 'b2', status: 'RUNNING', trigger: 'MANUAL', database: 'd' } as never)).toEqual({
      id: 'b2', status: 'RUNNING', trigger: 'MANUAL', database: 'd', fileName: null, hasFile: false, sizeBytes: 0, rawBytes: 0, documentsTotal: 0,
      collectionsTotal: 0, collections: [], currentCollection: null, error: null, startedBy: null, startedAt: null, archiveTakenAt: null, finishedAt: null,
    });
  });
});

describe('running a backup', () => {
  it('walks the live database into a real archive and records every collection', async () => {
    await mongoose.connection.collection('zz_backup_items').insertMany([{ a: 1 }, { a: 2 }]);
    await mongoose.connection.collection('zz_backup_items').createIndex({ a: 1 }, { name: 'a_1' });
    const started = await dbBackupService.runNow(user);
    expect(started).toMatchObject({ status: 'RUNNING', trigger: 'MANUAL', startedBy: 'ops@example.com', hasFile: true });
    const done = await finished(started.id);
    expect(done.status).toBe('SUCCEEDED');
    expect(done.file_name).toBeTruthy();
    expect(files()).toEqual([done.file_name]);
    expect(done.size_bytes).toBeGreaterThan(0);
    expect(done.raw_bytes).toBeGreaterThan(0);
    const items = done.collections.find((c) => c.name === 'zz_backup_items');
    expect(items).toMatchObject({ documents: 2 });
    expect(done.documents_total).toBeGreaterThanOrEqual(2);
    expect(done.current_collection).toBeNull();
    const entries: string[] = [];
    for await (const entry of archive.readArchive(path.join(BACKUPS, done.file_name as string))) entries.push(entry.kind);
    expect(entries[0]).toBe('header');
    expect(entries).toContain('document');
    await mongoose.connection.collection('zz_backup_items').drop();
  });

  it('records the user id when the operator has no email', async () => {
    const started = await dbBackupService.runNow({ id: 'u-9', roles: [] } as never);
    expect(started.startedBy).toBe('u-9');
    await finished(started.id);
  });

  it('refuses to start while another walk is running', async () => {
    await row({ status: 'RUNNING', heartbeat_at: new Date() });
    await expect(dbBackupService.runNow(user)).rejects.toMatchObject({
      message: 'A backup is already running — wait for it to finish.',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('is not blocked by an upload being read', async () => {
    await row({ status: 'RUNNING', trigger: 'UPLOADED', heartbeat_at: new Date() });
    const started = await dbBackupService.runNow(user);
    await finished(started.id);
  });

  it('marks the run failed and removes the half-written archive when the writer breaks', async () => {
    const abort = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(archive, 'createArchiveWriter').mockReturnValue({
      startCollection: jest.fn().mockRejectedValue(new Error('disk full')),
      writeDocument: jest.fn(),
      finish: jest.fn(),
      abort,
      rawBytes: () => 0,
    } as never);
    const started = await dbBackupService.runNow(user);
    const done = await finished(started.id);
    expect(done).toMatchObject({ status: 'FAILED', error: 'disk full', file_name: null, current_collection: null });
    expect(abort).toHaveBeenCalledTimes(1);
    expect(logs.server.error).toHaveBeenCalledWith('dbBackup', 'runBackup', expect.objectContaining({ backupId: started.id }));
  });

  it('gives a generic reason when the failure is not an Error', async () => {
    jest.spyOn(archive, 'createArchiveWriter').mockReturnValue({
      startCollection: jest.fn().mockRejectedValue('weird'), writeDocument: jest.fn(), finish: jest.fn(), abort: jest.fn().mockResolvedValue(undefined), rawBytes: () => 0,
    } as never);
    const started = await dbBackupService.runNow(user);
    expect((await finished(started.id)).error).toBe('Backup failed');
  });

  it('fails a database with nothing in it, saying so', async () => {
    const db = mongoose.connection.db as NonNullable<typeof mongoose.connection.db>;
    jest.spyOn(db, 'listCollections').mockReturnValue({ toArray: async () => [] } as never);
    const started = await dbBackupService.runNow(user);
    const done = await finished(started.id);
    expect(done.status).toBe('FAILED');
    expect(done.error).toMatch(/^Nothing to back up: .* is empty\.$/);
  });

  it('skips Mongo’s own system collections', async () => {
    const db = mongoose.connection.db as NonNullable<typeof mongoose.connection.db>;
    await db.collection('zz_a').insertOne({ x: 1 });
    await db.collection('zz_b').insertOne({ x: 1 });
    jest.spyOn(db, 'listCollections').mockReturnValue({ toArray: async () => [{ name: 'system.views' }, { name: 'zz_b' }, { name: 'zz_a' }] } as never);
    const started = await dbBackupService.runNow(user);
    const done = await finished(started.id);
    expect(done.collections.map((c) => c.name)).toEqual(['zz_a', 'zz_b']);
    await db.collection('zz_a').drop();
    await db.collection('zz_b').drop();
  });

  it('logs a run whose own failure bookkeeping breaks, instead of rejecting the request', async () => {
    jest.spyOn(DbBackupModel, 'updateOne').mockReturnValue({ exec: () => Promise.reject(new Error('mongo down')) } as never);
    const started = await dbBackupService.runNow(user);
    for (let i = 0; i < 200 && !(logs.server.error as jest.Mock).mock.calls.some((c) => c[1] === 'start'); i += 1) await new Promise((r) => setTimeout(r, 10));
    expect(logs.server.error).toHaveBeenCalledWith('dbBackup', 'start', { error: expect.any(Error), backupId: started.id });
    jest.restoreAllMocks();
    await DbBackupModel.deleteMany({});
  });

  it('records a zero size when the finished archive cannot be sized', async () => {
    jest.spyOn(store, 'backupSize').mockResolvedValue(null);
    const started = await dbBackupService.runNow(user);
    expect((await finished(started.id)).size_bytes).toBe(0);
  });

  it('refuses to write outside the backups directory', async () => {
    jest.spyOn(store, 'backupPath').mockReturnValue(null);
    const started = await dbBackupService.runNow(user);
    const done = await finished(started.id);
    expect(done).toMatchObject({ status: 'FAILED' });
    expect(done.error).toContain('Refusing to write outside the backups directory');
  });
});

describe('repairing rows whose process died', () => {
  const old = () => new Date(Date.now() - 5 * MIN);

  it('fails an abandoned run and removes the file it was part-way through', async () => {
    fs.writeFileSync(path.join(BACKUPS, 'half.dbk.gz'), 'partial');
    const stale = await row({ status: 'RUNNING', file_name: 'half.dbk.gz', heartbeat_at: old(), started_at: old() });
    const fresh = await row({ status: 'RUNNING', file_name: null, heartbeat_at: new Date() });
    const left = await sweepRunningBackups();
    expect(left.map((d) => [String(d._id), d.status])).toEqual(expect.arrayContaining([[String(stale._id), 'FAILED'], [String(fresh._id), 'RUNNING']]));
    expect(files()).toEqual([]);
    const stored = await DbBackupModel.findById(stale._id).lean();
    expect(stored).toMatchObject({ status: 'FAILED', file_name: null });
    expect(stored?.error).toContain('The server restarted while this backup was running');
  });

  it('repairs a run with no heartbeat by when it started, and one with no file', async () => {
    const stale = await row({ status: 'RUNNING', started_at: old() });
    await DbBackupModel.collection.updateOne({ _id: stale._id }, { $unset: { heartbeat_at: 1 } });
    const [repaired] = await sweepRunningBackups();
    expect(repaired.status).toBe('FAILED');
    expect(repaired.file_name).toBeNull();
  });

  it('counts a walk in flight, but not an abandoned one or an upload', async () => {
    await expect(walkInFlight()).resolves.toBe(false);
    await row({ status: 'RUNNING', trigger: 'UPLOADED', heartbeat_at: new Date() });
    await row({ status: 'RUNNING', heartbeat_at: old(), started_at: old() });
    await expect(walkInFlight()).resolves.toBe(false);
    await row({ status: 'RUNNING', heartbeat_at: new Date() });
    await expect(walkInFlight()).resolves.toBe(true);
  });
});

describe('table', () => {
  it('lists rows newest first with the repair applied on the way out', async () => {
    const stale = await row({ status: 'RUNNING', heartbeat_at: new Date(Date.now() - 10 * MIN), started_at: new Date('2026-01-01T00:00:00Z') });
    await row({ started_at: new Date('2026-02-01T00:00:00Z'), database: 'duncit' });
    const page = await dbBackupService.table({ page: 1, page_size: 10 } as never);
    expect(page.total).toBe(2);
    expect(page.rows.map((r) => r.status)).toEqual(['SUCCEEDED', 'FAILED']);
    expect(page.rows[1].id).toBe(String(stale._id));
    expect((await dbBackupService.table()).total).toBe(2);
  });
});

describe('settings: no database connection', () => {
  it('refuses to describe a server that is not connected to a database', async () => {
    const live = mongoose.connection.db;
    Object.assign(mongoose.connection, { db: undefined });
    try {
      await expect(dbBackupService.settings()).rejects.toMatchObject({ message: 'The server is not connected to a database.', extensions: { code: 'BAD_USER_INPUT' } });
    } finally {
      Object.assign(mongoose.connection, { db: live });
    }
  });
});

describe('settings', () => {
  it('creates the defaults on first read, reporting the live database and the upload ceiling', async () => {
    const settings = await dbBackupService.settings();
    expect(settings).toMatchObject({ enabled: false, frequency: 'DAILY', timeOfDay: '03:00', weekday: 0, keepLast: 7, lastRunAt: null, nextRunAt: null });
    expect(settings.liveDatabase).toBe(mongoose.connection.db?.databaseName);
    expect(settings.uploadMaxBytes).toBeGreaterThan(0);
  });

  it('saves a schedule and says when the next run is', async () => {
    const saved = await dbBackupService.saveSettings({ enabled: true, frequency: 'WEEKLY', time_of_day: '04:30', weekday: 2, keep_last: 3 });
    expect(saved).toMatchObject({ enabled: true, frequency: 'WEEKLY', timeOfDay: '04:30', weekday: 2, keepLast: 3 });
    expect(saved.nextRunAt).toEqual(expect.any(String));
    expect(await DbBackupSettingsModel.countDocuments()).toBe(1);
  });

  it('refuses a time that is not HH:mm', async () => {
    await expect(dbBackupService.saveSettings({ enabled: true, frequency: 'DAILY', time_of_day: '25:00', weekday: 0, keep_last: 7 })).rejects.toMatchObject({
      message: 'Give the time as HH:mm, for example 03:00.',
    });
  });
});

describe('removing and downloading', () => {
  it('deletes the archive but keeps the row as history', async () => {
    fs.writeFileSync(path.join(BACKUPS, 'x.dbk.gz'), 'data');
    const doc = await row({ file_name: 'x.dbk.gz' });
    const out = await dbBackupService.remove(String(doc._id));
    expect(out).toMatchObject({ hasFile: false, fileName: null });
    expect(files()).toEqual([]);
    expect(await DbBackupModel.countDocuments()).toBe(1);
  });

  it('removes a row whose file is already gone', async () => {
    const doc = await row({ file_name: null });
    await expect(dbBackupService.remove(String(doc._id))).resolves.toMatchObject({ hasFile: false });
  });

  it('refuses a missing backup and one that is still running', async () => {
    await expect(dbBackupService.remove(String(new mongoose.Types.ObjectId()))).rejects.toMatchObject({ message: 'That backup no longer exists.' });
    const running = await row({ status: 'RUNNING' });
    await expect(dbBackupService.remove(String(running._id))).rejects.toMatchObject({ message: 'That backup is still running.' });
  });

  it('mints a short-lived download token for a backup that has its file, and refuses one that does not', async () => {
    const doc = await row({ file_name: 'x.dbk.gz' });
    const token = await dbBackupService.downloadToken(String(doc._id));
    expect(verifyDownloadToken(token)).toBe(String(doc._id));
    const bare = await row({ file_name: null });
    await expect(dbBackupService.downloadToken(String(bare._id))).rejects.toMatchObject({ message: 'That backup has no archive to download.' });
    await expect(dbBackupService.downloadToken(String(new mongoose.Types.ObjectId()))).rejects.toMatchObject({ message: 'That backup has no archive to download.' });
  });

  it('resolves a token’s backup id to its row', async () => {
    const doc = await row({ file_name: 'x.dbk.gz' });
    await expect(dbBackupService.fileFor(String(doc._id))).resolves.toMatchObject({ file_name: 'x.dbk.gz' });
  });
});

describe('store', () => {
  it('reports what is on disk and the newest completed backup that still has a file', async () => {
    fs.writeFileSync(path.join(BACKUPS, 'a.dbk.gz'), '1234');
    fs.writeFileSync(path.join(BACKUPS, 'ignored.txt'), 'x');
    await row({ file_name: 'a.dbk.gz', started_at: new Date('2026-01-01T00:00:00Z') });
    const newest = await row({ file_name: 'b.dbk.gz', started_at: new Date('2026-02-01T00:00:00Z') });
    await row({ file_name: null, started_at: new Date('2026-03-01T00:00:00Z') });
    const out = await dbBackupService.store();
    expect(out).toMatchObject({ directory: path.resolve(BACKUPS), archives: 1, archiveBytes: 4 });
    expect(out.latest?.id).toBe(String(newest._id));
  });

  it('has no latest backup when none has a file', async () => {
    await expect(dbBackupService.store()).resolves.toMatchObject({ archives: 0, archiveBytes: 0, newestArchiveAt: null, latest: null });
  });
});

describe('runIfDue', () => {
  const enable = (over: Record<string, unknown> = {}) =>
    dbBackupService.saveSettings({ enabled: true, frequency: 'DAILY', time_of_day: '03:00', weekday: 0, keep_last: 7, ...over });
  const NOW = new Date('2026-06-15T12:00:00Z');

  it('does nothing while the schedule is off, asking the clock when no time is given', async () => {
    await expect(dbBackupService.runIfDue(NOW)).resolves.toBeNull();
    await expect(dbBackupService.runIfDue()).resolves.toBeNull();
    expect(await DbBackupModel.countDocuments()).toBe(0);
  });

  it('does nothing when the last run already covers the window', async () => {
    await enable();
    await DbBackupSettingsModel.updateOne({}, { last_run_at: new Date('2026-06-15T11:00:00Z') });
    await expect(dbBackupService.runIfDue(NOW)).resolves.toBeNull();
  });

  it('starts a scheduled backup that is owed, stamping the run first', async () => {
    await enable();
    const started = await dbBackupService.runIfDue(NOW);
    expect(started).toMatchObject({ trigger: 'SCHEDULED', startedBy: null });
    expect((await DbBackupSettingsModel.findOne().lean())?.last_run_at).toEqual(NOW);
    await finished(started?.id as string);
    await expect(dbBackupService.runIfDue(new Date(NOW.getTime() + MIN))).resolves.toBeNull();
  });

  it('waits when a walk is still running, without stamping the run', async () => {
    await enable();
    await row({ status: 'RUNNING', heartbeat_at: new Date() });
    await expect(dbBackupService.runIfDue(NOW)).resolves.toBeNull();
    expect((await DbBackupSettingsModel.findOne().lean())?.last_run_at).toBeNull();
  });

  it('prunes only the oldest scheduled archives past the keep-last window, never manual ones', async () => {
    await enable({ keep_last: 1 });
    for (const [name, day] of [['old.dbk.gz', 1], ['mid.dbk.gz', 2]] as const) {
      fs.writeFileSync(path.join(BACKUPS, name), 'x');
      await row({ trigger: 'SCHEDULED', file_name: name, started_at: new Date(`2026-06-0${day}T00:00:00Z`) });
    }
    fs.writeFileSync(path.join(BACKUPS, 'manual.dbk.gz'), 'x');
    await row({ trigger: 'MANUAL', file_name: 'manual.dbk.gz', started_at: new Date('2026-05-01T00:00:00Z') });
    const started = await dbBackupService.runIfDue(NOW);
    await finished(started?.id as string);
    const remaining = files();
    // The run just started is not finished yet, so the newest finished scheduled archive is the one kept.
    expect(remaining).not.toContain('old.dbk.gz');
    expect(remaining).toContain('mid.dbk.gz');
    expect(remaining).toContain('manual.dbk.gz');
    expect(await DbBackupModel.countDocuments({ trigger: 'SCHEDULED', file_name: null })).toBe(1);
  });
});
