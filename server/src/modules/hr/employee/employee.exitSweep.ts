import { startClusterJob } from '@utils/clusterJob';
import { lifecycleService } from './employee.lifecycle';

const SWEEP_INTERVAL_MS = 60 * 60_000;
const FIRST_SWEEP_DELAY_MS = 7 * 60_000;

/**
 * Hourly, on the scheduler leader: everyone whose notice period ended before
 * today (in the admin's time zone) becomes EXITED and loses the Employee
 * console. Hourly rather than at midnight so a server that was down at
 * midnight still closes the day's exits soon after it is back.
 */
export function startHrExitSweepScheduler(): () => void {
  return startClusterJob({
    component: 'hr-exit-sweep',
    operation: 'sweep',
    firstDelayMs: FIRST_SWEEP_DELAY_MS,
    intervalMs: SWEEP_INTERVAL_MS,
    run: () => lifecycleService.closeEndedNotices(),
  });
}
