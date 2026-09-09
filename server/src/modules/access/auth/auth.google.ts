import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { getRuntimeEnvValue } from '@config/runtimeEnv';

interface GoogleTokenInfo {
  email: string;
  email_verified: boolean | string;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
  sub: string; // Google's stable user id
  aud: string;
}

const TOKENINFO_TIMEOUT_MS = 8000;
const TOKENINFO_MAX_ATTEMPTS = 2; // initial try + one retry for transient blips
/*
  The blips this retry exists for — a DNS miss, a reset connection, a TLS
  handshake dropped mid-flight — fail in the same millisecond they were tried,
  so a second attempt fired immediately lands inside the same blip and buys
  nothing. A short gap is what makes the retry a retry.
*/
const TOKENINFO_RETRY_DELAY_MS = 300;

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

/**
 * Fetch Google's tokeninfo with a hard timeout and a single retry. A raw
 * network failure from `fetch` (DNS / connection / TLS / timeout) otherwise
 * propagates to the client as an opaque "fetch failed" and can hang the login.
 * The request is an idempotent GET, so retrying the transient case is safe; if
 * it still fails we surface a clear, retryable error.
 *
 * Every attempt is logged. The client-facing message is deliberately vague, so
 * without these records a login that failed here is undiagnosable after the
 * fact — there is no way to tell a DNS blip from an eight-second Google stall.
 */
async function fetchGoogleTokenInfo(url: string): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= TOKENINFO_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TOKENINFO_TIMEOUT_MS);
    try {
      return await fetch(url, { signal: controller.signal });
    } catch (err) {
      lastError = err;
      logs.server.warn('auth', 'google-tokeninfo', {
        error: err,
        kind: failureKind(err),
        attempt,
        attempts: TOKENINFO_MAX_ATTEMPTS,
      });
    } finally {
      clearTimeout(timer);
    }
    if (attempt < TOKENINFO_MAX_ATTEMPTS) await wait(TOKENINFO_RETRY_DELAY_MS);
  }
  logs.server.error('auth', 'google-tokeninfo', {
    error: lastError,
    kind: failureKind(lastError),
    attempts: TOKENINFO_MAX_ATTEMPTS,
  });
  throw new GraphQLError('Could not reach Google to verify your sign-in. Please try again.', {
    extensions: { code: 'UPSTREAM_UNAVAILABLE' },
    originalError: lastError instanceof Error ? lastError : undefined,
  });
}

/**
 * Verify a Google ID token by calling Google's tokeninfo endpoint.
 * Avoids adding `google-auth-library` as a runtime dep — the endpoint
 * is officially supported and returns the same payload.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenInfo> {
  if (!idToken) {
    throw new GraphQLError('Google id_token is required', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const expectedClientId = await getRuntimeEnvValue('GOOGLE_CLIENT_ID');
  if (!expectedClientId) {
    throw new GraphQLError('Google sign-in is not configured on the server', {
      extensions: { code: 'NOT_CONFIGURED' },
    });
  }

  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
  const res = await fetchGoogleTokenInfo(url);
  if (!res.ok) {
    throw new GraphQLError('Invalid Google credential', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  const info = (await res.json()) as GoogleTokenInfo;

  if (info.aud !== expectedClientId) {
    throw new GraphQLError('Google credential audience mismatch', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  const verified =
    info.email_verified === true || String(info.email_verified).toLowerCase() === 'true';
  if (!info.email || !verified) {
    throw new GraphQLError('Google account email is not verified', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
  return info;
}
