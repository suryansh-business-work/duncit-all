/**
 * The month of server history behind Tech > Server > Info, against a real
 * database: per-day folding in the admin's zone, gaps for days with no samples,
 * the heaviest containers, disk growth and the month summary.
 */
jest.mock('@utils/app-time', () => ({ ...jest.requireActual('@utils/app-time'), getAppTimeZone: jest.fn(() => 'UTC') }));

import { serverHistory } from '../../tech.history.service';
import { SERVER_HISTORY_DAYS, ServerMetricSampleModel } from '../../tech.history.model';
import { StatusCheckModel } from '@observability/statusHistory.model';

const GB = 1_073_741_824;
const expires = new Date(Date.now() + 40 * 86_400_000);

/** yyyy-MM-dd for `daysAgo` days back, in UTC. */
const dayKey = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
const noon = (daysAgo: number, hour = 12) => new Date(`${dayKey(daysAgo)}T${String(hour).padStart(2, '0')}:00:00Z`);

const sample = (daysAgo: number, over: Record<string, unknown> = {}) =>
  ServerMetricSampleModel.create({ at: noon(daysAgo), expires_at: expires, ...over });
const probe = (daysAgo: number, ok: boolean, latency: number | null, service = 'server') =>
  StatusCheckModel.create({ service_key: service, ok, latency_ms: latency, checked_at: noon(daysAgo) });

describe('serverHistory: the day list', () => {
  it('has one row per calendar day, oldest first, with empty readings for days nothing was recorded', async () => {
    const out = await serverHistory(3);
    expect(out.timeZone).toBe('UTC');
    expect(out.days.map((d) => d.date)).toEqual([dayKey(2), dayKey(1), dayKey(0)]);
    expect(out.days[0]).toEqual({
      date: dayKey(2), samples: 0, cpuAvgPct: null, cpuPeakPct: null, loadAvg: null, memoryAvgPct: null, memoryPeakPct: null, swapPeakPct: null,
      diskPct: null, diskUsedBytes: null, diskTotalBytes: null, requests: null, errors5xx: null, latencyAvgMs: null, latencyP95Ms: null,
      latencyPeakMs: null, eventLoopP99PeakMs: null, rssPeakMb: null, probeLatencyMs: null, uptimePct: null,
    });
    expect(out.containers).toEqual([]);
    expect(out.summary).toMatchObject({ daysWithData: 0, cpuAvgPct: null, cpuPeakPct: null, diskPct: null, diskGrowthBytesPerDay: null, daysUntilDiskFull: null, requests: 0, errors5xx: 0 });
  });

  it('defaults to a month, and keeps any other span between one day and a month', async () => {
    expect((await serverHistory()).days).toHaveLength(SERVER_HISTORY_DAYS);
    expect((await serverHistory(0)).days).toHaveLength(SERVER_HISTORY_DAYS);
    expect((await serverHistory(Number.NaN)).days).toHaveLength(SERVER_HISTORY_DAYS);
    expect((await serverHistory(-4)).days).toHaveLength(1);
    expect((await serverHistory(1000)).days).toHaveLength(SERVER_HISTORY_DAYS);
    expect((await serverHistory(2.9)).days).toHaveLength(2);
  });

  it('folds each day’s samples: averages, peaks, the last disk reading and request-weighted latency', async () => {
    await sample(1, { cpu_avg_pct: 10, cpu_peak_pct: 50, load_avg_5: 1, memory_pct: 40, swap_pct: 5, disk_pct: 60, disk_used_bytes: 60 * GB, disk_total_bytes: 100 * GB, requests: 100, errors_5xx: 1, latency_avg_ms: 100, latency_p95_ms: 300, event_loop_p99_ms: 20, rss_mb: 300 });
    await sample(1, { at: noon(1, 18), cpu_avg_pct: 30, cpu_peak_pct: 90, load_avg_5: 3, memory_pct: 60, swap_pct: 15, disk_pct: 62, disk_used_bytes: 62 * GB, disk_total_bytes: 100 * GB, requests: 300, errors_5xx: 4, latency_avg_ms: 200, latency_p95_ms: 500, event_loop_p99_ms: 80, rss_mb: 450 });
    const day = (await serverHistory(2)).days[0];
    expect(day).toMatchObject({
      date: dayKey(1), samples: 2, cpuAvgPct: 20, cpuPeakPct: 90, loadAvg: 2, memoryAvgPct: 50, memoryPeakPct: 60, swapPeakPct: 15,
      diskPct: 62, diskUsedBytes: 62 * GB, diskTotalBytes: 100 * GB, requests: 400, errors5xx: 5, latencyAvgMs: 175, latencyP95Ms: 450,
      latencyPeakMs: 500, eventLoopP99PeakMs: 80, rssPeakMb: 450,
    });
  });

  it('has no weighted latency for a day with no requests', async () => {
    await sample(0, { requests: 0, latency_avg_ms: 100, latency_p95_ms: 100 });
    const day = (await serverHistory(1)).days[0];
    expect(day).toMatchObject({ samples: 1, requests: 0, latencyAvgMs: null, latencyP95Ms: null });
  });

  it('reads the API probe’s latency and uptime per day, ignoring other services and a probe with no latency', async () => {
    await probe(0, true, 40);
    await probe(0, true, 60);
    await probe(0, false, null);
    await probe(0, false, 999, 'web');
    const day = (await serverHistory(1)).days[0];
    expect(day).toMatchObject({ probeLatencyMs: 50, uptimePct: 66.7 });
    expect(day.samples).toBe(0);
  });

  it('does not count a sample from before the first day in the list', async () => {
    await sample(10, { cpu_avg_pct: 99 });
    expect((await serverHistory(3)).days.every((d) => d.samples === 0)).toBe(true);
  });
});

