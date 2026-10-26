import { execFile } from 'node:child_process';
import { readHostDir } from '../../host-read';
import { startServerHistorySampler } from '../../tech.history.sampler';
import { buildDisk, buildMemory, buildSwap } from '../../tech.service';
import { sampleContainers } from '../../../stressTest/stressTest.containers';
import { drainPulseWindow } from '@observability/serverPulse';
import { ServerMetricSampleModel } from '../../tech.history.model';
import { logs } from '@observability/log';

jest.mock('node:child_process', () => ({ execFile: jest.fn() }));
jest.mock('../../tech.service', () => ({ buildDisk: jest.fn(), buildMemory: jest.fn(), buildSwap: jest.fn() }));
jest.mock('../../../stressTest/stressTest.containers', () => ({ sampleContainers: jest.fn() }));
jest.mock('@observability/serverPulse', () => ({ drainPulseWindow: jest.fn() }));
jest.mock('../../tech.history.model', () => ({ ...jest.requireActual('../../tech.history.model'), ServerMetricSampleModel: { create: jest.fn() } }));
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn() } } }));

describe('readHostDir', () => {
  const run = (callback: (cb: (err: unknown, stdout?: unknown, stderr?: unknown) => void) => void) =>
    (execFile as unknown as jest.Mock).mockImplementation((_bin, _args, _opts, cb) => callback(cb));

  it('runs a throwaway read-only, network-less container and returns what the script printed', async () => {
    run((cb) => cb(null, Buffer.from('listing\n'), ''));
    await expect(readHostDir('/etc/nginx/sites-available', 'ls')).resolves.toEqual({ output: 'listing\n', error: null });
    const [bin, args, options] = (execFile as unknown as jest.Mock).mock.calls[0];
    expect(bin).toBe('/usr/bin/docker');
    expect(args).toEqual([
      'run', '--rm', '--network', 'none', '--mount', 'type=bind,src=/etc/nginx/sites-available,dst=/etc/nginx/sites-available,readonly',
      'public.ecr.aws/docker/library/alpine:3', 'sh', '-c', 'ls',
    ]);
    expect(options).toMatchObject({ timeout: 90_000, windowsHide: true });
  });

  it('says the Docker CLI is missing when it cannot be found', async () => {
    run((cb) => cb(Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' }), '', ''));
    await expect(readHostDir('/d', 's')).resolves.toEqual({ output: '', error: 'The Docker CLI is not available where this API runs.' });
  });

  it('reports what docker said on stderr, trimmed, and falls back to the error message', async () => {
    run((cb) => cb(new Error('exit 1'), '', ' mount denied \n'));
    await expect(readHostDir('/d', 's')).resolves.toEqual({ output: '', error: 'mount denied' });
    run((cb) => cb(new Error('timed out'), '', ''));
    await expect(readHostDir('/d', 's')).resolves.toEqual({ output: '', error: 'timed out' });
  });
});

describe('startServerHistorySampler', () => {
  const realEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = realEnv;
    jest.useRealTimers();
  });

  it('does nothing under NODE_ENV=test', () => {
    jest.useFakeTimers();
    const stop = startServerHistorySampler();
    jest.advanceTimersByTime(10 * 60_000);
    expect(ServerMetricSampleModel.create).not.toHaveBeenCalled();
    expect(stop()).toBeUndefined();
  });

  describe('in a running server', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      jest.useFakeTimers().setSystemTime(new Date('2026-03-01T10:00:00Z'));
      (buildDisk as jest.Mock).mockResolvedValue({ usagePercent: 61.5, usedBytes: 61, totalBytes: 100 });
      (buildSwap as jest.Mock).mockResolvedValue({ usagePercent: 3 });
      (buildMemory as jest.Mock).mockReturnValue({ usagePercent: 44, usedBytes: 44, totalBytes: 100 });
      (sampleContainers as jest.Mock).mockResolvedValue([{ name: 'api', cpu_pct: 12, memory_mb: 300, memory_pct: 5 }]);
      (drainPulseWindow as jest.Mock).mockReturnValue({ cpu_avg_pct: 20, cpu_peak_pct: 80, requests: 500, errors_5xx: 2 });
      (ServerMetricSampleModel.create as jest.Mock).mockResolvedValue({});
    });

    it('writes one sample every five minutes: the pulse window, the host and the containers, expiring on its own', async () => {
      const stop = startServerHistorySampler();
      await jest.advanceTimersByTimeAsync(5 * 60_000);
      expect(ServerMetricSampleModel.create).toHaveBeenCalledTimes(1);
      const row = (ServerMetricSampleModel.create as jest.Mock).mock.calls[0][0];
      expect(row).toMatchObject({
        cpu_avg_pct: 20, cpu_peak_pct: 80, requests: 500, errors_5xx: 2, memory_pct: 44, memory_used_bytes: 44, memory_total_bytes: 100,
        swap_pct: 3, disk_pct: 61.5, disk_used_bytes: 61, disk_total_bytes: 100,
        containers: [{ name: 'api', cpu_pct: 12, memory_mb: 300 }],
      });
      expect(row.at).toEqual(new Date('2026-03-01T10:05:00Z'));
      expect(row.expires_at.getTime()).toBeGreaterThan(row.at.getTime());
      expect(row.rss_mb).toBeGreaterThan(0);
      expect(typeof row.load_avg_5).toBe('number');
      await jest.advanceTimersByTimeAsync(5 * 60_000);
      expect(ServerMetricSampleModel.create).toHaveBeenCalledTimes(2);
      stop();
      await jest.advanceTimersByTimeAsync(15 * 60_000);
      expect(ServerMetricSampleModel.create).toHaveBeenCalledTimes(2);
    });

    it('does not stack samples while one is still being taken', async () => {
      let release: () => void = () => undefined;
      (sampleContainers as jest.Mock).mockImplementation(() => new Promise((resolve) => { release = () => resolve([]); }));
      const stop = startServerHistorySampler();
      await jest.advanceTimersByTimeAsync(5 * 60_000);
      await jest.advanceTimersByTimeAsync(5 * 60_000);
      expect(sampleContainers).toHaveBeenCalledTimes(1);
      release();
      await jest.advanceTimersByTimeAsync(0);
      await jest.advanceTimersByTimeAsync(5 * 60_000);
      expect(sampleContainers).toHaveBeenCalledTimes(2);
      stop();
    });

    it('logs a failed sample and keeps sampling', async () => {
      (ServerMetricSampleModel.create as jest.Mock).mockRejectedValueOnce(new Error('mongo down'));
      const stop = startServerHistorySampler();
      await jest.advanceTimersByTimeAsync(5 * 60_000);
      expect(logs.server.error).toHaveBeenCalledWith('tech', 'historySampler', { error: expect.any(Error) });
      await jest.advanceTimersByTimeAsync(5 * 60_000);
      expect(ServerMetricSampleModel.create).toHaveBeenCalledTimes(2);
      stop();
    });
  });
});
