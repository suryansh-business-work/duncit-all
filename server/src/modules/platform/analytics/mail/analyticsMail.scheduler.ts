/**
 * The clock behind Analytics > Settings > Analytics Mails.
 *
 * A one-minute tick, like every other scheduler here (backups, E2E, account
 * deletion). What is due is decided in analyticsMailService.runIfDue, so this
 * file stays a timer. A server that was down through the send time sends as
 * soon as it is back — a late report is still a report.
 *
 * No-ops under NODE_ENV=test.
 */
import { logs } from '@observability/log';
import { analyticsMailService } from './analyticsMail.service';

const TICK_MS = 60_000;
/** A report is a dozen dashboard reads; they wait until the server has settled after boot. */
const FIRST_TICK_DELAY_MS = 180_000;

export function startAnalyticsMailScheduler(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  let running = false;
  const tick = () => {
    // A run with many subscribers can outlast a minute; the next tick waits for it.
    if (running) return;
    running = true;
    analyticsMailService
      .runIfDue()
      .catch((err) => {
        logs.server.error('analytics-mail-scheduler', 'tick', { error: err, msg: 'tick failed' });
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
