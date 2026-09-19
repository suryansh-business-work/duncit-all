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
import { logs } from '@observability/log';
import { syncDueAccounts } from './social.sync';
import { publishDue, recoverStuckPosts } from './social.publisher';

const SYNC_TICK_MS = 15 * 60_000;
/** Let the server settle after boot before calling out to four networks. */
const SYNC_FIRST_DELAY_MS = 180_000;
const PUBLISH_TICK_MS = 60_000;
const PUBLISH_FIRST_DELAY_MS = 30_000;

function every(name: string, tickMs: number, firstDelayMs: number, pass: () => Promise<void>): () => void {
  let running = false;
  const tick = () => {
    if (running) return;
    running = true;
    pass()
      .catch((err) => {
        logs.server.error('social-accounts-scheduler', name, { error: err, msg: `${name} tick failed` });
      })
      .finally(() => {
        running = false;
      });
  };
  const first = setTimeout(tick, firstDelayMs);
  const interval = setInterval(tick, tickMs);
  first.unref?.();
  interval.unref?.();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}

async function publishPass(): Promise<void> {
  await recoverStuckPosts();
  await publishDue();
}

export function startSocialAccountsScheduler(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  const stopSync = every('sync', SYNC_TICK_MS, SYNC_FIRST_DELAY_MS, syncDueAccounts);
  const stopPublish = every('publish', PUBLISH_TICK_MS, PUBLISH_FIRST_DELAY_MS, publishPass);
  return () => {
    stopSync();
    stopPublish();
  };
}
