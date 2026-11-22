import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { getImagekitConfig } from './upload.service';
import { normalizeEndpoint } from './mediaUrl';

/**
 * Opening an ImageKit PRIVATE file (see `isPrivateUploadFolder`).
 *
 * A private file's URL serves nothing on its own; ImageKit only answers it with
 * a signature made from the account's private key and an expiry:
 *
 *   ik-s = HMAC-SHA1(privateKey, <url after the endpoint> + <expiry unix seconds>)
 *
 * which is exactly what ImageKit's own SDKs compute for `signed: true` with
 * `expireSeconds`. The key never leaves the server and every link dies on its
 * own after `expireSeconds`.
 */

const DEFAULT_IMAGEKIT_HOST = 'ik.imagekit.io';

/** The file's path relative to the configured endpoint, or null when it is not one of ours. */
export function pathAfterEndpoint(fileUrl: string, endpoint: string): string | null {
  const base = normalizeEndpoint(endpoint);
  if (!base) return null;
  if (fileUrl.startsWith(`${base}/`)) return fileUrl.slice(base.length + 1).split('?')[0];
  // ImageKit always answers an upload with its default host, while the account
  // may be configured with a custom endpoint: the first segment is then the
  // ImageKit id the custom domain stands for.
  let parsed: URL;
  try {
    parsed = new URL(fileUrl);
  } catch {
    return null;
  }
  if (parsed.hostname !== DEFAULT_IMAGEKIT_HOST) return null;
  const segments = parsed.pathname.split('/').filter(Boolean);
  return segments.length > 1 ? segments.slice(1).join('/') : null;
}

/** Sign one path the way ImageKit verifies it. Pure, for tests. */
export function signPrivatePath(args: { endpoint: string; path: string; privateKey: string; expiresAt: number }): string {
  const base = normalizeEndpoint(args.endpoint);
  const expiry = String(args.expiresAt);
  const signature = crypto.createHmac('sha1', args.privateKey).update(`${args.path}${expiry}`).digest('hex');
  return `${base}/${args.path}?ik-t=${expiry}&ik-s=${signature}`;
}

/** A short-lived signed link to a private file. Throws when ImageKit is not set up or the URL is foreign. */
export async function signedPrivateUrl(fileUrl: string, expireSeconds: number): Promise<{ url: string; expiresAt: Date }> {
  const { privateKey, urlEndpoint } = await getImagekitConfig();
  if (!privateKey || !urlEndpoint) {
    throw new GraphQLError('ImageKit is not configured. Add it in Tech portal → Environment Variables → ImageKit.', {
      extensions: { code: 'CONFIG_ERROR' },
    });
  }
  const path = pathAfterEndpoint(fileUrl, urlEndpoint);
  if (!path) throw new GraphQLError('This file is not stored in the media library', { extensions: { code: 'BAD_USER_INPUT' } });
  const expiresAt = Math.floor(Date.now() / 1000) + expireSeconds;
  return {
    url: signPrivatePath({ endpoint: urlEndpoint, path, privateKey, expiresAt }),
    expiresAt: new Date(expiresAt * 1000),
  };
}
