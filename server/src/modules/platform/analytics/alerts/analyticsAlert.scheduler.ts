/**
 * The clock behind Analytics > Settings > Alerts.
 *
 * A five-minute tick; each alert is read at most once an hour (see
 * checkDueAlerts), so a server that restarts does not re-read every tile.
 *
 * No-ops under NODE_ENV=test.
 */
import { logs } from '@observability/log';
import { checkDueAlerts } from './analyticsAlert.check';

const TICK_MS = 5 * 60_000;
/** Alerts read whole dashboards; they wait until the server has settled after boot. */
const FIRST_TICK_DELAY_MS = 240_000;

export function startAnalyticsAlertScheduler(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  let running = false;
  const tick = () => {
    if (running) return;
    running = true;
    checkDueAlerts()
      .catch((err) => {
        logs.server.error('analytics-alert-scheduler', 'tick', { error: err, msg: 'tick failed' });
      })
      .finally(() => {
        running = false;
      });
  };
  const first = setTimeout(tick, FIRST_TICK_DELAY_MS);
  const interval = setInterval(tick, TICK_MS);
  first.unref?.();
  interval.unref?.();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}
