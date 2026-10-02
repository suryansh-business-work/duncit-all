/**
 * The clock behind Tech → App Builds → Releases.
 *
 * A rejection must reach people whether or not anyone opens the page, so this
 * reads App Store Connect on its own every half hour, opens an issue for each
 * newly rejected or awaiting version (advice + mail + Slack), and re-raises
 * every issue still open past the configured reminder window.
 *
 * No-ops under NODE_ENV=test.
 */
import { startClusterJob } from '@utils/clusterJob';
import { pollStoreReleases } from './storeRelease.service';

const TICK_MS = 30 * 60_000;
const FIRST_TICK_DELAY_MS = 3 * 60_000;

export function startStoreReleaseScheduler(): () => void {
  return startClusterJob({
    component: 'appBuild',
    operation: 'releaseScheduler',
    firstDelayMs: FIRST_TICK_DELAY_MS,
    intervalMs: TICK_MS,
    run: pollStoreReleases,
  });
}
