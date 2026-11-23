/**
 * The clock behind Analytics → App Insights.
 *
 * Ticks hourly and syncs each configured store whose last success is a day
 * old (an hour after a failure), so the dashboard holds the stores' latest
 * published day without anyone pressing Sync now. The stores publish their
 * reports once a day, so syncing more often would only spend API quota.
 *
 * No-ops under NODE_ENV=test (startClusterJob).
 */
import { startClusterJob } from '@utils/clusterJob';
import { scheduledSync } from './appInsights.sync';

const TICK_MS = 60 * 60_000;
const FIRST_TICK_DELAY_MS = 4 * 60_000;

export function startAppInsightsScheduler(): () => void {
  return startClusterJob({
    component: 'appInsights',
    operation: 'scheduledSync',
    firstDelayMs: FIRST_TICK_DELAY_MS,
    intervalMs: TICK_MS,
    run: () => scheduledSync(),
  });
}
