import { dbBackupUploadService } from '../../dbBackup.upload';
import { ARCHIVE_VERSION, readArchive } from '../../dbBackup.archive';
import { DbBackupModel } from '../../dbBackup.model';
import { sweepRunningBackups, toPublicBackup } from '../../dbBackup.service';
import { backupPath, backupSize, deleteBackupFile, ensureBackupsDir, newUploadName } from '../../dbBackup.store';
import { getUrlConfigs } from '@config/url-configs';
import { issueUploadTicket } from '@modules/platform/upload/uploadTicket';
import { logs } from '@observability/log';

jest.mock('../../dbBackup.archive', () => ({ ARCHIVE_VERSION: 2, readArchive: jest.fn() }));
jest.mock('../../dbBackup.model', () => ({ DbBackupModel: { create: jest.fn(), findById: jest.fn(), updateOne: jest.fn() } }));
jest.mock('../../dbBackup.service', () => ({ sweepRunningBackups: jest.fn(), toPublicBackup: jest.fn((doc) => ({ public: doc })) }));
jest.mock('../../dbBackup.store', () => ({
  BACKUP_EXTENSION: '.dbbak',
  backupPath: jest.fn(),
  backupSize: jest.fn(),
  deleteBackupFile: jest.fn(),
  ensureBackupsDir: jest.fn(),
  newUploadName: jest.fn(),
}));
jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn() }));
jest.mock('@modules/platform/upload/uploadTicket', () => ({ issueUploadTicket: jest.fn() }));
jest.mock('@modules/platform/upload/uploadLimits', () => ({ UPLOAD_MAX_BYTES: 12345 }));
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn() } } }));

const execOk = () => ({ exec: () => Promise.resolve({}) });
const updateOne = DbBackupModel.updateOne as jest.Mock;
const user = { id: 'u1', email: 'ops@duncit.com' } as never;

/** The archive reader as an async generator over fixed entries (or one that throws). */
function archive(entries: unknown[], failWith?: Error) {
  (readArchive as jest.Mock).mockImplementation(async function* () {
    for (const entry of entries) yield entry;
    if (failWith) throw failWith;
  });
}
const header = (over: Record<string, unknown> = {}) => ({ kind: 'header', header: { version: 1, database: 'src_db', created_at: '2026-01-01T00:00:00Z', ...over } });
const collection = (name: string) => ({ kind: 'collection', name });
const doc = (data: Record<string, unknown> = { a: 1 }) => ({ kind: 'document', doc: data });

const lean = (value: unknown) => ({ lean: () => ({ exec: () => Promise.resolve(value) }) });
const settle = () => new Promise((resolve) => setImmediate(resolve));
const finalSet = () => updateOne.mock.calls.at(-1)?.[1].$set;

beforeEach(() => {
  updateOne.mockReturnValue(execOk());
  (backupPath as jest.Mock).mockImplementation((name: string) => `/backups/${name}`);
  (backupSize as jest.Mock).mockResolvedValue(2048);
  (deleteBackupFile as jest.Mock).mockResolvedValue(undefined);
});

describe('maxBytes', () => {
  it('reports the upload ceiling', () => {
    expect(dbBackupUploadService.maxBytes()).toBe(12345);
  });
});

