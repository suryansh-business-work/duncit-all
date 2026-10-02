/**
 * The retention limit on usage analytics (GDPR storage limitation).
 *
 * Clickstream events and daily-active pings used to be kept forever. They are
 * now kept for 13 months — long enough to compare a month with the same month
 * last year, which is the longest comparison the dashboards draw — and swept
 * once a day, the same shape as the short-link click sweep.
 *
 * A sweep rather than a TTL index: `occurred_at` already carries a plain
 * index, and swapping it for a TTL one is an index rebuild over the whole
 * collection on every server that boots this code.
 *
 * No-ops under NODE_ENV=test.
 */
import { logs } from '@observability/log';
import { startClusterJob } from '@utils/clusterJob';
import { ActiveUserPingModel } from './activeUser.model';
import { AppEventModel } from './appEvent.model';

export const ANALYTICS_RETENTION_DAYS = 395;

const DAY_MS = 24 * 60 * 60_000;
/** Let the server finish booting before the first sweep. */
const FIRST_DELAY_MS = 15 * 60_000;

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export async function purgeExpiredAnalytics(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - ANALYTICS_RETENTION_DAYS * DAY_MS);
  const [events, pings] = await Promise.all([
    AppEventModel.deleteMany({ occurred_at: { $lt: cutoff } }),
    // Pings are keyed by a YYYY-MM-DD string, which sorts like the date it is.
    ActiveUserPingModel.deleteMany({ date_ymd: { $lt: ymd(cutoff) } }),
  ]);
  return events.deletedCount + pings.deletedCount;
}

async function sweep(): Promise<void> {
  const removed = await purgeExpiredAnalytics();
  if (removed > 0) {
    logs.server.info('analytics', 'retentionSweep', {
      removed,
      msg: `Deleted ${removed} analytics rows past their retention window`,
    });
  }
}

export function startAnalyticsRetentionScheduler(): () => void {
  return startClusterJob({
    component: 'analytics',
    operation: 'retentionSweep',
    firstDelayMs: FIRST_DELAY_MS,
    intervalMs: DAY_MS,
    run: sweep,
  });
}
