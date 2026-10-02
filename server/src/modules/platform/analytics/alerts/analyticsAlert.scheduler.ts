/**
 * The clock behind Analytics > Settings > Alerts.
 *
 * A five-minute tick; each alert is read at most once an hour (see
 * checkDueAlerts), so a server that restarts does not re-read every tile.
 *
 * No-ops under NODE_ENV=test.
 */
import { startClusterJob } from '@utils/clusterJob';
import { checkDueAlerts } from './analyticsAlert.check';

const TICK_MS = 5 * 60_000;
/** Alerts read whole dashboards; they wait until the server has settled after boot. */
const FIRST_TICK_DELAY_MS = 240_000;

export function startAnalyticsAlertScheduler(): () => void {
  return startClusterJob({
    component: 'analytics-alert-scheduler',
    operation: 'tick',
    firstDelayMs: FIRST_TICK_DELAY_MS,
    intervalMs: TICK_MS,
    run: checkDueAlerts,
  });
}
