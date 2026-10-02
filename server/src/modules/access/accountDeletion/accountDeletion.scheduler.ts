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
import { startClusterJob } from '@utils/clusterJob';
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
  // runIfDue already contains the per-account failures; the job only catches the
  // run itself falling over.
  return startClusterJob({
    component: 'account-deletion',
    operation: 'scheduler-tick',
    firstDelayMs: FIRST_TICK_DELAY_MS,
    intervalMs: TICK_MS,
    run: () => accountDeletionCron.runIfDue(),
  });
}
