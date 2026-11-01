import { makeDeviceId } from '../device';
import { SESSION_TIMEOUT_MS } from './taxonomy';

/**
 * The app session, cut on the device: a new one at launch, and again on the
 * first activity after `timeoutMs` without any. Every event carries the id, so
 * the server never has to guess where one session ends and the next begins.
 */
export interface SessionClock {
  /** Records activity at `at` (epoch ms); answers the session it belongs to and whether it just began. */
  touch(at: number): { id: string; started: boolean };
}

export function createSessionClock({
  timeoutMs = SESSION_TIMEOUT_MS,
  newId = makeDeviceId,
}: { timeoutMs?: number; newId?: () => string } = {}): SessionClock {
  let id: string | null = null;
  let last = 0;
  return {
    touch(at) {
      if (id === null || at - last > timeoutMs) {
        id = newId();
        last = at;
        return { id, started: true };
      }
      last = Math.max(last, at);
      return { id, started: false };
    },
  };
}
