/**
 * Reading ImageKit file references out of stored text, and pointing them at a
 * new path without disturbing anything around them.
 *
 * A stored value is not always a bare URL. It can carry a transformation
 * segment (`/tr:w-400/`), a query (`?tr=w-400`, `?updatedAt=…`), a video
 * thumbnail suffix (`/ik-thumbnail.jpg`), or sit inside a longer string — a
 * CMS block's HTML, a markdown description. Only the file path is ours to
 * change; every one of those decorations has to survive the rewrite, or a
 * resized thumbnail quietly turns back into the full-size original.
 */

const escapeRegExp = (text: string): string => text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/**
 * A character that can sit inside a stored file URL — anything but whitespace,
 * quotes, brackets, a query, a hash or a comma. Uploaded names never hold a
 * comma (they are reduced to letters, digits, `_`, `.` and `-`), while lists
 * are often stored comma-joined, so a comma always ends one URL.
 */
const URL_END = String.raw`[^\s"'<>()?#,\\]`;

/** ImageKit's derived-asset suffixes, which follow the file rather than being it. */
const DERIVED_SUFFIX = /\/ik-[a-z]+\.[a-z0-9]+$/i;

/** The path without the `/tr:…` transformation segments that can lead it. */
function stripTransforms(path: string): string {
  let rest = path;
  while (rest.startsWith('/tr:')) {
    const next = rest.indexOf('/', 1);
    if (next < 0) return '';
    rest = rest.slice(next);
  }
  return rest;
}

/** The endpoint as a URL prefix, without a trailing slash. */
export function normalizeEndpoint(endpoint: string): string {
  let base = endpoint.trim();
  while (base.endsWith('/')) base = base.slice(0, -1);
  return base;
}

/**
 * Every distinct ImageKit file path referenced in `text` — URL-encoded, exactly
 * as it appears, so it can be matched again later. Empty when the endpoint is
 * unknown or nothing in the text points at it.
 */
export function imagekitPathsIn(text: string, endpoint: string): string[] {
  const base = normalizeEndpoint(endpoint);
  if (!base || !text.includes(base)) return [];
  const found = new Set<string>();
  const pattern = new RegExp(`${escapeRegExp(base)}(/${URL_END}*)`, 'g');
  for (const match of text.matchAll(pattern)) {
    const path = stripTransforms(match[1]).replace(DERIVED_SUFFIX, '');
    // A bare endpoint, or one followed only by a folder, is not a file.
    if (/\/[^/]+\.[A-Za-z0-9]{2,5}$/.test(path)) found.add(path);
  }
  return [...found];
}

/** The decoded path ImageKit's management API expects, e.g. `/pods/cover 1.jpg`. */
export function decodePath(encodedPath: string): string {
  try {
    return decodeURIComponent(encodedPath);
  } catch {
    return encodedPath;
  }
}

/** The file's own name, still URL-encoded. */
export const encodedBaseName = (encodedPath: string): string => encodedPath.slice(encodedPath.lastIndexOf('/') + 1);

/**
 * `text` with every reference to `fromPath` (behind `endpoint`, with or without
 * a transformation segment) pointed at `toPath`. Anything that only starts the
 * same way — `/a.jpg` inside `/a.jpg.bak` — is left alone.
 */
export function replaceImagekitPath(text: string, endpoint: string, fromPath: string, toPath: string): string {
  const base = escapeRegExp(normalizeEndpoint(endpoint));
  const pattern = new RegExp(`(${base}(?:/tr:[^/]+)*)${escapeRegExp(fromPath)}(?=$|[^A-Za-z0-9_.%-])`, 'g');
  return text.replace(pattern, (_whole, prefix: string) => `${prefix}${toPath}`);
}
