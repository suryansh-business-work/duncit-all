/**
 * Daily retention sweep for recorded rate-limit breaches.
 *
 * Deletes everything past the admin window (Tech > Rate Limiting > Settings;
 * default 7 days, hard-capped 90). The 90-day TTL index on the collection is
 * the safety net if this never runs. Idempotent, fault-tolerant, and a no-op
 * under NODE_ENV=test — the same shape as the telemetry sweep beside it.
 */
import { logs } from '@observability/log';
import { startClusterJob } from '@utils/clusterJob';
import { rateLimitService } from './rateLimit.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const FIRST_SWEEP_DELAY_MS = 90_000;

/** Start the daily sweep. Returns a stop function. */
export function startRateLimitCleanupScheduler(): () => void {
  return startClusterJob({
    component: 'rateLimit',
    operation: 'cleanup',
    firstDelayMs: FIRST_SWEEP_DELAY_MS,
    intervalMs: DAY_MS,
    run: async () => {
      const deleted = await rateLimitService.purgeOldEvents();
      if (deleted > 0) logs.server.info('rateLimit', 'cleanup', { deleted });
    },
  });
}
