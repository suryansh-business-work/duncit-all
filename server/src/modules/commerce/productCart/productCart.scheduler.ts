import { logs } from '@observability/log';
import { startClusterJob } from '@utils/clusterJob';
import { productCartService } from './productCart.service';

/**
 * The cart reminder email sweep, every 15 minutes. Timing lives in Products
 * portal > Cart > Cart Settings and is read on every run, so a change there
 * applies from the next tick. Fine-grained enough for hour-based settings.
 */
const INTERVAL_MS = 15 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 3 * 60 * 1000;

async function tick() {
  const sent = await productCartService.runReminderSweep();
  if (sent > 0) logs.server.info('product-cart', 'reminder', { sent });
}

/** Start the sweep. Returns a stop function; no-ops under NODE_ENV=test. */
export function startProductCartReminderScheduler(): () => void {
  return startClusterJob({
    component: 'product-cart',
    operation: 'reminder',
    firstDelayMs: FIRST_RUN_DELAY_MS,
    intervalMs: INTERVAL_MS,
    run: tick,
  });
}
