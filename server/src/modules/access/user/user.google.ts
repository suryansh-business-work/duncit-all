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
  const res = await fetch(url);
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
