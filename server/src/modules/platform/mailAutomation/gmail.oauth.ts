import { GraphQLError } from 'graphql';
import jwt from 'jsonwebtoken';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { getUrlConfigs } from '@config/url-configs';
import { outboundFetch } from '@utils/outboundFetch';

/**
 * Google's authorization-code flow for a Gmail mailbox.
 *
 * No `googleapis` dependency: the server already talks to Google's tokeninfo
 * endpoint with plain `fetch` for sign-in, and the OAuth + Gmail REST surfaces
 * are the same shape. A 40 MB SDK to POST two forms and GET three URLs is not
 * a trade the Docker image should make.
 *
 * The credentials are the ones already in Tech > Environment Variables >
 * Google OAuth. The same client needs the Gmail scopes below enabled and this
 * redirect URI registered in the Google Cloud console; nothing else is new.
 */

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

/** Read the inbox, send as the mailbox, and learn which mailbox it is.
 * Deliberately NOT gmail.modify — the automation never touches a message's
 * labels or read state, so a mailbox someone is also working by hand looks
 * exactly the same after the poller has been through it. */
export const GMAIL_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
];

const STATE_TTL_SECONDS = 600;
const stateSecret = () => process.env.JWT_SECRET || 'dev-secret';

export interface GoogleOAuthCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** Trailing slashes off, without a regex — `/\/+$/` backtracks super-linearly
 * on a pathological input (S8786) and this runs on operator-supplied config. */
export function trimTrailingSlash(url: string): string {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') end -= 1;
  return url.slice(0, end);
}

/** Where Google sends the browser back. Derived from SERVER_URL rather than
 * configured separately, because a second place to write the host is a second
 * place for it to be wrong. */
export async function gmailRedirectUri(): Promise<string> {
  const { serverUrl } = await getUrlConfigs();
  return `${trimTrailingSlash(serverUrl)}/gmail/oauth/callback`;
}

/** The Google OAuth client, or null when Tech has not configured one yet. */
export async function googleOAuthCredentials(): Promise<GoogleOAuthCredentials | null> {
  const [clientId, clientSecret, redirectUri] = await Promise.all([
    getRuntimeEnvValue('GOOGLE_CLIENT_ID'),
    getRuntimeEnvValue('GOOGLE_CLIENT_SECRET'),
    gmailRedirectUri(),
  ]);
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri };
}

function requireCredentials(creds: GoogleOAuthCredentials | null): GoogleOAuthCredentials {
  if (!creds) {
    throw new GraphQLError(
      'Google OAuth is not configured. Add a Client ID and Client Secret in Environment Variables → Google OAuth.',
      { extensions: { code: 'MAIL_AUTOMATION_NOT_CONFIGURED' } }
    );
  }
  return creds;
}

/**
 * Sign the `state` Google hands back, so the callback can prove the round trip
 * started here and know who started it. Short-lived: a consent screen left
 * open for an hour is not a link anyone should still be able to complete.
 */
export function signOAuthState(userId: string): string {
  return jwt.sign({ uid: userId, purpose: 'gmail_connect' }, stateSecret(), {
    expiresIn: STATE_TTL_SECONDS,
  });
}

/** The signer's user id, or null when the state is forged, stale or foreign. */
export function verifyOAuthState(state: string): string | null {
  try {
    const decoded = jwt.verify(state, stateSecret()) as { uid?: string; purpose?: string };
    if (decoded.purpose !== 'gmail_connect') return null;
    return decoded.uid ?? null;
  } catch {
    return null;
  }
}

/** The consent screen URL. `prompt=consent` + `access_type=offline` are what
 * guarantee a refresh token — without them Google returns one only on the very
 * first authorisation, so re-connecting a mailbox would silently yield an
 * account that dies at the next access-token expiry. */
export async function buildConsentUrl(userId: string, loginHint?: string): Promise<string> {
  const { clientId, redirectUri } = requireCredentials(await googleOAuthCredentials());
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: signOAuthState(userId),
  });
  if (loginHint) params.set('login_hint', loginHint);
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

async function postToken(form: Record<string, string>): Promise<GoogleTokenResponse> {
  // Through outboundFetch so a token refresh that never reaches Google reports
  // why, rather than the bare 'fetch failed' the mailbox row used to record.
  const resp = await outboundFetch('Google', TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
  });
  const json = (await resp.json().catch(() => ({}))) as GoogleTokenResponse & {
    error_description?: string;
    error?: string;
  };
  if (!resp.ok || !json.access_token) {
    const reason = json.error_description || json.error || `HTTP ${resp.status}`;
    throw new Error(`Google token request failed: ${reason}`);
  }
  return json;
}

/** Trade the one-time code for tokens. */
export async function exchangeCode(code: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret, redirectUri } = requireCredentials(
    await googleOAuthCredentials()
  );
  return postToken({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
}

/** A fresh access token for a mailbox we already hold a refresh token for. */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = requireCredentials(await googleOAuthCredentials());
  return postToken({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  });
}

/**
 * The email + subject out of the id_token Google returned.
 *
 * Read, not verified. The token arrived as the body of a direct server-to-
 * server TLS response to a request we authenticated with the client secret —
 * there is no third party in the exchange to have substituted it. (The sign-in
 * path verifies, because there the token comes from a browser.)
 */
export function readIdToken(idToken?: string): { email: string; sub: string } {
  const payload = idToken?.split('.')[1];
  if (!payload) return { email: '', sub: '' };
  try {
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return { email: String(json.email ?? '').toLowerCase(), sub: String(json.sub ?? '') };
  } catch {
    return { email: '', sub: '' };
  }
}
