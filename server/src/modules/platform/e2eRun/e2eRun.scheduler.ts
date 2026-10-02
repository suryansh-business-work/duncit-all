/**
 * The cron behind the nightly E2E run.
 *
 * A one-minute tick rather than a cron expression, matching every other
 * scheduler here (backups, status, telemetry-cleanup). The schedule itself is
 * admin-configured — Tech > E2E Tests > Settings — and the whole decision lives
 * in e2eRunService.runIfDue, so this file stays a timer and the awkward
 * questions (has the window passed, did something already run since, is the
 * server catching up after being down) are answered in code that is testable
 * without one.
 *
 * This is deliberately the ONLY schedule the suite has. The workflow declares
 * no `on: schedule` of its own, because a cron baked into a YAML file cannot be
 * changed from the portal and two schedules would mean two runs a night. The
 * cost is that a server which is down at 03:00 does not start the suite — the
 * catch-up in `isDue` runs it as soon as the server is back, which for a test
 * suite is the right trade.
 *
 * No-ops under NODE_ENV=test.
 */
import { startClusterJob } from '@utils/clusterJob';
import { e2eRunService } from './e2eRun.service';

const TICK_MS = 60_000;
const FIRST_TICK_DELAY_MS = 120_000;

/**
 * Start the E2E scheduler. Returns a stop function.
 *
 * The first tick waits two minutes: dispatching a workflow into a server that
 * is still opening its connections buys nothing, and a missed window is
 * picked up on the next tick anyway.
 */
export function startE2eRunScheduler(): () => void {
  return startClusterJob({
    component: 'e2e-scheduler',
    operation: 'tick',
    firstDelayMs: FIRST_TICK_DELAY_MS,
    intervalMs: TICK_MS,
    run: () => e2eRunService.runIfDue(),
  });
}
