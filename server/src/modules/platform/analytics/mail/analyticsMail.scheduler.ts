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
import { startClusterJob } from '@utils/clusterJob';
import { analyticsMailService } from './analyticsMail.service';

const TICK_MS = 60_000;
/** A report is a dozen dashboard reads; they wait until the server has settled after boot. */
const FIRST_TICK_DELAY_MS = 180_000;

export function startAnalyticsMailScheduler(): () => void {
  // A run with many subscribers can outlast a minute; the next tick waits for it.
  return startClusterJob({
    component: 'analytics-mail-scheduler',
    operation: 'tick',
    firstDelayMs: FIRST_TICK_DELAY_MS,
    intervalMs: TICK_MS,
    run: () => analyticsMailService.runIfDue(),
  });
}
