/**
 * The clocks behind Marketing → Social Accounts.
 *
 * - SYNC, every fifteen minutes: each account is read at most once every few
 *   hours (SYNC_EVERY_MS), because the networks' read quotas — X's
 *   especially — are what a tighter loop would spend first. "Sync now" on the
 *   page covers the moment someone wants fresher numbers.
 * - PUBLISH, every minute: send every scheduled post whose time has come, and
 *   close out any a restart left half-sent.
 *
 * Each loop runs one pass at a time. No-ops under NODE_ENV=test.
 */
import { startClusterJob } from '@utils/clusterJob';
import { syncDueAccounts } from './social.sync';
import { publishDue, recoverStuckPosts } from './social.publisher';

const SYNC_TICK_MS = 15 * 60_000;
/** Let the server settle after boot before calling out to four networks. */
const SYNC_FIRST_DELAY_MS = 180_000;
const PUBLISH_TICK_MS = 60_000;
const PUBLISH_FIRST_DELAY_MS = 30_000;
const COMPONENT = 'social-accounts-scheduler';

async function publishPass(): Promise<void> {
  await recoverStuckPosts();
  await publishDue();
}

export function startSocialAccountsScheduler(): () => void {
  const stopSync = startClusterJob({
    component: COMPONENT,
    operation: 'sync',
    firstDelayMs: SYNC_FIRST_DELAY_MS,
    intervalMs: SYNC_TICK_MS,
    run: syncDueAccounts,
  });
  const stopPublish = startClusterJob({
    component: COMPONENT,
    operation: 'publish',
    firstDelayMs: PUBLISH_FIRST_DELAY_MS,
    intervalMs: PUBLISH_TICK_MS,
    run: publishPass,
  });
  return () => {
    stopSync();
    stopPublish();
  };
}
