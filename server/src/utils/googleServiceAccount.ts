import jwt from 'jsonwebtoken';

/**
 * Signing in to a Google API as a service account.
 *
 * Two integrations do exactly this and differ only in the scope they ask for:
 * the Play Developer API (store releases) and the Drive API (Reel Studio's
 * footage). The key file is the whole credential in both, so the parsing and
 * the token exchange live here once rather than once per API (rule 34).
 *
 * Deliberately PURE HTTP: no database, no env lookup — the caller decides which
 * env entry the key came from.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
/** Google gets no longer than this to answer the token exchange. */
const TIMEOUT_MS = 30_000;

export interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
}

/** A JSON field as text: a string as it is, anything else as nothing. */
const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** The JSON key file a service account downloads as, reduced to what signs in. */
export function parseServiceAccount(json: string): GoogleServiceAccount {
  let parsed: { client_email?: unknown; private_key?: unknown };
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('The service account key is not valid JSON — paste the whole key file Google downloaded.');
  }
  const client_email = text(parsed.client_email).trim();
  const private_key = text(parsed.private_key).trim();
  if (!client_email || !private_key) {
    throw new Error(
      'The service account key has no client_email or private_key — it is not a service account JSON key.'
    );
  }
  return { client_email, private_key };
}

/**
 * An hour-long access token for one scope: a JWT the service account signs
 * with its own key, exchanged at Google's token endpoint.
 */
export async function serviceAccountToken(account: GoogleServiceAccount, scope: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    { iss: account.client_email, scope, aud: TOKEN_URL, iat: now, exp: now + 3600 },
    account.private_key,
    { algorithm: 'RS256' }
  );
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });
  const res = await fetch(TOKEN_URL, { method: 'POST', body, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: unknown;
    error?: unknown;
    error_description?: unknown;
  };
  if (!res.ok) {
    const reason = text(data.error_description) || text(data.error) || 'no reason given';
    throw new Error(`Google refused the service account sign-in (HTTP ${res.status}): ${reason}`);
  }
  const token = text(data.access_token);
  if (!token) throw new Error('Google answered without an access token.');
  return token;
}
