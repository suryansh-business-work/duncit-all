import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { getImagekitConfig } from './upload.service';

/**
 * ImageKit's Media Management API — the half the browser can never touch.
 *
 * Uploading is already a direct browser call signed by `getImagekitAuth`, but
 * listing, renaming, tagging and deleting all authenticate with the PRIVATE
 * key. So the file manager's every read and write goes through here, and the
 * key stays on the server exactly as it does for uploads.
 */

const API = 'https://api.imagekit.io/v1';
/** ImageKit's own ceiling for one list call. */
const MAX_LIMIT = 1000;

async function authHeader(): Promise<string> {
  const { privateKey } = await getImagekitConfig();
  if (!privateKey) {
    throw new GraphQLError(
      'ImageKit is not configured. Add it in Tech portal → Environment Variables → ImageKit.',
      { extensions: { code: 'CONFIG_ERROR' } }
    );
  }
  const credentials = Buffer.from(`${privateKey}:`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * One call to ImageKit, with its error message carried through.
 *
 * ImageKit answers a bad request with a JSON `message` that names the actual
 * problem ("Your account cannot be authenticated", "File not found"). Replacing
 * that with a status code would throw away the only useful part.
 */
async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: await authHeader(),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = body?.message || res.statusText;
    logs.server.warn('mediaLibrary', 'imagekit', { path, status: res.status, message });
    throw new GraphQLError(`ImageKit: ${message}`, { extensions: { code: 'BAD_GATEWAY' } });
  }
  return body as T;
}

/** One file or folder as the portal renders it. */
export interface MediaItem {
  fileId: string;
  name: string;
  filePath: string;
  url: string;
  thumbnail: string | null;
  type: string;
  fileType: string | null;
  mime: string | null;
  size: number;
  width: number | null;
  height: number | null;
  tags: string[];
  createdAt: string | null;
  updatedAt: string | null;
  versionId: string | null;
}

const toItem = (raw: any): MediaItem => ({
  // A folder has no fileId; its folderId is the stable handle instead.
  fileId: String(raw.fileId ?? raw.folderId ?? ''),
  name: String(raw.name ?? ''),
  filePath: String(raw.filePath ?? ''),
  url: String(raw.url ?? ''),
  thumbnail: raw.thumbnail ?? null,
  type: String(raw.type ?? 'file'),
  fileType: raw.fileType ?? null,
  mime: raw.mime ?? null,
  size: Number(raw.size ?? 0),
  width: raw.width ?? null,
  height: raw.height ?? null,
  tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
  createdAt: raw.createdAt ?? null,
  updatedAt: raw.updatedAt ?? null,
  versionId: raw.versionId ?? null,
});

/**
 * A search box that behaves like a search box.
 *
 * ImageKit's `searchQuery` is an expression language, not a substring — typing
 * `logo` into it is a syntax error. What a person means is "name contains
 * this", so that is what gets built, with the quote escaped so a stray `"` is
 * a search for a quote rather than a broken query.
 *
 * Image-vs-other does NOT belong in here. `type` inside a searchQuery means
 * `file` / `file-version` / `folder`, so `type = "image"` is valid syntax that
 * matches nothing at all — no error, just an empty page. That silence is what
 * made the console agent report "there are no images in the media library"
 * while ImageKit held thousands. Kind is its own query parameter; see `list`.
 */
function searchExpression(search?: string | null): string | undefined {
  const term = search?.trim();
  if (!term) return undefined;
  return `name : "${term.replaceAll('"', String.raw`\"`)}"`;
}

/** ImageKit's own `fileType` values. Anything else means "do not filter". */
const FILE_TYPES = new Set(['image', 'non-image']);

export const mediaLibraryService = {
  /** A page of files, newest first unless asked otherwise. */
  async list(input: {
    search?: string | null;
    path?: string | null;
    fileType?: string | null;
    skip?: number | null;
    limit?: number | null;
    sort?: string | null;
  }): Promise<MediaItem[]> {
    const params = new URLSearchParams();
    params.set('limit', String(Math.min(MAX_LIMIT, Math.max(1, input.limit ?? 40))));
    params.set('skip', String(Math.max(0, input.skip ?? 0)));
    params.set('sort', input.sort || 'DESC_CREATED');
    if (input.path) params.set('path', input.path);
    // Its own parameter, not a searchQuery clause — see searchExpression.
    if (input.fileType && FILE_TYPES.has(input.fileType)) params.set('fileType', input.fileType);
    const query = searchExpression(input.search);
    if (query) params.set('searchQuery', query);
    const raw = await call<any[]>(`/files?${params.toString()}`);
    return (raw ?? []).map(toItem);
  },

  /** Everything ImageKit knows about one file — the details panel. */
  async byId(fileId: string): Promise<MediaItem> {
    return toItem(await call<any>(`/files/${fileId}/details`));
  },

  /**
   * Delete by id, in one call.
   *
   * The bulk endpoint reports which ids it could not delete instead of failing
   * the batch, so a file someone else already removed does not cost the caller
   * the other nineteen.
   */
  async remove(fileIds: string[], actor: { id: string }): Promise<number> {
    if (fileIds.length === 0) return 0;
    logs.server.warn('mediaLibrary', 'delete', { userId: actor.id, count: fileIds.length });
    const result = await call<{ successfullyDeletedFileIds?: string[] }>('/files/batch/deleteByFileIds', {
      method: 'POST',
      body: JSON.stringify({ fileIds }),
    });
    return result?.successfullyDeletedFileIds?.length ?? 0;
  },

  /**
   * Rename in place. `purgeCache` costs an ImageKit purge credit, so it is the
   * caller's decision rather than something done on every rename.
   */
  async rename(fileId: string, newFileName: string, purgeCache: boolean): Promise<MediaItem> {
    const file = await mediaLibraryService.byId(fileId);
    await call('/files/rename', {
      method: 'PUT',
      body: JSON.stringify({ filePath: file.filePath, newFileName, purgeCache }),
    });
    return mediaLibraryService.byId(fileId);
  },

  /** Tags and the focus rectangle a smart crop uses. */
  async update(fileId: string, input: { tags?: string[] | null; customCoordinates?: string | null }) {
    const body: Record<string, unknown> = {};
    if (input.tags) body.tags = input.tags;
    if (input.customCoordinates) body.customCoordinates = input.customCoordinates;
    return toItem(await call<any>(`/files/${fileId}/details`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }));
  },

  /** Drop a URL from ImageKit's CDN cache after replacing what sits behind it. */
  async purge(url: string): Promise<string> {
    const result = await call<{ requestId?: string }>('/files/purge', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
    return result?.requestId ?? '';
  },
};
