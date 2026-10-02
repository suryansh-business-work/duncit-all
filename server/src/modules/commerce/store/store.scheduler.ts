import { logs } from '@observability/log';
import { startClusterJob } from '@utils/clusterJob';
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

/** Both halves run every tick: a failed back-in-stock pass must not hold up
 * the Autoship cycles, so each catches its own failure. */
async function tick() {
  try {
    const sent = await storeAdminCatalogService.sendBackInStock();
    if (sent > 0) logs.server.info('store', 'backInStock', { sent });
  } catch (error) {
    logs.server.error('store', 'backInStock', { error, msg: 'back-in-stock sweep failed' });
  }
  const cycles = await storeAutoshipService.runDue();
  if (cycles > 0) logs.server.info('store', 'autoship', { cycles });
}

/** Start the sweep. No-ops under NODE_ENV=test. */
export function startStoreScheduler(): void {
  startClusterJob({
    component: 'store',
    operation: 'autoship',
    firstDelayMs: FIRST_RUN_DELAY_MS,
    intervalMs: INTERVAL_MS,
    run: tick,
  });
}