describe('auth', () => {
  beforeEach(() => {
    (newUploadName as jest.Mock).mockReturnValue('upload-1.dbbak');
    (DbBackupModel.create as jest.Mock).mockResolvedValue({ _id: 'bk1' });
    (getUrlConfigs as jest.Mock).mockResolvedValue({ serverUrl: 'https://api.duncit.com/' });
    (issueUploadTicket as jest.Mock).mockReturnValue('ticket-1');
  });

  it('rejects a file that is not a backup archive', async () => {
    await expect(dbBackupUploadService.auth(user, 'notes.txt')).rejects.toMatchObject({
      message: 'Choose a .dbbak file — that is what this server writes its backups as.',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(DbBackupModel.create).not.toHaveBeenCalled();
  });

  it('opens the row before the bytes arrive and hands out a single-use pass', async () => {
    const pass = await dbBackupUploadService.auth(user, '  Nightly.DBBAK ');
    expect(pass).toEqual({ uploadUrl: 'https://api.duncit.com/upload', ticket: 'ticket-1', backupId: 'bk1' });
    expect(sweepRunningBackups).toHaveBeenCalled();
    expect(ensureBackupsDir).toHaveBeenCalled();
    expect(newUploadName).toHaveBeenCalledWith('Nightly.DBBAK', expect.any(Date));
    expect(DbBackupModel.create).toHaveBeenCalledWith({ status: 'RUNNING', trigger: 'UPLOADED', file_name: 'upload-1.dbbak', started_by: 'ops@duncit.com' });
    expect(issueUploadTicket).toHaveBeenCalledWith('u1', '/db-backups', 'db-backups', '', 'upload-1.dbbak');
  });

  it('records the user id when the user has no email', async () => {
    await dbBackupUploadService.auth({ id: 'u9' } as never, 'a.dbbak');
    expect((DbBackupModel.create as jest.Mock).mock.calls[0][0].started_by).toBe('u9');
  });
});

describe('complete: guards', () => {
  it.each([
    ['missing', null],
    ['not an upload', { trigger: 'MANUAL', status: 'RUNNING' }],
  ])('rejects an upload that is %s', async (_label, found) => {
    (DbBackupModel.findById as jest.Mock).mockReturnValue(lean(found));
    await expect(dbBackupUploadService.complete('bk1')).rejects.toMatchObject({ message: 'That upload no longer exists.' });
  });

  it('rejects an archive that was already checked', async () => {
    (DbBackupModel.findById as jest.Mock).mockReturnValue(lean({ trigger: 'UPLOADED', status: 'SUCCEEDED' }));
    await expect(dbBackupUploadService.complete('bk1')).rejects.toMatchObject({ message: 'That archive has already been checked.' });
  });

  it.each([
    ['has no file name', { trigger: 'UPLOADED', status: 'RUNNING', file_name: null }, null],
    ['has an empty file', { trigger: 'UPLOADED', status: 'RUNNING', file_name: 'a.dbbak' }, 0],
  ])('fails the row and tells the operator when the upload %s', async (_label, found, size) => {
    (DbBackupModel.findById as jest.Mock).mockReturnValue(lean(found));
    (backupSize as jest.Mock).mockResolvedValue(size);
    await expect(dbBackupUploadService.complete('bk1')).rejects.toMatchObject({ message: 'No archive arrived. Start the upload again.' });
    expect(finalSet()).toMatchObject({ status: 'FAILED', error: 'No archive arrived — the upload did not finish.', file_name: null });
    expect(readArchive).not.toHaveBeenCalled();
    if (found.file_name) expect(deleteBackupFile).toHaveBeenCalledWith('a.dbbak');
    else expect(deleteBackupFile).not.toHaveBeenCalled();
  });
});

describe('complete: the read-through', () => {
  const start = async () => {
    (DbBackupModel.findById as jest.Mock).mockReturnValue(lean({ _id: 'bk1', trigger: 'UPLOADED', status: 'RUNNING', file_name: 'up.dbbak' }));
    const result = await dbBackupUploadService.complete('bk1');
    await settle();
    return result;
  };

  it('answers at once with the row and its size, then verifies and records the tallies', async () => {
    archive([header(), collection('users'), doc({ a: 1 }), doc({ b: 'two' }), collection('pods'), doc({ c: 3 })]);
    const result = await start();
    expect(result).toEqual({ public: expect.objectContaining({ trigger: 'UPLOADED', size_bytes: 2048 }) });
    expect(readArchive).toHaveBeenCalledWith('/backups/up.dbbak');
    expect(updateOne).toHaveBeenCalledWith({ _id: 'bk1' }, { $set: expect.objectContaining({ current_collection: 'users' }) });
    const set = finalSet();
    expect(set).toMatchObject({
      status: 'SUCCEEDED', database: 'src_db', archive_taken_at: '2026-01-01T00:00:00Z', size_bytes: 2048,
      documents_total: 3, current_collection: null,
    });
    expect(set.collections.map((c: any) => [c.name, c.documents])).toEqual([['users', 2], ['pods', 1]]);
    expect(set.raw_bytes).toBe(set.collections.reduce((sum: number, c: any) => sum + c.bytes, 0));
    expect(set.raw_bytes).toBeGreaterThan(0);
  });

  it('records a zero size when the file vanished between the check and the read', async () => {
    archive([header(), collection('users'), doc()]);
    (backupSize as jest.Mock).mockResolvedValueOnce(2048).mockResolvedValueOnce(null);
    await start();
    expect(finalSet()).toMatchObject({ status: 'SUCCEEDED', size_bytes: 0 });
  });

  it('pulses the heartbeat every 20,000 documents so a long collection is not swept', async () => {
    archive([header(), collection('big'), ...Array.from({ length: 20_000 }, () => doc({ x: 1 }))]);
    await start();
    const heartbeats = updateOne.mock.calls.filter((c) => Object.keys(c[1].$set).length === 1 && 'heartbeat_at' in c[1].$set);
    expect(heartbeats).toHaveLength(1);
  });

  it.each([
    ['no header', [collection('users'), doc()], 'This is not a Duncit backup archive: it carries no header.'],
    ['a newer format', [header({ version: ARCHIVE_VERSION + 1 }), collection('users')], `This archive was written by a newer version of Duncit (format ${ARCHIVE_VERSION + 1}); this server reads up to ${ARCHIVE_VERSION}.`],
    ['no collections', [header()], 'This archive holds no collections, so there is nothing to restore from it.'],
    ['a document before any collection', [header(), doc()], 'This archive has a document before any collection.'],
  ])('fails and removes an archive with %s', async (_label, entries, message) => {
    archive(entries);
    await start();
    expect(finalSet()).toMatchObject({ status: 'FAILED', error: message, file_name: null, current_collection: null });
    expect(deleteBackupFile).toHaveBeenCalledWith('up.dbbak');
    expect(logs.server.error).toHaveBeenCalledWith('dbBackup', 'verifyUpload', expect.objectContaining({ backupId: 'bk1' }));
  });

  it('fails an archive that cannot be decoded, with a generic message for a non-Error', async () => {
    (readArchive as jest.Mock).mockImplementation(async function* () {
      yield header();
      throw 'corrupt frame';
    });
    await start();
    expect(finalSet()).toMatchObject({ status: 'FAILED', error: 'That archive could not be read.' });
  });

  it('fails the row when the archive is not inside the backups directory', async () => {
    (backupPath as jest.Mock).mockReturnValue(null);
    await start();
    expect(readArchive).not.toHaveBeenCalled();
    expect(finalSet()).toMatchObject({ status: 'FAILED', error: 'That archive is not in the backups directory.' });
  });

  it('logs when even the failure bookkeeping breaks, never rejecting the request', async () => {
    archive([]);
    updateOne.mockReturnValue({ exec: () => Promise.reject(new Error('mongo down')) });
    await expect(start()).resolves.toBeDefined();
    expect(logs.server.error).toHaveBeenCalledWith('dbBackup', 'completeUpload', { error: expect.any(Error), backupId: 'bk1' });
  });
});
