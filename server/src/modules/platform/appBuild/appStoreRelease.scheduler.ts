/**
 * The timer behind App Store pushes.
 *
 * A push outlives any request: the upload takes a minute, Apple's processing
 * takes ten to thirty more, and the server may be redeployed in between. The
 * row carries every id the push collected, and this tick hands any push nobody
 * has touched lately back to the state machine, which carries on from the step
 * it recorded. Same one-minute tick as every other scheduler here.
 */
import { startClusterJob } from '@utils/clusterJob';
import { resumeAppStoreReleases } from './appStoreRelease.service';

const TICK_MS = 60_000;
const FIRST_TICK_DELAY_MS = 90_000;

/** Start the scheduler. Returns a stop function. No-op under NODE_ENV=test. */
export function startAppStoreReleaseScheduler(): () => void {
  return startClusterJob({
    component: 'appBuild',
    operation: 'appStoreScheduler',
    firstDelayMs: FIRST_TICK_DELAY_MS,
    intervalMs: TICK_MS,
    run: resumeAppStoreReleases,
  });
}
