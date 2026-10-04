import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { fetchIdentityUpstream } from './auth.upstream';
import { cleanGoogleClientId } from './google-client-id';
import {
  isE2eGoogleCredential,
  verifyE2eGoogleCredential,
} from '@modules/platform/e2eRun/e2eRun.google';

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
  // The e2e run account's stand-in for Google's popup; refused unless this
  // server is an e2e target (see e2eRun.google.ts).
  if (isE2eGoogleCredential(idToken)) return verifyE2eGoogleCredential(idToken, expectedClientId);

  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
  const res = await fetchIdentityUpstream(url, { event: 'google-tokeninfo', provider: 'Google' });
  if (!res.ok) {
    throw new GraphQLError('Invalid Google credential', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  const info = (await res.json()) as GoogleTokenInfo;

  // The native apps sign in with their own Android / iOS clients (Google
  // refuses an app redirect on a Web client), so their tokens carry that
  // client as the audience. Blank fields are left out, never matched.
  const nativeClientIds = await Promise.all([
    getRuntimeEnvValue('GOOGLE_ANDROID_CLIENT_ID'),
    getRuntimeEnvValue('GOOGLE_IOS_CLIENT_ID'),
  ]);
  const accepted = [expectedClientId, ...nativeClientIds].map((id) => cleanGoogleClientId(id)).filter(Boolean);
  if (!accepted.includes(info.aud)) {
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
