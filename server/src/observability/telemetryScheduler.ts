/**
 * Daily retention sweep for persisted telemetry logs + rolled-up bugs. Deletes
 * everything past the admin-configured window (Tech > Telemetry Logs Settings;
 * default 30 days, hard-capped 90). Idempotent + fault-tolerant (the interval
 * survives any DB error), mirroring the pod-draft/status schedulers. No-ops
 * under NODE_ENV=test. The 90-day TTL index on TelemetryLog is the safety net.
 */
import { telemetryService } from '@modules/platform/telemetry/telemetry.service';
import { logs } from './log';

const DAY_MS = 24 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = DAY_MS;
const FIRST_SWEEP_DELAY_MS = 60_000;

/** Start the daily telemetry-cleanup loop (first sweep ~1 min after boot).
 * Returns a stop function. No-ops under NODE_ENV=test. */
export function startTelemetryCleanupScheduler(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  const sweep = () => {
    telemetryService.runTelemetryCleanup().catch((err) => {
      logs.server.error('telemetry-cleanup', 'sweep', { error: err, msg: 'sweep failed' });
    });
  };
  const first = setTimeout(sweep, FIRST_SWEEP_DELAY_MS);
  const interval = setInterval(sweep, SWEEP_INTERVAL_MS);
  first.unref?.();
  interval.unref?.();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}
