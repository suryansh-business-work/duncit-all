import { StatusCheckModel } from '../../statusHistory.model';
import { logs } from '../../log';
import { runStatusSweep, startStatusScheduler } from '../../statusScheduler';
import { listStatusServices } from '../../statusServices';
import type { ProbeResult } from '../../statusProbe';

const okResult = (url: string): ProbeResult => ({
  url,
  ok: true,
  statusCode: 200,
  statusText: 'OK',
  ssl: null,
});

describe('runStatusSweep', () => {
  let insertMany: jest.SpyInstance;

  beforeEach(() => {
    insertMany = jest
      .spyOn(StatusCheckModel, 'insertMany')
      .mockResolvedValue([] as never);
  });

  it('probes every catalog service and persists one check per service', async () => {
    const prober = jest.fn(async (target: URL) => okResult(target.toString()));
    const count = await runStatusSweep(prober);

    const services = listStatusServices();
    expect(count).toBe(services.length);
    expect(prober).toHaveBeenCalledTimes(services.length);
    expect(insertMany).toHaveBeenCalledTimes(1);

    const docs = insertMany.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(docs).toHaveLength(services.length);
    for (const doc of docs) {
      expect(doc.ok).toBe(true);
      expect(doc.status_code).toBe(200);
      expect(typeof doc.latency_ms).toBe('number');
      expect(doc.checked_at).toBeInstanceOf(Date);
    }
    expect(new Set(docs.map((d) => d.service_key)).size).toBe(services.length);
  });

  it('probes the health/probe url when a service declares one', async () => {
    const prober = jest.fn(async (target: URL) => okResult(target.toString()));
    await runStatusSweep(prober);
    const urls = prober.mock.calls.map(([target]) => target.toString());
    expect(urls).toContain('https://server.duncit.com/health');
  });

  it('records a failed check when the prober reports a down service', async () => {
    const prober = jest.fn(async (target: URL): Promise<ProbeResult> => {
      if (target.hostname.startsWith('crm.')) {
        return { url: target.toString(), ok: false, statusCode: null, statusText: null, ssl: null, error: 'timeout' };
      }
      return okResult(target.toString());
    });
    await runStatusSweep(prober);
    const docs = insertMany.mock.calls[0][0] as Array<Record<string, unknown>>;
    const crm = docs.find((d) => d.service_key === 'crm');
    expect(crm).toMatchObject({ ok: false, status_code: null, latency_ms: null });
  });

  it('records a failed check when a prober throws', async () => {
    const prober = jest.fn(async () => {
      throw new Error('boom');
    });
    await runStatusSweep(prober);
    const docs = insertMany.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(docs.every((d) => d.ok === false && d.status_code === null)).toBe(true);
  });
});

describe('startStatusScheduler', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let insertMany: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    insertMany = jest
      .spyOn(StatusCheckModel, 'insertMany')
      .mockResolvedValue([] as never);
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('never starts under NODE_ENV=test', async () => {
    const stop = startStatusScheduler({ prober: jest.fn() });
    await jest.advanceTimersByTimeAsync(10 * 60_000);
    expect(insertMany).not.toHaveBeenCalled();
    stop();
  });

  it('sweeps ~10s after start and then every 5 minutes until stopped', async () => {
    process.env.NODE_ENV = 'development';
    const prober = jest.fn(async (target: URL) => okResult(target.toString()));
    const stop = startStatusScheduler({ prober });

    await jest.advanceTimersByTimeAsync(10_000);
    expect(insertMany).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(5 * 60_000);
    expect(insertMany).toHaveBeenCalledTimes(2);

    stop();
    await jest.advanceTimersByTimeAsync(15 * 60_000);
    expect(insertMany).toHaveBeenCalledTimes(2);
  });

  it('keeps the interval alive when a sweep fails', async () => {
    process.env.NODE_ENV = 'development';
    const errorSpy = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    insertMany.mockRejectedValue(new Error('mongo down'));
    const prober = jest.fn(async (target: URL) => okResult(target.toString()));
    const stop = startStatusScheduler({ prober });

    await jest.advanceTimersByTimeAsync(10_000);
    expect(errorSpy).toHaveBeenCalledWith(
      'status-scheduler',
      'sweep',
      expect.objectContaining({ error: expect.any(Error) }),
    );

    await jest.advanceTimersByTimeAsync(5 * 60_000);
    expect(insertMany).toHaveBeenCalledTimes(2);

    stop();
    errorSpy.mockRestore();
  });
});
