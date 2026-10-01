import { createHash } from 'node:crypto';
import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { parseServiceAccount, serviceAccountToken } from '@utils/googleServiceAccount';
import type { ReelAssetKind } from './reel.model';

/**
 * Google Drive, as far as Reel Studio needs it: read a folder, read a file.
 *
 * The server signs in as a SERVICE ACCOUNT (the Google Drive entry in Tech >
 * Environment), so nobody connects a personal Google account and there is no
 * consent screen. A folder is readable when it is shared with that account's
 * email, or with "Anyone with the link" — Drive treats the account like any
 * other signed-in reader. The scope is read-only on purpose: the studio never
 * writes to, moves or deletes anything in someone's Drive.
 *
 * Deliberately no database: the service decides which files a project keeps;
 * this file only talks to Google.
 */

const API = 'https://www.googleapis.com/drive/v3';
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
/** Google's tokens last an hour; ours is thrown away a little before that. */
const TOKEN_TTL_MS = 50 * 60_000;
const TIMEOUT_MS = 30_000;
/** One page is 200 files; a folder past three pages is a library, not a shoot. */
const PAGE_SIZE = 200;
const MAX_PAGES = 3;
/** Wide enough for a card in the picker and for the model to see what a clip is. */
const THUMB_SIZE = 480;

const FILE_FIELDS =
  'id,name,mimeType,size,videoMediaMetadata(width,height,durationMillis),imageMediaMetadata(width,height)';

export type DriveEntryKind = ReelAssetKind | 'FOLDER';

export interface DriveEntry {
  id: string;
  name: string;
  mime_type: string;
  kind: DriveEntryKind;
  size_bytes: number;
  duration_ms: number;
  width: number;
  height: number;
}

export interface DriveFolder {
  id: string;
  name: string;
  entries: DriveEntry[];
  /** True when the folder holds more than the studio lists. */
  truncated: boolean;
}

const configError = (message: string) => new GraphQLError(message, { extensions: { code: 'CONFIG_ERROR' } });
const driveError = (message: string) => new GraphQLError(message, { extensions: { code: 'DRIVE_ERROR' } });

/* --------------------------------- sign-in ------------------------------- */

let cached: { fingerprint: string; token: string; expiresAt: number } | null = null;

async function accountJson(): Promise<string> {
  return (await getRuntimeEnvValue('GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON')).trim();
}

/** The address a folder is shared with, or '' when Drive is not set up. */
export async function driveAccountEmail(): Promise<string> {
  const json = await accountJson();
  if (!json) return '';
  try {
    return parseServiceAccount(json).client_email;
  } catch {
    return '';
  }
}

/**
 * A Drive access token, reused until shortly before Google would expire it.
 * Keyed on the credential itself, so replacing the key in the Tech portal
 * takes effect on the next call rather than an hour later.
 */
export async function driveToken(): Promise<string> {
  const json = await accountJson();
  if (!json) {
    throw configError('Google Drive is not connected. Add a Google Drive entry in Tech portal → Environment.');
  }
  const fingerprint = createHash('sha256').update(json).digest('hex');
  if (cached?.fingerprint === fingerprint && cached.expiresAt > Date.now()) return cached.token;
  let token: string;
  try {
    token = await serviceAccountToken(parseServiceAccount(json), SCOPE);
  } catch (err) {
    throw configError(err instanceof Error ? err.message : String(err));
  }
  cached = { fingerprint, token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return token;
}

/**
 * Prove a key works WITHOUT touching the stored entry: sign in and ask Drive who
 * we are. That one call fails for both mistakes people make — a key that is not
 * a service account, and a project where the Drive API was never enabled.
 */
export async function probeDriveAccount(json: string): Promise<string> {
  const account = parseServiceAccount(json);
  const token = await serviceAccountToken(account, SCOPE);
  const res = await fetch(`${API}/about?fields=user(emailAddress)`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    const reason = data.error?.message ?? 'no reason given';
    throw new Error(`Google Drive refused the request (HTTP ${res.status}): ${reason}`);
  }
  return account.client_email;
}

/* ---------------------------------- reads -------------------------------- */

/** What Drive said when it refused, in words an operator can act on. */
async function refusal(res: Response, what: string): Promise<GraphQLError> {
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  const reason = data.error?.message ?? 'no reason given';
  if (res.status === 404 || res.status === 403) {
    const email = await driveAccountEmail();
    return driveError(
      `Google Drive cannot open ${what}. Share it with ${email} (Viewer), or set it to "Anyone with the link". Google said: ${reason}`
    );
  }
  return driveError(`Google Drive refused the request (HTTP ${res.status}): ${reason}`);
}

async function driveJson(path: string, what: string): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${await driveToken()}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw await refusal(res, what);
  return res.json();
}

