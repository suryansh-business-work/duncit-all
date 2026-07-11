/**
 * Background scheduler that probes every catalog service (statusServices)
 * every 5 minutes and records one StatusCheck per service. The rows power the
 * status page's uptime percentages and latency/uptime charts.
 *
 * `prober` is injectable (same pattern as buildStatusProbeRouter) so the
 * sweep can be unit-tested without hitting the network.
 */
import { probe, type ProbeResult } from './statusProbe';
import { listStatusServices } from './statusServices';
import { StatusCheckModel } from './statusHistory.model';

const SWEEP_INTERVAL_MS = 5 * 60_000;
const FIRST_SWEEP_DELAY_MS = 10_000;

type Prober = (target: URL) => Promise<ProbeResult>;

export interface StatusSchedulerOptions {
  prober?: Prober;
}

/** Probe every monitored service once and persist the results. */
export async function runStatusSweep(prober: Prober = probe): Promise<number> {
  const services = listStatusServices();
  const checked_at = new Date();
  const docs = await Promise.all(
    services.map(async (service) => {
      const started = Date.now();
      let result: ProbeResult;
      try {
        result = await prober(new URL(service.probe ?? service.url));
      } catch (err) {
        // probe() resolves errors into the result, but a custom prober may throw.
        result = {
          url: service.probe ?? service.url,
          ok: false,
          statusCode: null,
          statusText: null,
          ssl: null,
          error: err instanceof Error ? err.message : 'Probe failed',
        };
      }
      const latency = Date.now() - started;
      return {
        service_key: service.key,
        ok: result.ok,
        status_code: result.statusCode,
        // Latency is only meaningful when the host actually answered.
        latency_ms: result.statusCode !== null ? latency : null,
        checked_at,
      };
    })
  );
  await StatusCheckModel.insertMany(docs, { ordered: false });
  return docs.length;
}

/**
 * Start the 5-minute probe loop (first sweep ~10s after boot). Returns a stop
 * function. No-ops under NODE_ENV=test — the caller also gates this, but the
 * guard here makes an accidental start in a test run impossible.
 */
export function startStatusScheduler(options: StatusSchedulerOptions = {}): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  const prober = options.prober ?? probe;
  const sweep = () => {
    // The interval must survive any failure (network, DB, catalog).
    runStatusSweep(prober).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[status-scheduler] sweep failed:', err);
    });
  };
  const first = setTimeout(sweep, FIRST_SWEEP_DELAY_MS);
  const interval = setInterval(sweep, SWEEP_INTERVAL_MS);
  // Never keep the process alive just for status sweeps.
  first.unref?.();
  interval.unref?.();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}