describe('serverHistory: containers', () => {
  it('keeps the eight heaviest by peak memory, with their per-day peaks lined up with the days', async () => {
    for (let i = 0; i < 10; i += 1) {
      await sample(1, { at: noon(1, 10), containers: [{ name: `c${i}`, cpu_pct: i, memory_mb: 100 * (i + 1) }] });
    }
    await sample(0, { containers: [{ name: 'c9', cpu_pct: 90, memory_mb: 2000 }, { name: 'c9', cpu_pct: 10, memory_mb: 1000 }] });
    const { containers } = await serverHistory(2);
    expect(containers).toHaveLength(8);
    expect(containers[0]).toEqual({
      name: 'c9', cpuAvgPct: 36.3, cpuPeakPct: 90, memoryAvgMb: 1333, memoryPeakMb: 2000, dailyMemoryPeakMb: [1000, 2000],
    });
    expect(containers[1]).toMatchObject({ name: 'c8', memoryPeakMb: 900, dailyMemoryPeakMb: [900, null] });
    expect(containers.map((c) => c.name)).not.toContain('c0');
  });
});

describe('serverHistory: the month summary', () => {
  it('averages and peaks across the days that have data, and takes the disk percentage from the latest', async () => {
    await sample(2, { cpu_avg_pct: 10, cpu_peak_pct: 40, memory_pct: 30, disk_pct: 50, requests: 10, errors_5xx: 1, latency_avg_ms: 100, latency_p95_ms: 200 });
    await sample(1, { cpu_avg_pct: 30, cpu_peak_pct: 80, memory_pct: 50, disk_pct: 55, requests: 10, errors_5xx: 2, latency_avg_ms: 100, latency_p95_ms: 400 });
    await probe(1, true, 20);
    const { summary } = await serverHistory(3);
    expect(summary).toMatchObject({
      daysWithData: 2, cpuAvgPct: 20, cpuPeakPct: 80, memoryAvgPct: 40, memoryPeakPct: 50, diskPct: 55, latencyP95Ms: 300, probeLatencyMs: 20,
      uptimePct: 100, requests: 20, errors5xx: 3,
    });
  });

  it('estimates how fast the disk fills and how many days are left, from the days that have a reading', async () => {
    await sample(3, { disk_used_bytes: 10 * GB, disk_total_bytes: 100 * GB });
    await sample(2, { disk_used_bytes: 12 * GB, disk_total_bytes: 100 * GB });
    await sample(0, { disk_used_bytes: 16 * GB, disk_total_bytes: 100 * GB });
    const { summary } = await serverHistory(4);
    expect(summary.diskGrowthBytesPerDay).toBeGreaterThan(1.9 * GB);
    expect(summary.diskGrowthBytesPerDay).toBeLessThan(2.1 * GB);
    expect(summary.daysUntilDiskFull).toBe(Math.floor((84 * GB) / (summary.diskGrowthBytesPerDay as number)));
  });

  it('has no projection with fewer than two readings, a flat or shrinking disk, or when one reading is the only one', async () => {
    await sample(1, { disk_used_bytes: 10 * GB, disk_total_bytes: 100 * GB });
    expect((await serverHistory(3)).summary).toMatchObject({ diskGrowthBytesPerDay: null, daysUntilDiskFull: null });
    await sample(0, { disk_used_bytes: 10 * GB, disk_total_bytes: 100 * GB });
    expect((await serverHistory(3)).summary).toMatchObject({ diskGrowthBytesPerDay: 0, daysUntilDiskFull: null });
    await ServerMetricSampleModel.updateOne({ at: noon(0) }, { disk_used_bytes: 8 * GB });
    const shrinking = (await serverHistory(3)).summary;
    expect(shrinking.diskGrowthBytesPerDay).toBeLessThan(0);
    expect(shrinking.daysUntilDiskFull).toBeNull();
  });

  it('has no days-until-full when the latest day has no disk totals', async () => {
    await sample(2, { disk_used_bytes: 10 * GB, disk_total_bytes: 100 * GB });
    await sample(0, { disk_used_bytes: 14 * GB });
    await ServerMetricSampleModel.collection.updateOne({ at: noon(0) }, { $unset: { disk_total_bytes: 1 } });
    const { summary } = await serverHistory(3);
    expect(summary.diskGrowthBytesPerDay).toBeGreaterThan(0);
    expect(summary.daysUntilDiskFull).toBeNull();
  });

});
