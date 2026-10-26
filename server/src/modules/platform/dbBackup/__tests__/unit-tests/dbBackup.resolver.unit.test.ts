import { dbBackupResolvers } from '../../dbBackup.resolver';
import { dbBackupService } from '../../dbBackup.service';
import { dbRestoreService } from '../../dbBackup.restore';
import { dbBackupUploadService } from '../../dbBackup.upload';
import { getUrlConfigs } from '@config/url-configs';
import { makeContext } from '@test/harness';

jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn() }));
jest.mock('../../../tech/tech.resolver', () => ({ TECH_EXEC: ['SUPER_ADMIN'], TECH_MANAGE: ['SUPER_ADMIN', 'TECH_MANAGER'] }));
jest.mock('../../dbBackup.service', () => ({
  dbBackupService: { table: jest.fn(), settings: jest.fn(), store: jest.fn(), runNow: jest.fn(), saveSettings: jest.fn(), remove: jest.fn(), downloadToken: jest.fn(), fileFor: jest.fn() },
}));
jest.mock('../../dbBackup.restore', () => ({ dbRestoreService: { restoreJob: jest.fn(), start: jest.fn() } }));
jest.mock('../../dbBackup.upload', () => ({ dbBackupUploadService: { auth: jest.fn(), complete: jest.fn() } }));

type R = Record<string, (...a: any[]) => any>;
const Q = dbBackupResolvers.Query as R;
const M = dbBackupResolvers.Mutation as R;
const root = makeContext({ id: 'u1', email: 'root@duncit.com', roles: ['SUPER_ADMIN'] });
const tech = makeContext({ id: 'u2', roles: ['TECH_MANAGER'] });
const nobody = makeContext({ id: 'u3', roles: ['USER'] });

describe('queries', () => {
  it('serve the table, settings and restore job to the top role', async () => {
    await Q.dbBackupsTable({}, { query: { page: 1 } }, root);
    expect(dbBackupService.table).toHaveBeenCalledWith({ page: 1 });
    await Q.dbBackupSettings({}, {}, root);
    expect(dbBackupService.settings).toHaveBeenCalled();
    await Q.dbRestoreJob({}, { id: 'j1' }, root);
    expect(dbRestoreService.restoreJob).toHaveBeenCalledWith('j1');
  });

  it('serve the store metadata one role lower', () => {
    Q.dbBackupStore({}, {}, tech);
    expect(dbBackupService.store).toHaveBeenCalled();
    expect(() => Q.dbBackupStore({}, {}, nobody)).toThrow('Access Denied');
    expect(() => Q.dbBackupsTable({}, {}, tech)).toThrow('Access Denied');
  });
});

describe('mutations', () => {
  it('start a backup, save settings in the service’s own field names, delete one', async () => {
    await M.runDbBackup({}, {}, root);
    expect(dbBackupService.runNow).toHaveBeenCalledWith(root.user);
    await M.saveDbBackupSettings({}, { input: { enabled: true, frequency: 'WEEKLY', timeOfDay: '04:00', weekday: 2, keepLast: 5 } }, root);
    expect(dbBackupService.saveSettings).toHaveBeenCalledWith({ enabled: true, frequency: 'WEEKLY', time_of_day: '04:00', weekday: 2, keep_last: 5 });
    await M.deleteDbBackup({}, { id: 'b1' }, root);
    expect(dbBackupService.remove).toHaveBeenCalledWith('b1');
  });

  it('mint a download link under the server url, with the file name, or an empty one when the file is gone', async () => {
    (getUrlConfigs as jest.Mock).mockResolvedValue({ serverUrl: 'https://api.duncit.com/' });
    (dbBackupService.downloadToken as jest.Mock).mockResolvedValue('tok/1');
    (dbBackupService.fileFor as jest.Mock).mockResolvedValue({ file_name: 'a.dbk.gz' });
    await expect(M.requestDbBackupDownload({}, { id: 'b1' }, root)).resolves.toEqual({
      url: 'https://api.duncit.com/db-backups/download?token=tok%2F1', fileName: 'a.dbk.gz', expiresInSeconds: 300,
    });
    (dbBackupService.fileFor as jest.Mock).mockResolvedValue(null);
    await expect(M.requestDbBackupDownload({}, { id: 'b1' }, root)).resolves.toMatchObject({ fileName: '' });
  });

  it('hand uploads and restores to their services as the signed-in user', async () => {
    await M.dbBackupUploadAuth({}, { fileName: 'x.dbk.gz' }, root);
    expect(dbBackupUploadService.auth).toHaveBeenCalledWith(root.user, 'x.dbk.gz');
    await M.completeDbBackupUpload({}, { id: 'b1' }, root);
    expect(dbBackupUploadService.complete).toHaveBeenCalledWith('b1');
    await M.restoreDbBackup({}, { id: 'b1' }, root);
    expect(dbRestoreService.start).toHaveBeenCalledWith('b1', root.user);
  });

  it('refuse everyone below the top role', async () => {
    expect(() => M.runDbBackup({}, {}, tech)).toThrow('Access Denied');
    await expect(M.requestDbBackupDownload({}, { id: 'b' }, tech)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    expect(() => M.restoreDbBackup({}, { id: 'b' }, nobody)).toThrow('Access Denied');
  });
});
