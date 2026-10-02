/**
 * The shared scheduler loop. What it must guarantee: nothing starts in a test
 * run, nothing runs off the leader, two runs never overlap, a failed run is
 * logged under the job's own component and the interval survives it.
 */
const mockLeader = { value: true };
jest.mock('@utils/schedulerLeader', () => ({ isSchedulerLeader: () => mockLeader.value }));
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn() } } }));

import { logs } from '@observability/log';
import { startClusterJob } from '@utils/clusterJob';

const job = (run: () => Promise<unknown>) => ({
  component: 'coin-expiry',
  operation: 'sweep',
  firstDelayMs: 1_000,
  intervalMs: 60_000,
  run,
});

describe('startClusterJob', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.useFakeTimers();
    mockLeader.value = true;
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env.NODE_ENV = originalEnv;
  });

  it('never starts under NODE_ENV=test', async () => {
    process.env.NODE_ENV = 'test';
    const run = jest.fn().mockResolvedValue(undefined);
    const stop = startClusterJob(job(run));
    await jest.advanceTimersByTimeAsync(5 * 60_000);
    expect(run).not.toHaveBeenCalled();
    stop();
  });

  it('runs after the first delay, then on every interval, until stopped', async () => {
    const run = jest.fn().mockResolvedValue(undefined);
    const stop = startClusterJob(job(run));
    await jest.advanceTimersByTimeAsync(1_000);
    expect(run).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(60_000);
    expect(run).toHaveBeenCalledTimes(2);
    stop();
    await jest.advanceTimersByTimeAsync(5 * 60_000);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('skips every tick while another process leads', async () => {
    mockLeader.value = false;
    const run = jest.fn().mockResolvedValue(undefined);
    const stop = startClusterJob(job(run));
    await jest.advanceTimersByTimeAsync(2 * 60_000);
    expect(run).not.toHaveBeenCalled();
    stop();
  });

  it('never starts a run while the previous one is still going', async () => {
    let finish: () => void = () => undefined;
    const run = jest.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const stop = startClusterJob(job(run));
    await jest.advanceTimersByTimeAsync(1_000 + 3 * 60_000);
    expect(run).toHaveBeenCalledTimes(1);
    finish();
    await jest.advanceTimersByTimeAsync(60_000);
    expect(run).toHaveBeenCalledTimes(2);
    stop();
  });

  it('logs a failed run under the job component and keeps the interval', async () => {
    const error = new Error('Mongo is down');
    const run = jest.fn().mockRejectedValueOnce(error).mockResolvedValue(undefined);
    const stop = startClusterJob(job(run));
    await jest.advanceTimersByTimeAsync(1_000);
    expect(logs.server.error).toHaveBeenCalledWith('coin-expiry', 'sweep', { error, msg: 'sweep failed' });
    await jest.advanceTimersByTimeAsync(60_000);
    expect(run).toHaveBeenCalledTimes(2);
    stop();
  });
});