function kindOf(mimeType: string): DriveEntryKind | null {
  if (mimeType === FOLDER_MIME) return 'FOLDER';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  return null;
}

/** One Drive file as the studio lists it, or nothing for a kind it cannot use. */
function toEntry(file: any): DriveEntry[] {
  const mime_type = String(file?.mimeType ?? '');
  const kind = kindOf(mime_type);
  if (!kind || !file?.id) return [];
  const media = file.videoMediaMetadata ?? file.imageMediaMetadata ?? {};
  return [
    {
      id: String(file.id),
      name: String(file.name ?? ''),
      mime_type,
      kind,
      size_bytes: Number(file.size) || 0,
      duration_ms: Number(file.videoMediaMetadata?.durationMillis) || 0,
      width: Number(media.width) || 0,
      height: Number(media.height) || 0,
    },
  ];
}

/**
 * The folder id inside whatever was pasted: a `/folders/<id>` link, an
 * `?id=<id>` link, or the bare id. Null when it is none of those.
 */
export function parseDriveFolderId(input: string): string | null {
  const value = input.trim();
  if (/^[\w-]{10,}$/.test(value)) return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!/(^|\.)google\.com$/i.test(url.hostname)) return null;
  const fromPath = /\/folders\/([\w-]{10,})/.exec(url.pathname)?.[1];
  const fromQuery = url.searchParams.get('id') ?? '';
  return fromPath ?? (/^[\w-]{10,}$/.test(fromQuery) ? fromQuery : null);
}

/** One file's facts — what a project records when a clip is added to it. */
export async function driveFile(fileId: string): Promise<DriveEntry | null> {
  const query = new URLSearchParams({ fields: FILE_FIELDS, supportsAllDrives: 'true' });
  const file = await driveJson(`/files/${encodeURIComponent(fileId)}?${query}`, 'that file');
  return toEntry(file)[0] ?? null;
}

/** A folder's videos, pictures, sound files and sub-folders — folders first, then by name. */
export async function driveFolder(folderId: string): Promise<DriveFolder> {
  const self = await driveFile(folderId);
  if (self?.kind !== 'FOLDER') throw driveError('That Google Drive link is not a folder.');
  const entries: DriveEntry[] = [];
  let pageToken = '';
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const query = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: `nextPageToken,files(${FILE_FIELDS})`,
      pageSize: String(PAGE_SIZE),
      orderBy: 'folder,name_natural',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });
    if (pageToken) query.set('pageToken', pageToken);
    const data = await driveJson(`/files?${query}`, 'that folder');
    entries.push(...(Array.isArray(data.files) ? data.files : []).flatMap(toEntry));
    pageToken = String(data.nextPageToken ?? '');
    if (!pageToken) break;
  }
  return { id: self.id, name: self.name, entries, truncated: pageToken !== '' };
}

/**
 * The file's bytes, ranged the way the caller asked. The Response is handed
 * back unread so the route can stream it — a clip is never held in memory.
 * `signal` ends the download when the viewer it is for has gone.
 */
export async function driveContent(fileId: string, range: string, signal: AbortSignal): Promise<Response> {
  const headers: Record<string, string> = { Authorization: `Bearer ${await driveToken()}` };
  if (range) headers.Range = range;
  return fetch(`${API}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`, { headers, signal });
}

/**
 * Drive's own preview frame for a file. The link Drive hands out is short-lived
 * and needs the same credential as the file, which is why a browser cannot use
 * it directly. Null when Drive has not made one (a clip still processing).
 */
export async function driveThumbnail(fileId: string): Promise<Response | null> {
  const query = new URLSearchParams({ fields: 'thumbnailLink', supportsAllDrives: 'true' });
  const file = await driveJson(`/files/${encodeURIComponent(fileId)}?${query}`, 'that file');
  const link = String(file?.thumbnailLink ?? '');
  if (!link) return null;
  const sized = link.replace(/=s\d+$/, `=s${THUMB_SIZE}`);
  const res = await fetch(sized, {
    headers: { Authorization: `Bearer ${await driveToken()}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return res.ok ? res : null;
}
