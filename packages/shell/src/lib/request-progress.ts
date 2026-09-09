/**
 * How many GraphQL requests this console has out right now.
 *
 * Counted at the transport rather than in a link: `createApolloClient` stacks a
 * retry link over the HTTP link, so a link-level count would report one
 * operation while three attempts were actually in the air, and a request the
 * cache answered would be counted as a wait that never happened. `fetch` is the
 * one place where "a request is out" is literally true — and it counts the
 * retries, the file-manager uploads and anything else routed through the same
 * transport for free.
 */
let inFlight = 0;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

/** `useSyncExternalStore` subscribe half. */
export function subscribeRequests(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** `useSyncExternalStore` snapshot half — a plain number, so it compares by value. */
export function getInFlightRequests(): number {
  return inFlight;
}

/**
 * `fetch` with the counter around it, for `HttpLink({ fetch })`.
 *
 * The decrement runs on both outcomes, so a failed or aborted request releases
 * the bar exactly like a successful one — a progress indicator that only clears
 * on success is a progress indicator that eventually sticks forever.
 */
export const trackingFetch: typeof fetch = (input, init) => {
  inFlight += 1;
  emit();
  const done = () => {
    inFlight -= 1;
    emit();
  };
  return globalThis.fetch(input, init).then(
    (response) => {
      done();
      return response;
    },
    (error: unknown) => {
      done();
      throw error;
    },
  );
};
