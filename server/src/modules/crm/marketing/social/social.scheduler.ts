/**
 * The clocks behind Marketing → Social Accounts.
 *
 * - SYNC, every fifteen minutes: each account is read at most once every few
 *   hours (SYNC_EVERY_MS), because the networks' read quotas — X's
 *   especially — are what a tighter loop would spend first. "Sync now" on the
 *   page covers the moment someone wants fresher numbers. Its first pass also
 *   seals any token still stored in the clear (social.tokens.ts), so an
 *   upgrade needs no separate migration step.
 * - PUBLISH, every minute: send every scheduled post whose time has come, and
 *   close out any a restart left half-sent.
 * - HEALTH, daily: one profile read per account, and a reminder to the owner
 *   when a token has a week or less to live.
 *
 * Each loop runs one pass at a time. No-ops under NODE_ENV=test.
 */
import { logs } from '@observability/log';
import { startClusterJob } from '@utils/clusterJob';
import { syncDueAccounts } from './social.sync';
import { publishDue, recoverStuckPosts } from './social.publisher';
import { runHealthChecks } from './social.health';
import { sealLegacyTokens } from './social.tokens';

const SYNC_TICK_MS = 15 * 60_000;
/** Let the server settle after boot before calling out to four networks. */
const SYNC_FIRST_DELAY_MS = 180_000;
const PUBLISH_TICK_MS = 60_000;
const PUBLISH_FIRST_DELAY_MS = 30_000;
const HEALTH_TICK_MS = 24 * 60 * 60_000;
const HEALTH_FIRST_DELAY_MS = 10 * 60_000;
const COMPONENT = 'social-accounts-scheduler';

async function publishPass(): Promise<void> {
  await recoverStuckPosts();
  await publishDue();
}

/** Sealing runs once per process, before the first sync; a failed attempt is retried on the next tick and never blocks the sync. */
function syncPassWithSealing(): () => Promise<void> {
  let sealed = false;
  return async () => {
    if (!sealed) {
      try {
        await sealLegacyTokens();
        sealed = true;
      } catch (error) {
        logs.server.error(COMPONENT, 'sealLegacyTokens', { error, msg: 'sealing stored social tokens failed' });
      }
    }
    await syncDueAccounts();
  };
}

export function startSocialAccountsScheduler(): () => void {
  const stopSync = startClusterJob({
    component: COMPONENT,
    operation: 'sync',
    firstDelayMs: SYNC_FIRST_DELAY_MS,
    intervalMs: SYNC_TICK_MS,
    run: syncPassWithSealing(),
  });
  const stopPublish = startClusterJob({
    component: COMPONENT,
    operation: 'publish',
    firstDelayMs: PUBLISH_FIRST_DELAY_MS,
    intervalMs: PUBLISH_TICK_MS,
    run: publishPass,
  });
  const stopHealth = startClusterJob({
    component: COMPONENT,
    operation: 'health',
    firstDelayMs: HEALTH_FIRST_DELAY_MS,
    intervalMs: HEALTH_TICK_MS,
    run: runHealthChecks,
  });
  return () => {
    stopSync();
    stopPublish();
    stopHealth();
  };
}
