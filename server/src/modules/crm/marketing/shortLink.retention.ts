/**
 * The clock behind short-link data retention.
 *
 * A retention window is only a promise until something enforces it, and this
 * is the something: once a day, every click older than the admin-set window is
 * deleted. Daily rather than hourly because the window is measured in months —
 * a sweep that ran more often would only be deleting the same nothing again.
 *
 * Deliberately NOT a Mongo TTL index: the window is admin-configurable, and a
 * TTL index carries its expiry in the index definition, so every change would
 * mean rebuilding an index over the whole collection.
 *
 * No-ops under NODE_ENV=test.
 */
import { logs } from '@observability/log';
import { shortLinkPolicyService } from './shortLinkPolicy.service';

const TICK_MS = 24 * 60 * 60_000;
/** Let the server finish booting before the first sweep. */
const FIRST_DELAY_MS = 10 * 60_000;

async function sweep(): Promise<void> {
  const removed = await shortLinkPolicyService.purge();
  if (removed > 0) {
    logs.server.info('shortLink', 'retentionSweep', {
      removed,
      msg: `Deleted ${removed} short-link clicks past their retention window`,
    });
  }
}

export function startShortLinkRetentionScheduler(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  let running = false;
  const tick = () => {
    if (running) return;
    running = true;
    sweep()
      .catch((error) => {
        logs.server.error('shortLink', 'retentionSweep', { error });
      })
      .finally(() => {
        running = false;
      });
  };
  const first = setTimeout(tick, FIRST_DELAY_MS);
  const interval = setInterval(tick, TICK_MS);
  first.unref?.();
  interval.unref?.();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}
