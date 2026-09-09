import { useSyncExternalStore } from 'react';
import { TopProgressBar } from '@duncit/ui';
import { getInFlightRequests, subscribeRequests } from '../lib/request-progress';

/**
 * The console-wide loading bar, mounted once by `mountPortal`.
 *
 * Every portal action is a GraphQL round trip, and no screen can be relied on
 * to have wired a spinner to its own: this is the floor under all of them, and
 * it covers the login page and the boot sequence too, which sit outside the
 * `AppShell` chrome entirely.
 *
 * It is deliberately the whole of what this component knows — the counter is
 * the transport's, the appear/linger timing is the bar's.
 */
export function GlobalProgress() {
  const inFlight = useSyncExternalStore(subscribeRequests, getInFlightRequests, getInFlightRequests);
  return <TopProgressBar busy={inFlight > 0} />;
}
