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
import { logs } from '@observability/log';
import { pollStoreReleases } from './storeRelease.service';

const TICK_MS = 30 * 60_000;
const FIRST_TICK_DELAY_MS = 3 * 60_000;

export function startStoreReleaseScheduler(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  let running = false;
  const tick = () => {
    if (running) return;
    running = true;
    pollStoreReleases()
      .catch((err) => {
        logs.server.error('appBuild', 'releaseScheduler', { error: err, msg: 'tick failed' });
      })
      .finally(() => {
        running = false;
      });
  };
  const first = setTimeout(tick, FIRST_TICK_DELAY_MS);
  const interval = setInterval(tick, TICK_MS);
  first.unref?.();
  interval.unref?.();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}
