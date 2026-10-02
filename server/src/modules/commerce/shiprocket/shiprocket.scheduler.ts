import { logs } from '@observability/log';
import { startClusterJob } from '@utils/clusterJob';
import { sweepStaleTracking } from './shiprocket.tracking';

/**
 * The tracking fallback: every two hours, pull ShipRocket's tracking for any
 * open shipment (or return pickup) the webhook has not updated in six. With
 * the webhook registered this mostly finds nothing; without it, it is what
 * keeps orders moving.
 */
const INTERVAL_MS = 2 * 3_600_000;
const FIRST_RUN_DELAY_MS = 5 * 60 * 1000;

/** Start the sweep. No-ops under NODE_ENV=test. */
export function startShiprocketScheduler(): void {
  startClusterJob({
    component: 'shiprocket',
    operation: 'trackingSweep',
    firstDelayMs: FIRST_RUN_DELAY_MS,
    intervalMs: INTERVAL_MS,
    run: async () => {
      const pulled = await sweepStaleTracking();
      if (pulled > 0) logs.server.info('shiprocket', 'trackingSweep', { pulled });
    },
  });
}
