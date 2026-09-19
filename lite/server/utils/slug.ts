import crypto from 'node:crypto';

/** `Sunday Jazz @ Bandra!` -> `sunday-jazz-bandra`. */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replaceAll(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** A short random suffix so two events with the same title get different links. */
export const shortSuffix = (): string => crypto.randomBytes(3).toString('hex');

/**
 * A slug that no other document in the collection uses. Tries the plain slug,
 * then adds a random suffix until one is free.
 */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
  fallback = 'item',
): Promise<string> {
  const root = slugify(base) || fallback;
  if (!(await exists(root))) return root;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = `${root}-${shortSuffix()}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}
