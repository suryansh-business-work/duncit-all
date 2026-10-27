import { startRateLimitCleanupScheduler } from '../../rateLimit.scheduler';
import { rateLimitService } from '../../rateLimit.service';
import { startClusterJob } from '@utils/clusterJob';
import { logs } from '@observability/log';

jest.mock('@utils/clusterJob', () => ({ startClusterJob: jest.fn() }));
jest.mock('../../rateLimit.service', () => ({ rateLimitService: { purgeOldEvents: jest.fn() } }));
jest.mock('@observability/log', () => ({ logs: { server: { info: jest.fn() } } }));

describe('startRateLimitCleanupScheduler', () => {
  const job = () => {
    const stop = jest.fn();
    (startClusterJob as jest.Mock).mockReturnValue(stop);
    expect(startRateLimitCleanupScheduler()).toBe(stop);
    return (startClusterJob as jest.Mock).mock.calls[0][0];
  };

  it('sweeps once a day, the first time after ninety seconds', () => {
    expect(job()).toMatchObject({ component: 'rateLimit', operation: 'cleanup', firstDelayMs: 90_000, intervalMs: 86_400_000 });
  });

  it('logs how many breaches it deleted, and stays quiet when there was nothing to delete', async () => {
    const { run } = job();
    (rateLimitService.purgeOldEvents as jest.Mock).mockResolvedValue(12);
    await run();
    expect(logs.server.info).toHaveBeenCalledWith('rateLimit', 'cleanup', { deleted: 12 });
    (logs.server.info as jest.Mock).mockClear();
    (rateLimitService.purgeOldEvents as jest.Mock).mockResolvedValue(0);
    await run();
    expect(logs.server.info).not.toHaveBeenCalled();
  });
});
