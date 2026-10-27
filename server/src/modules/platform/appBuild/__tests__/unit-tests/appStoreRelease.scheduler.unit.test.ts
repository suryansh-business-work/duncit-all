import { startAppStoreReleaseScheduler } from '../../appStoreRelease.scheduler';
import { resumeAppStoreReleases } from '../../appStoreRelease.service';
import { startClusterJob } from '@utils/clusterJob';

jest.mock('@utils/clusterJob', () => ({ startClusterJob: jest.fn() }));
jest.mock('../../appStoreRelease.service', () => ({ resumeAppStoreReleases: jest.fn() }));

describe('startAppStoreReleaseScheduler', () => {
  it('hands stale pushes back to the state machine every minute, first after ninety seconds, and returns the stopper', () => {
    const stop = jest.fn();
    (startClusterJob as jest.Mock).mockReturnValue(stop);
    expect(startAppStoreReleaseScheduler()).toBe(stop);
    expect(startClusterJob).toHaveBeenCalledWith({
      component: 'appBuild',
      operation: 'appStoreScheduler',
      firstDelayMs: 90_000,
      intervalMs: 60_000,
      run: resumeAppStoreReleases,
    });
  });
});
