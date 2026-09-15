import os from 'node:os';
import { logs } from '@observability/log';
import { drainPulseWindow } from '@observability/serverPulse';
import { sampleContainers } from '../stressTest/stressTest.containers';
import { buildDisk, buildMemory, buildSwap } from './tech.service';
import { SERVER_SAMPLE_RETENTION_MS, ServerMetricSampleModel } from './tech.history.model';

/**
 * Writes one host sample every five minutes — the rows behind Tech > Server >
 * Info's 30-day charts and its AI recommendation.
 *
 * One small insert per tick (≈ 8.6k rows a month) and expired by Mongo's TTL,
 * so it never needs a cleanup job. Traffic and CPU come from the pulse's
 * drained window, so a sample describes the five minutes before it, not the
 * moment it was taken. No-ops under NODE_ENV=test.
 */

const SAMPLE_MS = 5 * 60_000;
const BYTES_PER_MB = 1_048_576;

async function takeSample(): Promise<void> {
  const [disk, swap, containers] = await Promise.all([buildDisk(), buildSwap(), sampleContainers()]);
  const memory = buildMemory();
  const window = drainPulseWindow();
  const proc = process.memoryUsage();
  const at = new Date();
  await ServerMetricSampleModel.create({
    at,
    ...window,
    load_avg_5: Math.round((os.loadavg()[1] ?? 0) * 100) / 100,
    memory_pct: memory.usagePercent,
    memory_used_bytes: memory.usedBytes,
    memory_total_bytes: memory.totalBytes,
    swap_pct: swap.usagePercent,
    disk_pct: disk.usagePercent,
    disk_used_bytes: disk.usedBytes,
    disk_total_bytes: disk.totalBytes,
    rss_mb: Math.round(proc.rss / BYTES_PER_MB),
    heap_used_mb: Math.round(proc.heapUsed / BYTES_PER_MB),
    containers: containers.map(({ name, cpu_pct: cpuPct, memory_mb: memoryMb }) => ({
      name,
      cpu_pct: cpuPct,
      memory_mb: memoryMb,
    })),
    expires_at: new Date(at.getTime() + SERVER_SAMPLE_RETENTION_MS),
  });
}

/** Start the five-minute sampler. Returns a stop function. */
export function startServerHistorySampler(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  let running = false;
  const interval = setInterval(() => {
    // One sample at a time: a slow Docker socket must not stack writes up.
    if (running) return;
    running = true;
    takeSample()
      .catch((err) => logs.server.error('tech', 'historySampler', { error: err }))
      .finally(() => {
        running = false;
      });
  }, SAMPLE_MS);
  interval.unref?.();
  return () => clearInterval(interval);
}
