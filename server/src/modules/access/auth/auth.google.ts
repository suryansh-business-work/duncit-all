import { GraphQLError } from 'graphql';
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

/**
 * Fetch Google's tokeninfo with a hard timeout and a single retry. A raw
 * network failure from `fetch` (DNS / connection / TLS / timeout) otherwise
 * propagates to the client as an opaque "fetch failed" and can hang the login.
 * The request is an idempotent GET, so retrying the transient case is safe; if
 * it still fails we surface a clear, retryable error.
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
    } finally {
      clearTimeout(timer);
    }
  }
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
