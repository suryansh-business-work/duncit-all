import { logs } from '@observability/log';
import { storeAdminCatalogService } from './store.admin.catalog.service';
import { storeAutoshipService } from './store.autoship.service';

/**
 * The pet store's background sweep, every half hour: email the people who
 * asked to be told when a sold-out product came back (stock moves through many
 * doors — the products portal, a cancellation, a return — so a sweep is the one
 * place that never misses one), then book or remind every Autoship cycle due.
 */
const INTERVAL_MS = 30 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 2 * 60 * 1000;

let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const sent = await storeAdminCatalogService.sendBackInStock();
    if (sent > 0) logs.server.info('store', 'backInStock', { sent });
  } catch (error) {
    logs.server.error('store', 'backInStock', { error, msg: 'back-in-stock sweep failed' });
  }
  try {
    const cycles = await storeAutoshipService.runDue();
    if (cycles > 0) logs.server.info('store', 'autoship', { cycles });
  } catch (error) {
    logs.server.error('store', 'autoship', { error, msg: 'autoship sweep failed' });
  } finally {
    running = false;
  }
}

/** Start the sweep. No-ops under NODE_ENV=test. */
export function startStoreScheduler(): void {
  if (process.env.NODE_ENV === 'test') return;
  const run = () => {
    tick().catch((error) => logs.server.error('store', 'backInStock', { error }));
  };
  const first = setTimeout(run, FIRST_RUN_DELAY_MS);
  const interval = setInterval(run, INTERVAL_MS);
  first.unref?.();
  interval.unref?.();
}
