/**
 * `fetch` with a deadline, for Apollo's HttpLink.
 *
 * mWeb had no request timeout at all: a query the server never answered left
 * the spinner turning forever, with no error to report and nothing for the user
 * to act on. The native app has always had one — this is its web twin, so both
 * surfaces fail the same way (rule 27) instead of one failing silently.
 *
 * The deadline is generous on purpose. It is not a performance budget; it is
 * the point past which no answer is coming, and cutting a slow-but-working
 * checkout short would be worse than the wait.
 */
const DEFAULT_TIMEOUT_MS = 30_000;

const timeoutMs = Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

export function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  // Apollo passes its own signal when a query is cancelled (component
  // unmounted, request superseded). Honour it as well as ours, so cancelling
  // still works rather than being replaced by the deadline. A signal that has
  // ALREADY fired never emits the event, so it is checked as well as listened
  // for — otherwise a cancelled operation would still hit the network.
  const upstream = init?.signal;
  if (upstream?.aborted) {
    controller.abort();
  } else {
    upstream?.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return globalThis
    .fetch(input, { ...init, signal: controller.signal })
    .finally(() => globalThis.clearTimeout(timer));
}
