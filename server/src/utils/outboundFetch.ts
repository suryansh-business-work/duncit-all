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
 * `fetch` that never fails as just "fetch failed": a transport error becomes
 * a BAD_GATEWAY GraphQLError naming the service and the underlying reason.
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
    throw new GraphQLError(`${service} is unreachable from the server (${detail})`, {
      extensions: { code: 'BAD_GATEWAY' },
    });
  }
}
