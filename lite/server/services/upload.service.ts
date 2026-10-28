import { configError, upstreamError } from '../utils/errors';
import { envEntryService, readString } from './envEntry.service';

const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

/** Pictures only: a cover or an avatar. 10 MB is plenty for either. */
export const UPLOAD_MAX_MB = 10;
export const UPLOAD_MAX_BYTES = UPLOAD_MAX_MB * 1024 * 1024;
const IMAGE_MIME = /^image\/(jpeg|png|webp|gif|avif)$/i;

export interface UploadResult {
  url: string;
  fileId: string;
}

interface UploadOptions {
  privateKey?: string;
  /** False keeps the name as given, so the same source always lands on the same file. */
  unique: boolean;
  /** A folder inside the configured one, e.g. `pexels`. */
  subfolder?: string;
}

export function isImageMime(mime: string): boolean {
  return IMAGE_MIME.test(mime);
}

/** ImageKit's Basic auth header: the private key as the user, no password. */
function basicAuth(privateKey: string): string {
  const credentials = Buffer.from(`${privateKey}:`).toString('base64');
  return `Basic ${credentials}`;
}

const folderFor = (base: string, subfolder: string | undefined): string => {
  if (!subfolder) return base;
  return `${base.endsWith('/') ? base.slice(0, -1) : base}/${subfolder}`;
};

/**
 * The one call that puts a file on ImageKit: the server uploads over Basic
 * auth with the private key, so the browser never holds a credential and there
 * is no signature to get wrong. `file` is the bytes, or a public URL ImageKit
 * fetches itself.
 */
async function postToImagekit(file: Blob | string, fileName: string, options: UploadOptions): Promise<UploadResult> {
  const config = await envEntryService.activeConfig('IMAGEKIT');
  const privateKey = options.privateKey ?? readString(config, 'private_key');
  if (!privateKey) throw configError('Image uploads are not configured yet (Console → Environment → ImageKit).');
  const form = new FormData();
  if (typeof file === 'string') form.append('file', file);
  else form.append('file', file, fileName);
  form.append('fileName', fileName);
  form.append('useUniqueFileName', String(options.unique));
  form.append('folder', folderFor(readString(config, 'folder') || '/lite', options.subfolder));
  const auth = basicAuth(privateKey);
  const res = await fetch(IMAGEKIT_UPLOAD_URL, { method: 'POST', headers: { Authorization: auth }, body: form });
  const json = (await res.json().catch(() => ({}))) as { url?: string; fileId?: string; message?: string };
  if (!res.ok || !json.url) throw upstreamError(`ImageKit upload failed: ${json.message ?? res.statusText}`);
  return { url: json.url, fileId: json.fileId ?? '' };
}

/** A picture the browser sent: always a fresh, uniquely named file. */
export function uploadImage(bytes: Buffer, fileName: string, privateKeyOverride?: string): Promise<UploadResult> {
  return postToImagekit(new Blob([new Uint8Array(bytes)]), fileName, { privateKey: privateKeyOverride, unique: true });
}

/**
 * Copy a stock photo to ImageKit by its URL. The name is kept, so choosing the
 * same photo again lands on the same file instead of a duplicate.
 */
export function uploadRemoteImage(url: string, fileName: string, subfolder: string): Promise<UploadResult> {
  return postToImagekit(url, fileName, { unique: false, subfolder });
}

/** Prove an ImageKit key without uploading anything. */
export async function probeImagekit(privateKey: string): Promise<{ ok: boolean; message: string }> {
  if (!privateKey) return { ok: false, message: 'Private key is required' };
  const auth = basicAuth(privateKey);
  const res = await fetch('https://api.imagekit.io/v1/files?limit=1', { headers: { Authorization: auth } });
  return res.ok ? { ok: true, message: 'ImageKit credentials are valid' } : { ok: false, message: `ImageKit rejected the key (HTTP ${res.status})` };
}
