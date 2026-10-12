import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open, stat, type FileHandle } from 'node:fs/promises';
import { serviceAccountToken, type GoogleServiceAccount } from '@utils/googleServiceAccount';
import { describeFetchFailure, outboundFetch } from '@utils/outboundFetch';

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

const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
export const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
export const UPLOAD_API = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications';

const SERVICE = 'Google Play';

/** Google gets no longer than this per call. The bundle upload has its own budget, per part. */
const TIMEOUT_MS = 120_000;

/**
 * The bundle goes up in parts of this size (Google wants a multiple of 256 KiB).
 * One request carrying the whole AAB lost everything to a single dropped
 * connection, and all it could say was "fetch failed"; a part that drops is
 * asked about and sent again from where Google stopped receiving.
 */
const UPLOAD_PART_BYTES = 8 * 1024 * 1024;
const UPLOAD_PART_TIMEOUT_MS = 5 * 60_000;
/** Failures in a row before the upload gives up. A part that goes through resets the count. */
const UPLOAD_ATTEMPTS = 4;
const UPLOAD_RETRY_WAIT_MS = 2_000;
/** Google's "Resume Incomplete": the part was taken, send the next one. */
const RESUME_INCOMPLETE = 308;

/** The Play tracks the portal can release to. Lower-case is what the API names them. */
export type PlayTrack = 'internal' | 'production';

/** The service account that signs in — the same key file every Google API takes. */
export type PlayServiceAccount = GoogleServiceAccount;

export interface PlayConfig {
  account: PlayServiceAccount;
  packageName: string;
}

export interface PlayBundle {
  versionCode: number;
  sha256: string;
}

/** Google answered, and the answer was no. The status says whether asking again can help. */
class PlayHttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/** What Google said, in one line, without the credential. */
function googleError(status: number, data: any): Error {
  const message = String(data?.error?.message ?? data?.error_description ?? data?.error ?? 'no reason given');
  return new PlayHttpError(status, `Google Play refused the request (HTTP ${status}): ${message}`);
}

/**
 * Why a call failed, in words a person can act on. Node reports every dropped
 * connection as the same "fetch failed" and keeps the reason on `cause`.
 */
const reasonOf = (err: unknown): string =>
  describeFetchFailure(err) ?? (err instanceof Error ? err.message : String(err));

/** Takes one line of a release's step log. Never a credential — the lines are shown in the portal. */
export type StepLog = (line: string) => void;

const noLog: StepLog = () => undefined;

