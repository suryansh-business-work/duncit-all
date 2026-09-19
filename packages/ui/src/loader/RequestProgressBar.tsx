import { useSyncExternalStore } from 'react';
import { getInFlightRequests, subscribeRequests } from './request-progress';
import { TopProgressBar } from './TopProgressBar';

/**
 * The surface-wide loading bar, mounted once per app.
 *
 * Every action is a GraphQL round trip, and no screen can be relied on to have
 * wired a spinner to its own: this is the floor under all of them, and it covers
 * a login page and the boot sequence too, which sit outside any page chrome.
 * It only reports requests made through `trackingFetch` — hand that to the
 * Apollo `HttpLink` and nothing else has to opt in.
 *
 * It is deliberately the whole of what this component knows — the counter is
 * the transport's, the appear/linger timing is the bar's.
 */
export function RequestProgressBar() {
  const inFlight = useSyncExternalStore(subscribeRequests, getInFlightRequests, getInFlightRequests);
  return <TopProgressBar busy={inFlight > 0} />;
}
