import { SERVER_ENV } from '@observability/log';

/**
 * Where a file belongs in the ImageKit library — the one definition both the
 * upload path (new files) and the media organizer (existing files) use, so a
 * file uploaded today and one re-homed tomorrow land in the same folder.
 *
 *   /{env}/{bucket}/{owner id}/{kind}/file.jpg
 *   /production/pods/66f1…/media/cover_x7Yk.jpg
 *   /production/users/65aa…/avatar/me_Qp2.jpg
 *
 * Folders are named by id, never by a pod or club name: a name changes, two
 * pods share one, and renaming a folder in ImageKit changes every URL inside
 * it. The environment leads so staging and production can never mix, even on
 * one ImageKit account.
 *
 * Every segment is letters, digits and underscores only. ImageKit's folder
 * API rewrites anything else to `_`, and a folder the upload API created as
 * `product-reviews` would then be a different folder from the one the copy
 * API created as `product_reviews`.
 */

const SEGMENT = /^[A-Za-z0-9_]{1,64}$/;

/** A path segment, or null when the value cannot safely be one. */
export function folderSegment(value: unknown): string | null {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  if (SEGMENT.test(text)) return text;
  const cleaned = text.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 64);
  return /[A-Za-z0-9]/.test(cleaned) ? cleaned : null;
}

/** The root every new file lives under — `/production`, `/staging` or `/localhost`. */
export const mediaRoot = (): string => `/${SERVER_ENV}`;

/** The folder an owner's files live in, e.g. `/production/pods/66f1…`. */
export function ownerFolder(bucket: string, ownerId: string): string {
  return `${mediaRoot()}/${bucket}/${ownerId}`;
}

/** The owner's folder plus a kind, e.g. `/production/pods/66f1…/reels`. */
export function entityFolder(bucket: string, ownerId: string, kind: string): string {
  return `${ownerFolder(bucket, ownerId)}/${kind}`;
}