/** Run one step of a release, noting how it went; a failure names the step it happened in. */
async function during<T>(step: string, run: () => Promise<T>, log: StepLog = noLog): Promise<T> {
  const started = Date.now();
  log(`${step}…`);
  try {
    const result = await run();
    log(`${step}: done in ${Date.now() - started} ms`);
    return result;
  } catch (err) {
    log(`${step}: FAILED after ${Date.now() - started} ms — ${reasonOf(err)}`);
    throw new Error(`${reasonOf(err)} (while ${step})`, { cause: err });
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A connect that never landed is tried once more (`outboundFetch`); nothing was delivered, so nothing repeats. */
export async function call(url: string, init: RequestInit): Promise<any> {
  const res = await outboundFetch(SERVICE, url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw googleError(res.status, data);
  return data;
}

/** An hour-long access token for the androidpublisher scope. */
export const playAccessToken = (account: PlayServiceAccount): Promise<string> => serviceAccountToken(account, SCOPE);

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

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

/** Where an upload stands: the next byte Google wants, or the bundle it filed. */
type UploadState = { next: number } | { bundle: PlayBundle };

/** Read Google's answer to a part (or to "how far did you get?"). */
async function uploadState(res: Response): Promise<UploadState> {
  if (res.status === RESUME_INCOMPLETE) {
    // `Range: bytes=0-N` is what Google holds; no header means it holds nothing yet.
    const last = Number(res.headers.get('range')?.split('-')[1]);
    return { next: Number.isFinite(last) ? last + 1 : 0 };
  }
  const data = (await res.json().catch(() => ({}))) as { versionCode?: unknown; sha256?: unknown };
  if (!res.ok) throw googleError(res.status, data);
  return { bundle: { versionCode: Number(data.versionCode), sha256: String(data.sha256 ?? '') } };
}

/** Open a resumable upload; the address it answers with takes the parts and needs no token. */
async function openUpload(token: string, packageName: string, editId: string, size: number): Promise<string> {
  const res = await outboundFetch(SERVICE, `${UPLOAD_API}/${packageName}/edits/${editId}/bundles?uploadType=resumable`, {
    method: 'POST',
    headers: {
      ...auth(token),
      'X-Upload-Content-Type': 'application/octet-stream',
      'X-Upload-Content-Length': String(size),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw googleError(res.status, await res.json().catch(() => ({})));
  const session = res.headers.get('location');
  if (!session) throw new Error('Google Play opened no upload session');
  return session;
}

/** Send the part that starts at `offset`. `redirect: manual` because a 308 here is an answer, not a redirect. */
async function putPart(session: string, file: FileHandle, offset: number, size: number): Promise<UploadState> {
  const part = Buffer.alloc(Math.min(UPLOAD_PART_BYTES, size - offset));
  await file.read(part, 0, part.length, offset);
  const res = await fetch(session, {
    method: 'PUT',
    headers: { 'Content-Range': `bytes ${offset}-${offset + part.length - 1}/${size}` },
    body: part,
    redirect: 'manual',
    signal: AbortSignal.timeout(UPLOAD_PART_TIMEOUT_MS),
  });
  return uploadState(res);
}

/** Ask Google how much of the file it holds, after a part whose fate is unknown. */
async function askUploadState(session: string, size: number): Promise<UploadState> {
  const res = await fetch(session, {
    method: 'PUT',
    headers: { 'Content-Range': `bytes */${size}` },
    redirect: 'manual',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return uploadState(res);
}

/** A dropped connection, a timeout, a 429 or a 5xx may pass; any other answer from Google is final. */
const worthRetrying = (err: unknown) => !(err instanceof PlayHttpError) || err.status === 429 || err.status >= 500;

/**
 * Upload one AAB into the edit, in parts, from disk — one part is in memory at
 * a time. A part that fails is not re-sent blind: Google is asked how far it
 * got, and the upload carries on from there.
 */
export async function uploadBundle(
  token: string,
  packageName: string,
  editId: string,
  path: string,
  log: StepLog = noLog
): Promise<PlayBundle> {
  const { size } = await stat(path);
  if (size === 0) throw new Error('The stored AAB is empty — build it again');
  const megabytes = (size / (1024 * 1024)).toFixed(1);
  const percent = (bytes: number) => Math.floor((bytes / size) * 100);
  log(`bundle is ${megabytes} MB, sent in parts of ${UPLOAD_PART_BYTES / (1024 * 1024)} MB`);
  const session = await openUpload(token, packageName, editId, size);
  const file = await open(path, 'r');
  try {
    let offset = 0;
    let failures = 0;
    let resync = false;
    for (;;) {
      try {
        const state = resync ? await askUploadState(session, size) : await putPart(session, file, offset, size);
        if ('bundle' in state) return state.bundle;
        // Only a part that went through clears the count; an answered question does not.
        if (!resync) failures = 0;
        resync = false;
        offset = state.next;
        log(`Google holds ${percent(offset)}% of the bundle`);
      } catch (err) {
        failures += 1;
        log(`part at ${percent(offset)}% failed (attempt ${failures} of ${UPLOAD_ATTEMPTS}): ${reasonOf(err)}`);
        if (failures >= UPLOAD_ATTEMPTS || !worthRetrying(err)) {
          throw new Error(
            `${reasonOf(err)} (${percent(offset)}% of the bundle was sent, ${failures} attempt(s) failed in a row)`,
            { cause: err }
          );
        }
        resync = true;
        await wait(UPLOAD_RETRY_WAIT_MS * failures);
      }
    }
  } finally {
    await file.close();
  }
}

/** What users read under "What's new" for one language. */
export interface PlayReleaseNote {
  language: string;
  text: string;
}

/** Point a track at one version code as a completed (full) rollout. */
export async function setTrackRelease(
  token: string,
  packageName: string,
  editId: string,
  track: PlayTrack,
  versionCode: number,
  releaseName: string,
  releaseNotes: PlayReleaseNote[] = []
): Promise<void> {
  await call(`${API}/${packageName}/edits/${editId}/tracks/${track}`, {
    method: 'PUT',
    headers: { ...auth(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      track,
      releases: [
        {
          name: releaseName,
          versionCodes: [String(versionCode)],
          status: 'completed',
          ...(releaseNotes.length ? { releaseNotes } : {}),
        },
      ],
    }),
  });
}

/** What a release carries besides the bundle: the listing, and the notes on the track. */
export interface ReleaseExtras {
  /** Runs inside the edit, before the track is pointed at the bundle. */
  applyListing?: (token: string, editId: string) => Promise<void>;
  releaseNotes?: PlayReleaseNote[];
  /** Told each step as it starts, ends or fails — what the portal shows as the push's log. */
  onStep?: StepLog;
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
  releaseName: string,
  extras: ReleaseExtras = {}
): Promise<number> {
  const log = extras.onStep ?? noLog;
  const step = <T>(name: string, run: () => Promise<T>) => during(name, run, log);
  const token = await step('signing in to Google', () => playAccessToken(cfg.account));
  const editId = await step('opening a release edit', () => openEdit(token, cfg.packageName));
  try {
    const sha256 = await fileSha256(aabPath);
    const bundles = await step('listing the uploaded bundles', () => listBundles(token, cfg.packageName, editId));
    const known = bundles.find((b) => b.sha256 === sha256);
    if (known) log(`Google already holds this bundle as version code ${known.versionCode} — not uploaded again`);
    const bundle =
      known ?? (await step('uploading the bundle', () => uploadBundle(token, cfg.packageName, editId, aabPath, log)));
    if (extras.applyListing) await step('updating the store listing', async () => extras.applyListing?.(token, editId));
    await step('setting the track', () =>
      setTrackRelease(
        token,
        cfg.packageName,
        editId,
        track,
        bundle.versionCode,
        releaseName,
        extras.releaseNotes ?? []
      )
    );
    await step('committing the release', () => commitEdit(token, cfg.packageName, editId));
    return bundle.versionCode;
  } catch (err) {
    await discardEdit(token, cfg.packageName, editId);
    throw err;
  }
}
