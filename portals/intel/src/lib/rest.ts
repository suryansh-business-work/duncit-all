import { appConfig } from '../config/app-config';
import { graphqlUrl } from '../runtime';

/**
 * The plain-HTTP half of the API (binary bodies): uploads with progress, the
 * private file download, and voice transcription. Same bearer token as GraphQL.
 */

export const apiBase = (): string => graphqlUrl.replace(/\/graphql\/?$/, '');

const token = (): string => {
  try {
    return localStorage.getItem(appConfig.tokenKey) ?? '';
  } catch {
    return '';
  }
};

export class RestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'RestError';
  }
}

async function errorOf(res: Response): Promise<RestError> {
  const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  return new RestError(body.message ?? body.error ?? `HTTP ${res.status}`, res.status);
}

/** Uploads one file; `onProgress` gets 0–100. Resolves with the stored file, rejects with the server's message. */
export function uploadFile<T>(file: File, opts: { folder: string; visibility: string }, onProgress: (pct: number) => void): { promise: Promise<T>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<T>((resolve, reject) => {
    const qs = new URLSearchParams({ folder: opts.folder, visibility: opts.visibility });
    xhr.open('POST', `${apiBase()}/intel/media/upload?${qs.toString()}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token()}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: { error?: string } & Record<string, unknown> = {};
      try {
        body = JSON.parse(xhr.responseText || '{}');
      } catch {
        body = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as T);
      else reject(new RestError(body.error ?? `HTTP ${xhr.status}`, xhr.status));
    };
    xhr.onerror = () => reject(new RestError('Network error', 0));
    xhr.onabort = () => reject(new RestError('Cancelled', 0));
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
  return { promise, abort: () => xhr.abort() };
}

/** The file's bytes as an object URL (for previews and downloads); the caller revokes it. */
export async function fileObjectUrl(id: string): Promise<string> {
  const res = await fetch(`${apiBase()}/intel/media/${encodeURIComponent(id)}/file`, { headers: { Authorization: `Bearer ${token()}` } });
  if (!res.ok) throw await errorOf(res);
  return URL.createObjectURL(await res.blob());
}

export async function transcribeAudio(audio: Blob): Promise<string> {
  const res = await fetch(`${apiBase()}/intel/transcribe`, { method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': audio.type || 'audio/webm' }, body: audio });
  if (!res.ok) throw await errorOf(res);
  const body = (await res.json()) as { text?: string };
  return body.text ?? '';
}

export const authToken = token;
