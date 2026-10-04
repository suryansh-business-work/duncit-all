import { logs } from '@observability/log';
import { startClusterJob } from '@utils/clusterJob';
import { runDueDeletions } from './catalogDeletion.executor';

/**
 * Brand/product deletion requests: every hour, carry out the approved ones
 * whose date has come and whose orders are all settled. Hourly is plenty for
 * dates picked in whole days, and soon enough after the last order delivers.
 */
const INTERVAL_MS = 60 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 5 * 60 * 1000;

async function tick() {
  const completed = await runDueDeletions();
  if (completed > 0) logs.server.info('catalog-deletion', 'run', { completed });
}

/** Start the sweep. Returns a stop function; no-ops under NODE_ENV=test. */
export function startCatalogDeletionScheduler(): () => void {
  return startClusterJob({
    component: 'catalog-deletion',
    operation: 'run',
    firstDelayMs: FIRST_RUN_DELAY_MS,
    intervalMs: INTERVAL_MS,
    run: tick,
  });
}
