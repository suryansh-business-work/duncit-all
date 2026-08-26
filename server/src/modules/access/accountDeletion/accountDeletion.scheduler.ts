/**
 * The timer behind the scheduled account-deletion sweep.
 *
 * A one-minute tick rather than a cron expression, matching every other
 * scheduler here (status, telemetry-cleanup, pod-draft, db-backup). The
 * schedule itself is admin-configured — Admin Panel > Settings > Account
 * deletion — and the whole decision lives in `accountDeletionCron.runIfDue`, so
 * this file stays a timer and the awkward questions (has the window passed, did
 * another process already take this run, is the server catching up after being
 * down) are answered in code that is testable without one.
 *
 * A minute is fine granularity for a nightly job and keeps the catch-up honest:
 * a server that boots at 03:14 having missed a 03:00 window runs within the
 * minute rather than waiting a day — which matters more here than for a backup,
 * because every day skipped is a day past a date a member was promised.
 * No-ops under NODE_ENV=test.
 */
import { logs } from '@observability/log';
import { accountDeletionCron } from './accountDeletion.cron';

const TICK_MS = 60_000;
const FIRST_TICK_DELAY_MS = 120_000;

/**
 * Start the sweep scheduler. Returns a stop function.
 *
 * The first tick waits two minutes — longer than the backup's — on purpose.
 * This job deletes accounts, and the seal map it depends on is loaded during
 * boot; starting a purge into a server still opening its connections buys
 * nothing and risks doing irreversible work with a half-warm process.
 */
export function startAccountDeletionScheduler(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  const tick = () => {
    // The interval must survive any failure (a bad setting, a database blip, a
    // single account that cannot be purged). runIfDue already contains the
    // per-account failures; this only catches the run itself falling over.
    accountDeletionCron.runIfDue().catch((error) => {
      logs.server.error('account-deletion', 'scheduler-tick', { error });
    });
  };
  const first = setTimeout(tick, FIRST_TICK_DELAY_MS);
  const interval = setInterval(tick, TICK_MS);
  // Never keep the process alive just for this timer.
  first.unref?.();
  interval.unref?.();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}
