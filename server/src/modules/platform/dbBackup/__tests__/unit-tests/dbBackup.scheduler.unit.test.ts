import { startDbBackupScheduler } from '../../dbBackup.scheduler';
import { dbBackupService } from '../../dbBackup.service';
import { startClusterJob } from '@utils/clusterJob';

jest.mock('@utils/clusterJob', () => ({ startClusterJob: jest.fn() }));
jest.mock('../../dbBackup.service', () => ({ dbBackupService: { runIfDue: jest.fn() } }));

describe('startDbBackupScheduler', () => {
  it('asks the service every minute whether a backup is owed, first after ninety seconds', async () => {
    const stop = jest.fn();
    (startClusterJob as jest.Mock).mockReturnValue(stop);
    expect(startDbBackupScheduler()).toBe(stop);
    const options = (startClusterJob as jest.Mock).mock.calls[0][0];
    expect(options).toMatchObject({ component: 'db-backup-scheduler', operation: 'tick', firstDelayMs: 90_000, intervalMs: 60_000 });
    (dbBackupService.runIfDue as jest.Mock).mockResolvedValue(null);
    await options.run();
    expect(dbBackupService.runIfDue).toHaveBeenCalledWith();
  });
});
