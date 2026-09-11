import { createHash } from 'node:crypto';
import { createReadStream, openAsBlob } from 'node:fs';
import jwt from 'jsonwebtoken';

/**
 * The Google Play Developer API, as far as releasing one AAB goes.
 *
 * A release is an EDIT: open one, put a bundle in it, point a track at that
 * bundle's version code, commit. Nothing is live until the commit, so a failure
 * anywhere before it leaves the store exactly as it was. The service account
 * that signs in here is granted on the app in Play Console (Users and
 * permissions → invite the account's email with "Release to production" and
 * the testing-track rights); the whole JSON key file it came with is the
 * credential, stored on the GOOGLE_PLAY env entry.
 *
 * Deliberately PURE HTTP: no database, no models — the app-build service owns
 * the row, the env connection test proves the key, and both call in here.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
const UPLOAD_API = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications';

/** Google gets no longer than this per call. The bundle upload is the long one. */
const TIMEOUT_MS = 120_000;

/** The Play tracks the portal can release to. Lower-case is what the API names them. */
export type PlayTrack = 'internal' | 'production';

export interface PlayServiceAccount {
  client_email: string;
  private_key: string;
}

export interface PlayConfig {
  account: PlayServiceAccount;
  packageName: string;
}

export interface PlayBundle {
  versionCode: number;
  sha256: string;
}

/** The JSON key file a service account downloads as, reduced to what signs in. */
export function parseServiceAccount(json: string): PlayServiceAccount {
  let parsed: { client_email?: unknown; private_key?: unknown };
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('The service account key is not valid JSON — paste the whole key file Google downloaded.');
  }
  const client_email = String(parsed.client_email ?? '').trim();
  const private_key = String(parsed.private_key ?? '').trim();
  if (!client_email || !private_key) {
    throw new Error(
      'The service account key has no client_email or private_key — it is not a service account JSON key.'
    );
  }
  return { client_email, private_key };
}

/** What Google said, in one line, without the credential. */
function googleError(status: number, data: any): Error {
  const message = String(data?.error?.message ?? data?.error_description ?? data?.error ?? 'no reason given');
  return new Error(`Google Play refused the request (HTTP ${status}): ${message}`);
}

async function call(url: string, init: RequestInit): Promise<any> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw googleError(res.status, data);
  return data;
}

/**
 * An hour-long access token for the androidpublisher scope: a JWT the service
 * account signs with its own key, exchanged at Google's token endpoint.
 */
export async function playAccessToken(account: PlayServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    { iss: account.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 },
    account.private_key,
    { algorithm: 'RS256' }
  );
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });
  const data = await call(TOKEN_URL, { method: 'POST', body });
  const token = String(data.access_token ?? '');
  if (!token) throw new Error('Google answered without an access token.');
  return token;
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Open an edit: the transaction every change to the store happens inside. */
export async function openEdit(token: string, packageName: string): Promise<string> {
  const data = await call(`${API}/${packageName}/edits`, { method: 'POST', headers: auth(token) });
  return String(data.id);
}

/** Throw the edit away. Best-effort — an abandoned edit expires on its own. */
export async function discardEdit(token: string, packageName: string, editId: string): Promise<void> {
  await call(`${API}/${packageName}/edits/${editId}`, { method: 'DELETE', headers: auth(token) }).catch(
    () => undefined
  );
}

/** Every bundle the app has ever uploaded, with the hash that identifies it. */
export async function listBundles(token: string, packageName: string, editId: string): Promise<PlayBundle[]> {
  const data = await call(`${API}/${packageName}/edits/${editId}/bundles`, { headers: auth(token) });
  const bundles = Array.isArray(data.bundles) ? data.bundles : [];
  return bundles.map((b: any) => ({ versionCode: Number(b.versionCode), sha256: String(b.sha256 ?? '') }));
}

/** SHA-256 of a file on disk, streamed — an AAB is tens of megabytes. */
export function fileSha256(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(path)
      .on('error', reject)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')));
  });
}

/** Upload one AAB into the edit. Streams from disk; nothing is held in memory. */
export async function uploadBundle(
  token: string,
  packageName: string,
  editId: string,
  path: string
): Promise<PlayBundle> {
  const data = await call(`${UPLOAD_API}/${packageName}/edits/${editId}/bundles?uploadType=media`, {
    method: 'POST',
    headers: { ...auth(token), 'Content-Type': 'application/octet-stream' },
    body: await openAsBlob(path),
  });
  return { versionCode: Number(data.versionCode), sha256: String(data.sha256 ?? '') };
}

/** Point a track at one version code as a completed (full) rollout. */
export async function setTrackRelease(
  token: string,
  packageName: string,
  editId: string,
  track: PlayTrack,
  versionCode: number,
  releaseName: string
): Promise<void> {
  await call(`${API}/${packageName}/edits/${editId}/tracks/${track}`, {
    method: 'PUT',
    headers: { ...auth(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      track,
      releases: [{ name: releaseName, versionCodes: [String(versionCode)], status: 'completed' }],
    }),
  });
}

/** Make the edit real. Everything before this was a draft Google had not applied. */
export async function commitEdit(token: string, packageName: string, editId: string): Promise<void> {
  await call(`${API}/${packageName}/edits/${editId}:commit`, { method: 'POST', headers: auth(token) });
}

/**
 * Release one AAB to one track, end to end. Returns the version code Google
 * filed it under.
 *
 * The upload is skipped when Google already holds this exact file — matched by
 * SHA-256, so a build that went to internal testing at build time (or on an
 * earlier press) is promoted to production without being uploaded twice, which
 * Google would refuse as a reused version code.
 */
export async function releaseBundle(
  cfg: PlayConfig,
  aabPath: string,
  track: PlayTrack,
  releaseName: string
): Promise<number> {
  const token = await playAccessToken(cfg.account);
  const editId = await openEdit(token, cfg.packageName);
  try {
    const sha256 = await fileSha256(aabPath);
    const known = (await listBundles(token, cfg.packageName, editId)).find((b) => b.sha256 === sha256);
    const bundle = known ?? (await uploadBundle(token, cfg.packageName, editId, aabPath));
    await setTrackRelease(token, cfg.packageName, editId, track, bundle.versionCode, releaseName);
    await commitEdit(token, cfg.packageName, editId);
    return bundle.versionCode;
  } catch (err) {
    await discardEdit(token, cfg.packageName, editId);
    throw err;
  }
}
