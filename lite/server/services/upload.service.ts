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

export function isImageMime(mime: string): boolean {
  return IMAGE_MIME.test(mime);
}

/**
 * The one call that puts a file on ImageKit: the server uploads over Basic
 * auth with the private key, so the browser never holds a credential and there
 * is no signature to get wrong.
 */
export async function uploadImage(bytes: Buffer, fileName: string, privateKeyOverride?: string): Promise<UploadResult> {
  const config = await envEntryService.activeConfig('IMAGEKIT');
  const privateKey = privateKeyOverride ?? readString(config, 'private_key');
  if (!privateKey) throw configError('Image uploads are not configured yet (Console → Environment → ImageKit).');
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)]), fileName);
  form.append('fileName', fileName);
  form.append('useUniqueFileName', 'true');
  form.append('folder', readString(config, 'folder') || '/lite');
  const auth = `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`;
  const res = await fetch(IMAGEKIT_UPLOAD_URL, { method: 'POST', headers: { Authorization: auth }, body: form });
  const json = (await res.json().catch(() => ({}))) as { url?: string; fileId?: string; message?: string };
  if (!res.ok || !json.url) throw upstreamError(`ImageKit upload failed: ${json.message ?? res.statusText}`);
  return { url: json.url, fileId: json.fileId ?? '' };
}

/** Prove an ImageKit key without uploading anything. */
export async function probeImagekit(privateKey: string): Promise<{ ok: boolean; message: string }> {
  if (!privateKey) return { ok: false, message: 'Private key is required' };
  const auth = `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`;
  const res = await fetch('https://api.imagekit.io/v1/files?limit=1', { headers: { Authorization: auth } });
  return res.ok ? { ok: true, message: 'ImageKit credentials are valid' } : { ok: false, message: `ImageKit rejected the key (HTTP ${res.status})` };
}
