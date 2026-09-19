import { STORAGE_KEYS } from '../../shared/env';
import { readStored } from '../../shared/storage';

const UPLOAD_URL = '/upload';

/**
 * POST a picture to the API's upload route as the multipart `file` field, with
 * the session token. Answers the hosted URL; throws the API's own message when
 * it refuses (too large, not a picture, signed out).
 */
export async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  const token = readStored(STORAGE_KEYS.token);
  const response = await fetch(UPLOAD_URL, {
    method: 'POST',
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !payload.url) throw new Error(payload.error ?? `Upload failed (${response.status})`);
  return payload.url;
}
