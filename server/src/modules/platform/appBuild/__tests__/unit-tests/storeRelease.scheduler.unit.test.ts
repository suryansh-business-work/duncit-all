import { startStoreReleaseScheduler } from '../../storeRelease.scheduler';
import { pollStoreReleases } from '../../storeRelease.service';
import { startClusterJob } from '@utils/clusterJob';

jest.mock('@utils/clusterJob', () => ({ startClusterJob: jest.fn() }));
jest.mock('../../storeRelease.service', () => ({ pollStoreReleases: jest.fn() }));

describe('startStoreReleaseScheduler', () => {
  it('reads the stores every half hour, first after three minutes, and returns the stopper', () => {
    const stop = jest.fn();
    (startClusterJob as jest.Mock).mockReturnValue(stop);
    expect(startStoreReleaseScheduler()).toBe(stop);
    expect(startClusterJob).toHaveBeenCalledWith({
      component: 'appBuild',
      operation: 'releaseScheduler',
      firstDelayMs: 3 * 60_000,
      intervalMs: 30 * 60_000,
      run: pollStoreReleases,
    });
  });
});
