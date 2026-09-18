import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';

/**
 * The one way a sign-in reaches an identity provider — Google's tokeninfo,
 * Apple's signing keys — with a hard timeout and a single retry.
 *
 * A raw network failure from `fetch` (DNS / connection / TLS / timeout)
 * otherwise reaches the client as an opaque "fetch failed" and can hang the
 * login. Every call made through here is an idempotent GET, so retrying the
 * transient case is safe; if it still fails the caller gets a clear, retryable
 * error naming the provider.
 *
 * Every attempt is logged. The client-facing message is deliberately vague, so
 * without these records a login that failed here is undiagnosable after the
 * fact — there is no way to tell a DNS blip from an eight-second stall.
 */

const UPSTREAM_TIMEOUT_MS = 8000;
const UPSTREAM_MAX_ATTEMPTS = 2; // initial try + one retry for transient blips
/*
  The blips this retry exists for — a DNS miss, a reset connection, a TLS
  handshake dropped mid-flight — fail in the same millisecond they were tried,
  so a second attempt fired immediately lands inside the same blip and buys
  nothing. A short gap is what makes the retry a retry.
*/
const UPSTREAM_RETRY_DELAY_MS = 300;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Why an attempt died, in the one word a log reader needs: the abort our own
 * timeout raised, the OS-level code undici hangs off `cause` (ENOTFOUND,
 * ECONNRESET, ETIMEDOUT, UND_ERR_*), or failing both, the error's name.
 */
function failureKind(err: unknown): string {
  if (err instanceof Error && err.name === 'AbortError') return 'timeout';
  if (!(err instanceof Error)) return 'unknown';
  const cause = err.cause as { code?: string } | undefined;
  return cause?.code ?? err.name;
}

export interface UpstreamTarget {
  /** The log event every attempt is recorded under, e.g. `google-tokeninfo`. */
  event: string;
  /** The provider as a person reads it — named in the error they are shown. */
  provider: string;
}

/** GET `url`, bounded and retried once. Throws UPSTREAM_UNAVAILABLE when both attempts fail. */
export async function fetchIdentityUpstream(url: string, target: UpstreamTarget): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= UPSTREAM_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      return await fetch(url, { signal: controller.signal });
    } catch (err) {
      lastError = err;
      logs.server.warn('auth', target.event, {
        error: err,
        kind: failureKind(err),
        attempt,
        attempts: UPSTREAM_MAX_ATTEMPTS,
      });
    } finally {
      clearTimeout(timer);
    }
    if (attempt < UPSTREAM_MAX_ATTEMPTS) await wait(UPSTREAM_RETRY_DELAY_MS);
  }
  logs.server.error('auth', target.event, {
    error: lastError,
    kind: failureKind(lastError),
    attempts: UPSTREAM_MAX_ATTEMPTS,
  });
  throw new GraphQLError(
    `Could not reach ${target.provider} to verify your sign-in. Please try again.`,
    {
      extensions: { code: 'UPSTREAM_UNAVAILABLE' },
      originalError: lastError instanceof Error ? lastError : undefined,
    }
  );
}
