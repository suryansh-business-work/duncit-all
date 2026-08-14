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
 * `fetch` that never fails as just "fetch failed".
 *
 * The thrown message is the human one; the undici detail rides along in
 * `extensions.reason` so a log or the Tech portal's Error Logs still has the
 * exact code without putting it in front of a person.
 */
export async function outboundFetch(
  service: string,
  url: string,
  init?: RequestInit
): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    const fallback = err instanceof Error ? err.message : String(err);
    const detail = describeFetchFailure(err) ?? fallback;
    throw new GraphQLError(humanFetchMessage(service, err) ?? `${service} is unreachable (${detail})`, {
      extensions: { code: 'BAD_GATEWAY', service, reason: detail },
    });
  }
}
