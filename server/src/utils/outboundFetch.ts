import { GraphQLError } from 'graphql';

/**
 * Outbound HTTP whose failures say what actually broke.
 *
 * Node's fetch (undici) reports every transport failure — DNS, refused
 * connection, TLS handshake, connect timeout — as the same bare
 * `TypeError: fetch failed`, with the real reason buried in `error.cause`.
 * Anything that logs or shows `err.message` therefore surfaces two useless
 * words. These helpers read the cause chain so the actual reason survives
 * into logs and GraphQL errors.
 */

/** True for the errors undici throws when the request never completed. */
function isTransportError(err: unknown): err is Error {
  return err instanceof Error && (err.message === 'fetch failed' || err.message === 'terminated');
}

/** Message with its errno visible — "ENOTFOUND: getaddrinfo failed" style. */
function errorText(err: Error): string | null {
  const code = (err as NodeJS.ErrnoException).code;
  const message = err.message.trim();
  if (code && message && !message.includes(code)) return `${code}: ${message}`;
  return message || code || null;
}

/** The most specific message in a cause chain, deepest cause first. */
function causeDetail(cause: unknown): string | null {
  if (cause instanceof AggregateError && cause.errors.length > 0) {
    // A multi-address connect (IPv4 + IPv6) fails as an AggregateError whose
    // parts carry the errno; the aggregate's own message is usually empty.
    return causeDetail(cause.errors[0]) ?? errorText(cause);
  }
  if (cause instanceof Error) {
    return causeDetail(cause.cause) ?? errorText(cause);
  }
  if (typeof cause === 'string' && cause.trim()) return cause.trim();
  return null;
}

/**
 * The real reason a `fetch` threw, or null when the error is not a transport
 * failure (an abort, a programming error) and should keep its own message.
 */
export function describeFetchFailure(err: unknown): string | null {
  if (!isTransportError(err)) return null;
  return causeDetail(err.cause) ?? 'network error';
}

/**
 * The same failures, said in words.
 *
 * `UND_ERR_CONNECT_TIMEOUT: Connect Timeout Error (attempted address:
 * images.pexels.com:443, timeout: 10000ms)` is the truth and it belongs in the
 * log — but it is not an answer for somebody who pressed Upload. Each of these
 * has exactly one thing the reader can do about it, and the phrasing is chosen
 * to make that obvious: a timeout is worth retrying, a refused connection is
 * not.
 */
const HUMAN_REASONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/CONNECT_TIMEOUT|HEADERS_TIMEOUT|BODY_TIMEOUT|ETIMEDOUT|TIMEOUT/i, 'did not respond in time'],
  [/ENOTFOUND|EAI_AGAIN|DNS/i, 'could not be found'],
  [/ECONNREFUSED/i, 'refused the connection'],
  [/ECONNRESET|SOCKET|ABORT|TERMINATED/i, 'closed the connection early'],
  [/CERT|TLS|SSL|SELF_SIGNED/i, 'has a security certificate the server would not accept'],
];

/** Which of the reasons above a transport error is, or null when it is none. */
export function humanFetchReason(err: unknown): string | null {
  const detail = describeFetchFailure(err);
  if (!detail) return null;
  for (const [pattern, reason] of HUMAN_REASONS) {
    if (pattern.test(detail)) return reason;
  }
  return 'could not be reached';
}

/**
 * A sentence about one failed outbound call, addressed to whoever is looking
 * at the screen. `retryable` decides whether "Please try again" is honest
 * advice or a lie — a refused connection will refuse the next one too.
 */
export function humanFetchMessage(service: string, err: unknown): string | null {
  const reason = humanFetchReason(err);
  if (!reason) return null;
  const retryable = reason === 'did not respond in time' || reason === 'closed the connection early';
  return `${service} ${reason}.${retryable ? ' Please try again.' : ''}`;
}

/**
 * Failures where the request provably never reached the far end: the socket was
 * never opened, so nothing was delivered and nothing was acted on.
 *
 * That is what makes retrying these safe for a POST as well as a GET — an upload
 * that never connected cannot have half-uploaded. Deliberately absent:
 * ECONNRESET, socket errors and read timeouts, any of which can strike after the
 * body went out, where a retry would mean doing the thing twice.
 */
const NEVER_DELIVERED_CODES = ['UND_ERR_CONNECT_TIMEOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'];

/** One extra attempt. A third adds latency to an outage without curing it. */
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 300;

/** Whether the connection was never established, so a retry repeats nothing. */
function neverDelivered(err: unknown): boolean {
  const detail = describeFetchFailure(err);
  return !!detail && NEVER_DELIVERED_CODES.some((code) => detail.includes(code));
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `fetch` that never fails as just "fetch failed".
 *
 * The thrown message is the human one; the undici detail rides along in
 * `extensions.reason` so a log or the Tech portal's Error Logs still has the
 * exact code without putting it in front of a person.
 *
 * A connect that never landed is tried once more. Third-party hosts (ImageKit,
 * Pexels) drop the occasional handshake and undici gives up after 10s with
 * UND_ERR_CONNECT_TIMEOUT — which reached the person as a failed import of a
 * stock photo that would have worked a second later.
 */
export async function outboundFetch(
  service: string,
  url: string,
  init?: RequestInit
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastError = err;
      if (attempt === MAX_ATTEMPTS || !neverDelivered(err)) break;
      await wait(RETRY_DELAY_MS);
    }
  }
  const fallback = lastError instanceof Error ? lastError.message : String(lastError);
  const detail = describeFetchFailure(lastError) ?? fallback;
  throw new GraphQLError(
    humanFetchMessage(service, lastError) ?? `${service} is unreachable (${detail})`,
    { extensions: { code: 'BAD_GATEWAY', service, reason: detail } }
  );
}
