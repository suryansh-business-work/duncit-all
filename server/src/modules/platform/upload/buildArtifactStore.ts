import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getUrlConfigs } from '@config/url-configs';

/**
 * Where CI build artifacts live: a directory on the VPS, served by nginx.
 *
 * They used to go to ImageKit with everything else. ImageKit refuses any upload
 * over 20 MiB — `The file size exceeds 20971520 bytes limit` — which an unsigned
 * IPA slips under and a release APK never will. That is a hard ceiling on the
 * account, not a setting, so artifacts need a store with no ceiling but disk.
 *
 * Only build artifacts move. Avatars, pod media and every other upload stay on
 * ImageKit, where the CDN and the transformations are the entire point.
 */

/**
 * Defaults to `<cwd>/app-builds`, which is `/app/app-builds` in the container —
 * the path the compose file bind-mounts from `/opt/duncit/app-builds`. The same
 * default gives a local dev server a writable folder without configuring one.
 */
const ARTIFACTS_DIR = process.env.APP_BUILDS_DIR || path.join(process.cwd(), 'app-builds');

/** The URL path nginx serves ARTIFACTS_DIR from. Keep the two in step. */
const URL_PREFIX = '/app-builds';

/**
 * Where to write one new artifact: a stored name, and the absolute path for it.
 *
 * The name reaches us from CI as a query parameter, so it is caller-controlled:
 * anything with a separator or a `..` in it has to lose that before it is part
 * of a path. A random prefix keeps two builds of the same version from
 * overwriting each other — and, because the result is a bare basename, the
 * path can be joined without a traversal check having anything to catch.
 */
export function newArtifactDestination(fileName: string): { name: string; path: string } {
  const base = path.basename(fileName).replace(/[^\w.-]/g, '_').slice(-120);
  const name = `${crypto.randomUUID().slice(0, 8)}-${base || 'artifact'}`;
  return { name, path: path.join(path.resolve(ARTIFACTS_DIR), name) };
}

/**
 * Absolute path for a stored artifact, or null if `name` escapes the directory.
 *
 * Re-checked here rather than trusted from safeArtifactName, because delete
 * resolves names that came back out of the database — where a bad one written by
 * an older build would still be sitting.
 */
export function artifactPath(name: string): string | null {
  const resolved = path.resolve(ARTIFACTS_DIR, name);
  const root = path.resolve(ARTIFACTS_DIR);
  return resolved.startsWith(root + path.sep) ? resolved : null;
}

/** Create the directory if it is not there yet. Safe to call repeatedly. */
export async function ensureArtifactsDir(): Promise<void> {
  await fs.promises.mkdir(ARTIFACTS_DIR, { recursive: true });
}

/** The download link stored on the build row and posted to Slack. */
export async function artifactUrl(name: string): Promise<string> {
  const { serverUrl } = await getUrlConfigs();
  return `${serverUrl.replace(/\/$/, '')}${URL_PREFIX}/${encodeURIComponent(name)}`;
}

/**
 * Remove a stored artifact. Missing is success: the row is the record, and a
 * file already gone must not block deleting the row that points at it.
 */
export async function deleteArtifact(name: string): Promise<void> {
  const target = artifactPath(name);
  if (!target) return;
  await fs.promises.unlink(target).catch(() => undefined);
}
