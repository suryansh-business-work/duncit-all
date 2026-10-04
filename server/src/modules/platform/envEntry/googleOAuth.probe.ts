import { cleanGoogleClientId } from '@modules/access/auth/google-client-id';

/**
 * Tech › Environment › Google OAuth › Test connection.
 *
 * Opens Google's authorize step exactly as each app does — same client, same
 * redirect, PKCE code flow — and reads where Google sends the browser. Google
 * either moves on to its sign-in page (the client and redirect are accepted) or
 * to an error page whose `authError` names the problem: `invalid_client` for a
 * client that does not exist (or was saved with `https://`), `invalid_request`
 * for an Android client whose "Enable custom URI scheme" is off. Nobody signs
 * in and no code is ever issued, so nothing is spent or created.
 *
 * Client ids are public (every app ships them), but the messages still name the
 * client by its role, not its id.
 */

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TIMEOUT_MS = 12_000;
// RFC 7636's example challenge: the flow never reaches a code, so any value does.
const PROBE_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
// A redirect no client registers — for the web client, whose real ones are https
// origins. Google judges the client before the redirect, so a mismatch proves it exists.
const UNREGISTERED_REDIRECT = 'https://probe.invalid/oauth';

export interface GoogleOAuthCheckResult {
  ok: boolean;
  message: string;
  details: string[];
}

interface GoogleRefusal {
  error: string;
  description: string;
}

/** One varint-length string field of Google's `authError` (a small protobuf). */
function readField(bytes: Buffer, at: number): { value: string; next: number } | null {
  let len = 0;
  let shift = 0;
  let i = at + 1;
  while (i < bytes.length) {
    const b = bytes[i++];
    len |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) break;
    shift += 7;
  }
  if (i + len > bytes.length) return null;
  return { value: bytes.subarray(i, i + len).toString('utf8'), next: i + len };
}

/** `authError` → the OAuth error and Google's sentence for it. */
export function decodeAuthError(encoded: string): GoogleRefusal {
  const bytes = Buffer.from(encoded.replaceAll('-', '+').replaceAll('_', '/'), 'base64');
  const first = readField(bytes, 0);
  const second = first ? readField(bytes, first.next) : null;
  return { error: first?.value ?? 'unknown', description: second?.value ?? '' };
}

/** Where Google sends the browser for this client + redirect: null when it accepts both. */
async function googleAnswer(clientId: string, redirectUri: string): Promise<GoogleRefusal | null> {
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    code_challenge: PROBE_CHALLENGE,
    code_challenge_method: 'S256',
  }).toString();
  const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) });
  const location = res.headers.get('location') ?? '';
  if (!location.includes('/signin/oauth/error')) return null;
  const encoded = new URL(location).searchParams.get('authError');
  return encoded ? decodeAuthError(encoded) : { error: 'unknown', description: '' };
}

interface ClientToCheck {
  role: string;
  raw: string;
  /** The app id whose `<id>:/oauthredirect` the client must accept; '' checks existence only. */
  appId: string;
  appIdLabel: string;
}

/** One client's line, and whether it passed. */
async function checkClient(c: ClientToCheck): Promise<{ ok: boolean; line: string }> {
  const id = cleanGoogleClientId(c.raw);
  const pasted = id === c.raw.trim() ? '' : ' Saved with https:// or a trailing slash — the server strips it, but fix the value.';
  const redirect = c.appId ? `${c.appId.trim()}:/oauthredirect` : UNREGISTERED_REDIRECT;
  const refusal = await googleAnswer(id, redirect);
  if (!refusal) return { ok: true, line: `${c.role}: accepted, redirect ${redirect}.${pasted}` };
  if (refusal.error === 'invalid_client' || refusal.error === 'deleted_client') {
    return { ok: false, line: `${c.role}: Google has no such client (${refusal.error}). Copy the Client ID again from Google Cloud › Clients.${pasted}` };
  }
  if (c.appId) return { ok: false, line: `${c.role}: ${refusal.error} — ${refusal.description}${pasted}` };
  // The unregistered redirect was refused AFTER the client was found.
  const note = c.appIdLabel ? ` Add ${c.appIdLabel} to test the app's own redirect.` : '';
  return { ok: true, line: `${c.role}: client found.${note}${pasted}` };
}

export async function googleOAuthConnection(str: (key: string) => string): Promise<GoogleOAuthCheckResult> {
  const clients: ClientToCheck[] = [
    { role: 'Web client', raw: str('client_id'), appId: '', appIdLabel: '' },
    { role: 'Android client', raw: str('android_client_id'), appId: str('android_package'), appIdLabel: 'the Android Package Name' },
    { role: 'iOS client', raw: str('ios_client_id'), appId: str('ios_bundle_id'), appIdLabel: 'the iOS Bundle ID' },
  ].filter((c) => c.raw.trim());
  if (clients.length === 0) return { ok: false, message: 'No OAuth client ID is saved', details: [] };
  const results = await Promise.all(clients.map((c) => checkClient(c)));
  // Each app needs a client of its own type; one id in both fields cannot serve both.
  const shared = cleanGoogleClientId(str('android_client_id')) !== '' &&
    cleanGoogleClientId(str('android_client_id')) === cleanGoogleClientId(str('ios_client_id'));
  if (shared) {
    const bundle = str('ios_bundle_id').trim() || 'the app';
    results.push({ ok: false, line: `The iOS field holds the Android client ID. Create an iOS client for ${bundle} in Google Cloud and paste its ID.` });
  }
  const failed = results.filter((r) => !r.ok).length;
  return {
    ok: failed === 0,
    message: failed === 0 ? `Google accepted all ${results.length} client(s)` : `Google refused ${failed} of ${results.length} check(s)`,
    details: results.map((r) => r.line),
  };
}
