import { logs } from '@observability/log';
import { sweepStaleTracking } from './shiprocket.tracking';

/**
 * The tracking fallback: every two hours, pull ShipRocket's tracking for any
 * open shipment (or return pickup) the webhook has not updated in six. With
 * the webhook registered this mostly finds nothing; without it, it is what
 * keeps orders moving.
 */
const INTERVAL_MS = 2 * 3_600_000;
const FIRST_RUN_DELAY_MS = 5 * 60 * 1000;

let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const pulled = await sweepStaleTracking();
    if (pulled > 0) logs.server.info('shiprocket', 'trackingSweep', { pulled });
  } catch (error) {
    logs.server.error('shiprocket', 'trackingSweep', { error, msg: 'tracking sweep failed' });
  } finally {
    running = false;
  }
}

/** Start the sweep. No-ops under NODE_ENV=test. */
export function startShiprocketScheduler(): void {
  if (process.env.NODE_ENV === 'test') return;
  const run = () => {
    tick().catch((error) => logs.server.error('shiprocket', 'trackingSweep', { error }));
  };
  const first = setTimeout(run, FIRST_RUN_DELAY_MS);
  const interval = setInterval(run, INTERVAL_MS);
  first.unref?.();
  interval.unref?.();
}
