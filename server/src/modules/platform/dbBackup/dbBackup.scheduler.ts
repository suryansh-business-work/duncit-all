/**
 * The cron behind scheduled database backups.
 *
 * A one-minute tick rather than a cron expression, matching every other
 * scheduler here (status, telemetry-cleanup, pod-draft). The schedule itself is
 * admin-configured — Tech > Database > Backups — and the whole decision lives
 * in dbBackupService.runIfDue, so this file stays a timer and the awkward
 * questions (has the window passed, did the last run already cover it, is the
 * server catching up after being down) are answered in code that is testable
 * without one.
 *
 * A minute is fine granularity for a daily job and keeps the catch-up honest:
 * a server that boots at 03:14 having missed a 03:00 window runs within the
 * minute rather than waiting a day. No-ops under NODE_ENV=test.
 */
import { logs } from '@observability/log';
import { dbBackupService } from './dbBackup.service';

const TICK_MS = 60_000;
const FIRST_TICK_DELAY_MS = 90_000;

/**
 * Start the backup scheduler. Returns a stop function.
 *
 * The first tick waits a minute and a half: a restore or a backup interrupted
 * by the restart is repaired by its own stale-heartbeat check on first read,
 * and starting a fresh walk into a server still opening its connections buys
 * nothing.
 */
export function startDbBackupScheduler(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  const tick = () => {
    // The interval must survive any failure (disk, DB, a bad setting).
    dbBackupService.runIfDue().catch((err) => {
      logs.server.error('db-backup-scheduler', 'tick', { error: err, msg: 'tick failed' });
    });
  };
  const first = setTimeout(tick, FIRST_TICK_DELAY_MS);
  const interval = setInterval(tick, TICK_MS);
  // Never keep the process alive just for the backup timer.
  first.unref?.();
  interval.unref?.();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}
